"""
HTTP wrapper around the UC2 federated sentiment consumer.

POST /predict  {"texts": ["..."]} -> scores in [-1, 1] (P(pos) - P(neg))
GET  /health   availability of the native BCPNN model

FinBERT / AlphaVision keep working when this service is down or has no GPU/model.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

HERE = Path(__file__).resolve().parent
logger = logging.getLogger("uc2-sentiment")
logging.basicConfig(level=logging.INFO)

# Match predict.py: preload system libstdc++ before importing the CUDA extension.
os.environ.setdefault("BCPNN_LIBSTDCXX", "/usr/lib/x86_64-linux-gnu/libstdc++.so.6")
if Path(os.environ["BCPNN_LIBSTDCXX"]).is_file() and not os.environ.get("UC2_PRELOAD_DONE"):
    preload = os.environ.get("LD_PRELOAD", "")
    lib = os.environ["BCPNN_LIBSTDCXX"]
    if lib not in preload.split(os.pathsep):
        os.environ["LD_PRELOAD"] = lib + (os.pathsep + preload if preload else "")
        os.environ["UC2_PRELOAD_DONE"] = "1"
        os.execve(sys.executable, [sys.executable] + sys.argv, dict(os.environ))


def _latest_model_dir(root: Path) -> Optional[Path]:
    candidates = [p.parent for p in root.glob("*/params.json")]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def _score_from_probs(probabilities: Dict[str, float]) -> float:
    """Map three-class probs to FinBERT-like continuous score in [-1, 1]."""
    pos = float(probabilities.get("Positive", 0.0))
    neg = float(probabilities.get("Negative", 0.0))
    return max(-1.0, min(1.0, pos - neg))


class PredictRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=256)


class PredictItem(BaseModel):
    text: str
    label: str
    score: float
    probabilities: Dict[str, float]
    known_features: int


class PredictResponse(BaseModel):
    results: List[PredictItem]
    model_dir: Optional[str] = None


app = FastAPI(title="UC2 Federated Sentiment", version="1.0.0")
_classifier = None
_model_dir: Optional[Path] = None
_load_error: Optional[str] = None


def _try_load() -> None:
    global _classifier, _model_dir, _load_error
    if _classifier is not None:
        return
    models_root = Path(os.environ.get("UC2_MODELS_DIR", str(HERE / "models")))
    schema = Path(os.environ.get("UC2_SCHEMA_PATH", str(HERE / "assets" / "feature_schema.json")))
    extension = os.environ.get("BCPNN_SENTIMENT_EXTENSION_DIR", "/opt/bcpnn-runtime")
    model_dir = Path(os.environ["UC2_MODEL_DIR"]) if os.environ.get("UC2_MODEL_DIR") else _latest_model_dir(models_root)
    if model_dir is None or not schema.is_file():
        _load_error = (
            f"No UC2 model under {models_root} (run download_model.py) or missing schema {schema}"
        )
        logger.warning(_load_error)
        return
    try:
        from uc2_model import SentimentClassifier

        quiet = os.environ.get("UC2_VERBOSE", "").lower() not in ("1", "true", "yes")
        no_noise = os.environ.get("UC2_NO_HIDDEN_NOISE", "").lower() in ("1", "true", "yes")
        _classifier = SentimentClassifier(
            model_dir,
            schema,
            Path(extension) if extension else None,
            hidden_noise=0.0 if no_noise else None,
            quiet=quiet,
        )
        _model_dir = model_dir
        _load_error = None
        logger.info("Loaded UC2 sentiment model from %s", model_dir)
    except Exception as exc:
        _load_error = str(exc)
        _classifier = None
        logger.exception("Failed to load UC2 sentiment model: %s", exc)


@app.on_event("startup")
def startup() -> None:
    _try_load()


@app.get("/health")
def health() -> Dict[str, Any]:
    available = _classifier is not None
    return {
        "status": "ok" if available else "degraded",
        "available": available,
        "model_dir": str(_model_dir) if _model_dir else None,
        "error": _load_error,
        "provider": "uc2-bcpnn-federated",
    }


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest) -> PredictResponse:
    _try_load()
    if _classifier is None:
        raise HTTPException(
            status_code=503,
            detail=_load_error or "UC2 sentiment model not available",
        )
    texts = [t.strip() for t in body.texts if t and t.strip()]
    if not texts:
        raise HTTPException(status_code=400, detail="No non-empty texts")
    try:
        raw = _classifier.predict(texts)
    except Exception as exc:
        logger.exception("UC2 predict failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    results = [
        PredictItem(
            text=r["text"],
            label=r["label"],
            score=_score_from_probs(r["probabilities"]),
            probabilities=r["probabilities"],
            known_features=int(r["known_features"]),
        )
        for r in raw
    ]
    return PredictResponse(results=results, model_dir=str(_model_dir) if _model_dir else None)
