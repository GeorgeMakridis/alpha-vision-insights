# Runtime for the UC2 model consumer: reuses the federation's BCPNN client image,
# which already has CPython 3.9, NumPy, CUDA 13 and the native BcpnnSimSenti
# extension in /opt/bcpnn-runtime (built for the deployment GPUs).
#
#   docker build --build-arg BASE_IMAGE=<registry>/fl-platform-bcpnn-client:<tag> \
#     -t alphavision-uc2-sentiment .
#   # Download a model once:
#   docker run --rm -v "$PWD/models:/consumer/models" alphavision-uc2-sentiment \
#       download_model.py --api-url https://<fl-backend>
#   # Serve HTTP for AlphaVision (needs GPU):
#   docker run --rm --gpus all -p 8092:8092 \
#       -v "$PWD/models:/consumer/models" alphavision-uc2-sentiment \
#       -m uvicorn app:app --host 0.0.0.0 --port 8092
ARG BASE_IMAGE=registry.unparallel.pt/extra-brain/fl-platform-bcpnn-client:uc2-sentiment-v1
FROM ${BASE_IMAGE}

WORKDIR /consumer
COPY uc2_model.py download_model.py predict.py build_feature_schema.py app.py ./
COPY requirements.txt ./
COPY assets ./assets

RUN python3.9 -m pip install --no-cache-dir -r requirements.txt \
    && python3.9 -m pip install --no-cache-dir "fastapi>=0.110" "uvicorn[standard]>=0.27" "pydantic>=2"

ENV BCPNN_SENTIMENT_EXTENSION_DIR=/opt/bcpnn-runtime
ENV UC2_MODELS_DIR=/consumer/models
ENV UC2_NO_HIDDEN_NOISE=true

EXPOSE 8092
ENTRYPOINT ["python3.9"]
CMD ["-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8092"]
