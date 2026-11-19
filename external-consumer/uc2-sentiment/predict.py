"""Predict sentiment (Negative / Neutral / Positive) with a downloaded UC2 model.

The model runs in the native BCPNN library (BcpnnSimSenti, CUDA).

    python predict.py --model-dir models/<task_id> "Shares surged after record earnings."
    python predict.py --model-dir models/<task_id> --file texts.txt      # one text per line
    echo "Profit warning sends stock lower" | python predict.py --model-dir models/<task_id>

Without ``--model-dir`` the most recently downloaded model under ``models/`` is used.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SYSTEM_LIBSTDCXX = os.environ.get("BCPNN_LIBSTDCXX", "/usr/lib/x86_64-linux-gnu/libstdc++.so.6")


def ensure_cxx_runtime():
    """The CUDA 13 build can need a newer libstdc++ than Conda/venv Pythons load.

    Like the platform's native worker, preload the system runtime; it must be
    set before the process starts, so re-execute once with LD_PRELOAD.
    """
    if os.environ.get("UC2_PRELOAD_DONE") or not Path(SYSTEM_LIBSTDCXX).is_file():
        return
    env = dict(os.environ, UC2_PRELOAD_DONE="1")
    preload = env.get("LD_PRELOAD", "")
    if SYSTEM_LIBSTDCXX not in preload.split(os.pathsep):
        env["LD_PRELOAD"] = SYSTEM_LIBSTDCXX + (os.pathsep + preload if preload else "")
        os.execve(sys.executable, [sys.executable] + sys.argv, env)


def latest_model_dir(root: Path) -> Path:
    candidates = [p.parent for p in root.glob("*/params.json")]
    if not candidates:
        sys.exit(f"error: no downloaded model under {root}; run download_model.py first or pass --model-dir")
    return max(candidates, key=lambda p: p.stat().st_mtime)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("texts", nargs="*", help="Texts to classify")
    parser.add_argument("--model-dir", type=Path, help="Extracted model directory (default: newest in models/)")
    parser.add_argument("--models-root", type=Path, default=Path("models"))
    parser.add_argument("--schema", type=Path, default=HERE / "assets" / "feature_schema.json")
    parser.add_argument("--extension-dir", type=Path,
                        help="Directory with BcpnnSimSenti.cpython-39-*.so "
                             "(default: $BCPNN_SENTIMENT_EXTENSION_DIR or /opt/bcpnn-runtime)")
    parser.add_argument("--no-hidden-noise", action="store_true",
                        help="Disable the simulator's hidden-layer noise (nampl=0) for deterministic output")
    parser.add_argument("--file", type=Path, help="Read texts from a file, one per line")
    parser.add_argument("--json", action="store_true", help="Print JSON lines instead of a table")
    parser.add_argument("--verbose", action="store_true", help="Show the native library's console output")
    args = parser.parse_args()

    texts = list(args.texts)
    if args.file:
        texts += [line.strip() for line in args.file.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not texts and not sys.stdin.isatty():
        texts += [line.strip() for line in sys.stdin if line.strip()]
    if not texts:
        parser.error("give texts as arguments, with --file, or on stdin")

    from uc2_model import SentimentClassifier

    model_dir = args.model_dir or latest_model_dir(args.models_root)
    try:
        classifier = SentimentClassifier(model_dir, args.schema, args.extension_dir,
                                         hidden_noise=0.0 if args.no_hidden_noise else None,
                                         quiet=not args.verbose)
    except (RuntimeError, ValueError, FileNotFoundError) as exc:
        sys.exit(f"error: {exc}")
    print(f"Model: {model_dir}", file=sys.stderr)
    for result in classifier.predict(texts):
        if args.json:
            print(json.dumps(result, ensure_ascii=False))
            continue
        probs = "  ".join(f"{k[:3]}={v:.3f}" for k, v in result["probabilities"].items())
        snippet = result["text"] if len(result["text"]) <= 70 else result["text"][:67] + "..."
        warn = "  (no known features)" if result["known_features"] == 0 else ""
        print(f"{result['label']:<8}  {probs}  | {snippet}{warn}")


if __name__ == "__main__":
    ensure_cxx_runtime()
    main()
