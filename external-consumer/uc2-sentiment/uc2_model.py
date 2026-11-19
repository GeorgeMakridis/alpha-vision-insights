"""Load a downloaded UC2 sentiment model with the native BCPNN library and predict.

The model is loaded and evaluated by ``BcpnnSimSenti``, the same BCPNNSim2.1
CUDA/C++ extension the federation trains with (``initialize`` ->
``load_model`` -> ``infer_offline``); the output-layer activations are read
back with ``get_pop_field_flt("ACT", "outpop")``. Only text preprocessing is
done in Python:

1. Tokenize: lowercase; words (``a-z`` with at most one inner apostrophe),
   numbers (``12`` / ``1.5``) and the symbols ``- % $ + £ ¥ €``; keep the first
   256 tokens; map to vocabulary ids (unknown -> ``[UNK]``); collapse runs of
   the same id.
2. Features: the selected unigram ids and adjacent-id bigrams present in the
   text become active binary input hypercolumns, written as a sparse pattern
   file that the native ``SparsePatternFactory`` reads.

Runtime requirements of the extension: CPython 3.9, an NVIDIA GPU with a CUDA 13
driver, and a C++ runtime new enough for the build (see README).
"""
from __future__ import annotations

import contextlib
import ctypes
import importlib
import json
import os
import re
import struct
import sys
import tempfile
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence

import numpy as np

LABELS = ["Negative", "Neutral", "Positive"]
TOKENIZER = {
    "pattern": r"[a-z]+(?:'[a-z]+)?|\d+(?:\.\d+)?|[-%$+£¥€]",
    "lowercase": True,
    "max_tokens": 256,
    "collapse_repeated_ids": True,
    "unk_token": "[UNK]",
}
SPARSE_MAGIC = 0x31445053  # "SPD1": header of the native sparse pattern format
_LIBC = ctypes.CDLL(None)


# --------------------------------------------------------------------- text --
class FeatureEncoder:
    """Raw text -> sorted active input columns, as in the prepared datasets."""

    def __init__(self, schema_path: Path):
        schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
        if schema.get("version") != 1:
            raise ValueError(f"Unsupported feature schema: {schema_path}")
        tok = schema["tokenizer"]
        self.labels: List[str] = schema["labels"]
        self.n_features: int = int(schema["n_features"])
        self.pattern = re.compile(tok["pattern"])
        self.lowercase = bool(tok["lowercase"])
        self.max_tokens = int(tok["max_tokens"])
        self.collapse = bool(tok["collapse_repeated_ids"])
        self.token_to_id: Dict[str, int] = tok["token_to_id"]
        self.unk_id = int(self.token_to_id[tok["unk_token"]])
        self.unigram_col = {int(t): c for c, t in enumerate(schema["unigrams"])}
        offset = len(schema["unigrams"])
        self.bigram_col = {(int(a), int(b)): offset + c for c, (a, b) in enumerate(schema["bigrams"])}

    def tokens(self, text: str) -> List[str]:
        text = text.lower() if self.lowercase else text
        return self.pattern.findall(text)[: self.max_tokens]

    def token_ids(self, text: str) -> List[int]:
        ids: List[int] = []
        for token in self.tokens(text):
            tid = int(self.token_to_id.get(token, self.unk_id))
            if not (self.collapse and ids and ids[-1] == tid):
                ids.append(tid)
        return ids

    def columns(self, text: str) -> List[int]:
        ids = self.token_ids(text)
        cols = {self.unigram_col[t] for t in set(ids) if t in self.unigram_col}
        cols.update(self.bigram_col[p] for p in zip(ids, ids[1:]) if p in self.bigram_col)
        return sorted(cols)


def write_sparse_patterns(path: Path, rows: Sequence[Sequence[int]], width: int) -> None:
    """Write the native sparse pattern file (same format as the prepared ``.spdat``)."""
    offsets = np.zeros(len(rows) + 1, dtype="<i8")
    offsets[1:] = np.cumsum([len(r) for r in rows])
    with open(path, "wb") as stream:
        stream.write(struct.pack("<iiqq", SPARSE_MAGIC, 0, len(rows), width))
        offsets.tofile(stream)
        for row in rows:
            np.asarray(row, dtype="<i4").tofile(stream)


# ------------------------------------------------------------ native runtime --
def load_extension(extension_dir: Optional[Path] = None):
    """Import BcpnnSimSenti from ``extension_dir`` / $BCPNN_SENTIMENT_EXTENSION_DIR."""
    candidates = [extension_dir, os.environ.get("BCPNN_SENTIMENT_EXTENSION_DIR"),
                  os.environ.get("BCPNN_EXTENSION_DIR"), "/opt/bcpnn-runtime"]
    for directory in candidates:
        if directory and Path(directory).is_dir():
            sys.path.insert(0, str(Path(directory).resolve()))
            break
    try:
        sim = importlib.import_module("BcpnnSimSenti")
    except ImportError as exc:
        raise RuntimeError(
            f"Cannot import the native BcpnnSimSenti extension ({exc}). Pass --extension-dir with the "
            "directory holding BcpnnSimSenti.cpython-39-x86_64-linux-gnu.so, use Python 3.9, and if the "
            "error mentions GLIBCXX set LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libstdc++.so.6"
        ) from exc
    for name in ("initialize", "load_model", "infer_offline", "get_pop_field_flt", "SparsePatternFactory"):
        if not hasattr(sim, name):
            raise RuntimeError(f"BcpnnSimSenti is outdated: it lacks {name}; rebuild it")
    return sim


