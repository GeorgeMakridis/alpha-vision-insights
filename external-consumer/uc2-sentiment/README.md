# UC2 sentiment: download and use the federated model

A standalone example of an external platform consuming the learned UC2 global
model. It talks to the FL platform only through its HTTP API, and it runs the
model in the **original native BCPNN library** (`BcpnnSimSenti`, the
BCPNNSim2.1 CUDA/C++ extension the federation trains with).

## AlphaVision Insights integration

AlphaVision keeps **FinBERT** as the primary sentiment series. When this service
is up, the price chart adds a **second line** (`sentimentFl` / FL BCPNN).

1. Download a model into `models/` (see below).
2. Start with GPU (NVIDIA + CUDA 13 driver):

```bash
# from repo root
docker compose --profile uc2 build uc2-sentiment
# enable GPU in docker-compose.yml (deploy.resources) then:
UC2_SENTIMENT_URL=http://uc2-sentiment:8092 docker compose --profile uc2 up -d
```

3. Set on the backend (`.env` or compose):

```bash
UC2_SENTIMENT_URL=http://uc2-sentiment:8092   # or http://localhost:8092 from host
UC2_SENTIMENT_ENABLED=true
```

If the service is missing, unhealthy, or has no model, AlphaVision **continues
unchanged** (FinBERT-only). HTTP API for the consumer:

* `GET /health` → `{ available, model_dir, error }`
* `POST /predict` → `{ texts: [...] }` → scores in `[-1, 1]` as `P(Positive) - P(Negative)`

| File | Purpose |
|---|---|
| `download_model.py` | Find the newest UC2 task with a finished model, download the zip, extract it to `models/<task_id>/` (standard library only) |
| `predict.py` | Classify texts as Negative / Neutral / Positive |
| `uc2_model.py` | Text → features in Python; model loading and inference in `BcpnnSimSenti` (importable) |
| `assets/feature_schema.json` | Vocabulary and the 57,783 selected unigram/bigram features (text → model input) |
| `build_feature_schema.py` | Regenerates the schema when the dataset is re-prepared |
| `Dockerfile` | Packages the scripts on top of the federation's BCPNN client image (native runtime included) |

## Requirements

Downloading needs any Python 3.8+ and nothing else. Predicting needs the native
runtime:

* CPython **3.9** with NumPy
* an NVIDIA GPU with a CUDA 13 driver
* `BcpnnSimSenti.cpython-39-x86_64-linux-gnu.so`, built from
  `deployments/native/sentiment` for your GPU architecture (`Makefile.cuda`).
  The platform images carry it in `/opt/bcpnn-runtime`.

The easiest way is the Docker image, which reuses the client image's runtime.
The client and server images build `BcpnnSimSenti` the same way (same sources,
CUDA 13.1 / Ubuntu 22.04 toolchain, Python 3.9.20 and GPU architecture), so the
consumer predicts with the same library the server evaluates with:

```bash
docker build --build-arg BASE_IMAGE=<registry>/fl-platform-bcpnn-client:<tag> -t uc2-consumer .
```

## 1. Download the latest model

```bash
python download_model.py --api-url https://<backend-host>
# Pass a token if the platform sets FL_PLATFORM_MODEL_API_TOKEN:
python download_model.py --api-url https://<backend-host> --token "$TOKEN"
# Pick a specific task, or accept an unfinished model (latest round):
python download_model.py --api-url https://<backend-host> --task-id <id> --allow-partial
```

`FL_PLATFORM_API_URL` and `FL_PLATFORM_MODEL_API_TOKEN` can be set in the
environment instead. The model lands in `models/<task_id>/` with a
`download.json` saying which task, round and Flower run it came from.

## 2. Predict

```bash
python3.9 predict.py --extension-dir /opt/bcpnn-runtime \
    "Shares jumped after the company raised its full-year guidance."
python3.9 predict.py --file headlines.txt --json
python3.9 predict.py --model-dir models/<task_id> "..."   # default: newest download
```

With Docker:

```bash
docker run --rm -v "$PWD/models:/consumer/models" uc2-consumer \
    download_model.py --api-url https://<backend-host>
docker run --rm --gpus all -v "$PWD/models:/consumer/models" uc2-consumer \
    predict.py "Profit warning sends the stock sharply lower."
```

The extension directory can also be given as `BCPNN_SENTIMENT_EXTENSION_DIR`.
If the import fails with a `GLIBCXX` error, the extension needs a newer C++
runtime than your Python loads. `predict.py` preloads
`/usr/lib/x86_64-linux-gnu/libstdc++.so.6` automatically, as the platform does;
set `BCPNN_LIBSTDCXX` to use a different one.

From Python (start the process with that `LD_PRELOAD` if needed):

```python
from uc2_model import SentimentClassifier

clf = SentimentClassifier("models/<task_id>", "assets/feature_schema.json",
                          extension_dir="/opt/bcpnn-runtime")
clf.predict(["Profit warning sends the stock sharply lower."])
# [{'label': 'Negative', 'probabilities': {...}, 'known_features': 9, 'text': ...}]
```

The native library keeps one network per process, so create one classifier
per process.

## How it works

* **Text → features (Python).** The tokenizer replicates the one used to build
  the UC2 dataset: lowercase, word/number/symbol regex, first 256 tokens,
  vocabulary ids with `[UNK]`, repeated ids collapsed. Each selected unigram or
  adjacent bigram present in the text activates one binary input. On all
  24,030 dataset texts it reproduces the prepared training patterns exactly.
  The features are written in the native sparse pattern format (`.spdat`).
* **Model and inference (native).** As in the platform's evaluation worker:
  `Params` are taken from the model's `params.json`, then `initialize`, then
  `load_model(model_dir)`. That uses the materialized weights of a final model,
  or derives them from the traces of a round checkpoint. Then each text goes
  through `infer_offline`, and the output layer's activations are read with
  `get_pop_field_flt("ACT", "outpop")`. These are the probabilities reported.
* **Noise.** The simulator adds small Poisson noise to the hidden layer during
  inference (`nampl=0.01`), as in the platform's evaluation, with a fixed seed.
  `--no-hidden-noise` turns it off.
* **Limits.** Only the default hidden network mode has been tested. Models
  trained with homomorphic encryption (`encrypted_traces.npz`) have to be
  decrypted first.

## The feature schema must match the training data

`assets/feature_schema.json` was built from the current UC2 data preparation
(three-class news sentiment, chi-square selection). If the federation's data is
re-prepared with a different vocabulary or feature selection, rebuild it from
the new files. Otherwise `predict.py` raises an error if the feature count
differs, or gives wrong predictions if only the features themselves changed:

```bash
python build_feature_schema.py \
  --vocab <pySenti>/Data/news_sentiment_word_threeclass_chi2_sentence_activations.vocab.json \
  --feature-map <prepared-data>/patterns_feature_to_col.json
```
