"""Build ``assets/feature_schema.json``: the text -> input-feature contract of UC2.

The downloaded model contains only BCPNN traces/weights. Turning raw text into
the model's 57,783 binary input features needs two things fixed at data
preparation time, which every federation client shares:

* the word vocabulary (token -> token id), from ``<dataset>.vocab.json``;
* the chi-square selected unigram/bigram features (token ids -> column),
  from ``patterns_feature_to_col.json`` in the prepared data directory.

Run this once per prepared dataset (re-run if the data is re-prepared):

    python build_feature_schema.py \
        --vocab /path/to/news_sentiment_word_threeclass_chi2_sentence_activations.vocab.json \
        --feature-map /path/to/prepared/data/patterns_feature_to_col.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from uc2_model import LABELS, TOKENIZER

HERE = Path(__file__).resolve().parent


def build(vocab_path: Path, feature_map_path: Path) -> dict:
    vocab = json.loads(vocab_path.read_text(encoding="utf-8"))["token_to_id"]
    raw = feature_map_path.read_bytes()
    mapping = json.loads(raw)
    columns = [None] * int(mapping["n_features"])
    for key, col in mapping["feature_to_col"].items():
        columns[col] = key
    if any(c is None for c in columns):
        raise ValueError("feature_to_col does not cover every column")
    unigrams, bigrams = [], []
    for col, key in enumerate(columns):
        kind, value = key.split(":", 1)
        if kind == "u":
            if bigrams:
                raise ValueError("Expected all unigram columns before bigram columns")
            unigrams.append(int(value))
        elif kind == "b":
            first, second = value.split("_")
            bigrams.append([int(first), int(second)])
        else:
            raise ValueError(f"Unknown feature kind in {key!r}")
    return {
        "version": 1,
        "labels": LABELS,
        "tokenizer": dict(TOKENIZER, token_to_id=vocab),
        "n_features": len(columns),
        "unigrams": unigrams,          # column c      -> token id
        "bigrams": bigrams,            # column U + c  -> [token id, next token id]
        "source_feature_map_sha256": hashlib.sha256(raw).hexdigest(),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--vocab", type=Path, required=True)
    parser.add_argument("--feature-map", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=HERE / "assets" / "feature_schema.json")
    args = parser.parse_args()
    schema = build(args.vocab, args.feature_map)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(schema, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {args.output} ({schema['n_features']} features, "
          f"{len(schema['tokenizer']['token_to_id'])} vocabulary tokens)")


if __name__ == "__main__":
    main()