@contextlib.contextmanager
def native_quiet(enabled: bool = True):
    """The native library prints progress with printf; silence fd 1 while it runs."""
    if not enabled:
        yield
        return
    sys.stdout.flush()
    saved = os.dup(1)
    devnull = os.open(os.devnull, os.O_WRONLY)
    try:
        os.dup2(devnull, 1)
        yield
    finally:
        _LIBC.fflush(None)  # drain C stdio buffers into /dev/null, not the terminal
        os.dup2(saved, 1)
        os.close(saved)
        os.close(devnull)


@contextlib.contextmanager
def working_directory(path: Path):
    previous = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(previous)


class NativeSentimentModel:
    """A UC2 model loaded into the native simulator (one per process)."""

    def __init__(self, model_dir: Path, extension_dir: Optional[Path] = None,
                 hidden_noise: Optional[float] = None, quiet: bool = True):
        model_dir = Path(model_dir).resolve()
        if (model_dir / "encrypted_traces.npz").exists():
            raise ValueError("This model was trained with homomorphic encryption; its traces are "
                             "ciphertexts and must be decrypted with the client key first")
        self.model_dir = model_dir
        self.quiet = quiet
        self.sim = load_extension(extension_dir)
        self.params = json.loads((model_dir / "params.json").read_text())
        self.n_inputs = int(self.params["Hx"]) * int(self.params.get("Mx", 1))
        self.n_classes = int(self.params["Hut"]) * int(self.params["Mut"])
        # Native objects allocate on the GPU and write log files to the working
        # directory; keep those in a private scratch directory.
        self._scratch = tempfile.TemporaryDirectory(prefix="uc2-native-")

        param = self.sim.Params()
        for key, value in self.params.items():
            if hasattr(param, key):
                setattr(param, key, value)
        # Same settings as the platform's native worker for evaluation.
        param.updconnint = -1
        param.logenabled = False
        param.trnpat = 1
        param.taup = float(self.params.get("taup", 1.0))
        if hidden_noise is not None:
            param.nampl = float(hidden_noise)
        with working_directory(Path(self._scratch.name)), native_quiet(self.quiet):
            self.sim.initialize(param)
            # Uses the materialized weights when present (final model); for a
            # round checkpoint it derives them from the traces, like load_traces.
            self.sim.load_model(str(model_dir))

    def predict_proba(self, rows: Sequence[Sequence[int]]) -> np.ndarray:
        """rows: active feature columns per text -> (n, Mut) output activations."""
        if not rows:
            return np.zeros((0, self.n_classes), dtype=np.float32)
        scratch = Path(self._scratch.name)
        patterns_path, labels_path = scratch / "inputs.spdat", scratch / "labels.dat"
        write_sparse_patterns(patterns_path, rows, self.n_inputs)
        # infer_offline also scores against labels; supply placeholder one-hots.
        labels = np.zeros((len(rows), self.n_classes), dtype=np.float32)
        labels[:, 0] = 1.0
        labels.tofile(labels_path)

        sim, p = self.sim, self.params
        out = np.zeros((len(rows), self.n_classes), dtype=np.float32)
        with working_directory(scratch), native_quiet(self.quiet):
            patterns = sim.SparsePatternFactory(self.n_inputs, int(p["Hx"]))
            patterns.readpats(str(patterns_path), len(rows))
            patterns.binarizepats()
            patterns.to_gpu()
            label_factory = sim.PatternFactory(self.n_classes, int(p["Hut"]))
            label_factory.readpats(str(labels_path), len(rows))
            label_factory.to_gpu()
            for i in range(len(rows)):
                sim.infer_offline(patterns, label_factory, i, 1, "predict")
                out[i] = sim.get_pop_field_flt("ACT", "outpop")
        return out


class SentimentClassifier:
    """Feature encoder + native model: ``predict(["text", ...])``."""

    def __init__(self, model_dir: Path, schema_path: Path, extension_dir: Optional[Path] = None,
                 hidden_noise: Optional[float] = None, quiet: bool = True):
        self.encoder = FeatureEncoder(schema_path)
        self.model = NativeSentimentModel(model_dir, extension_dir, hidden_noise, quiet)
        if self.encoder.n_features != self.model.n_inputs:
            raise ValueError(f"Feature schema has {self.encoder.n_features} features but the model expects "
                             f"{self.model.n_inputs}; rebuild the schema from the dataset the model was trained on")
        if len(self.encoder.labels) != self.model.n_classes:
            raise ValueError("Label count of the schema and the model differ")

    def predict(self, texts: Iterable[str]) -> List[dict]:
        texts = list(texts)
        rows = [self.encoder.columns(t) for t in texts]
        proba = self.model.predict_proba(rows)
        return [{
            "text": text,
            "label": self.encoder.labels[int(p.argmax())],
            "probabilities": {lbl: float(v) for lbl, v in zip(self.encoder.labels, p)},
            "known_features": len(cols),
        } for text, cols, p in zip(texts, rows, proba)]
