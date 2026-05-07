# Hardware Requirements

The web app, Go backend, Redis, and PostgreSQL are light. The Python speech service is the heavy part.

## CPU-Only Mode

CPU mode is supported for setup, development, API testing, and short speech tests. It is much slower than GPU inference.

Use CPU mode with the local restart script:

```bash
NSTUDIO_GPUS=cpu ./scripts/restart_narration_studio.sh
```

Run only the Python speech service on CPU:

```bash
python reader_app.py --host 127.0.0.1 --port 8810 --gpus cpu --allow-download
```

Run the Khmer local speech script on CPU:

```bash
KHMER_TTS_GPUS=cpu ./scripts/run_khmer_tts_local.sh
```

Docker Compose defaults the speech service to CPU mode:

```bash
docker compose up --build
```

Recommended CPU-only computer:

| Component | Minimum | Recommended |
|---|---:|---:|
| CPU | 8 cores | 12-16 cores |
| RAM | 32 GB | 64 GB |
| Storage | 30 GB free | 80 GB SSD free |
| OS | macOS, Linux, or Windows | Linux or macOS |

CPU-only expectations:

- Good for running the web app, backend, auth, admin, docs, and queue flow.
- Speech generation can be very slow.
- Keep `WORKER_COUNT=1` to `3`, `MAX_GPU_CONCURRENCY=1`, and short input text.
- Do not use CPU-only for production speech generation.

## Apple Silicon

The model package can choose `mps` for some direct model paths, but the production `reader_app.py` worker mode should be treated as CPU or CUDA-first. Use CPU mode for compatibility unless you have verified MPS locally.

```bash
NSTUDIO_GPUS=cpu ./scripts/restart_narration_studio.sh
```

Recommended Apple machine:

| Component | Recommended |
|---|---:|
| Chip | M2 Pro, M3 Pro, M4 Pro, or better |
| Unified memory | 32 GB minimum, 64 GB preferred |
| Storage | 80 GB free |

## NVIDIA GPU Mode

GPU mode is strongly recommended for real speech generation.

Run with one GPU:

```bash
NSTUDIO_GPUS=0 ./scripts/restart_narration_studio.sh
```

Run with two GPUs:

```bash
NSTUDIO_GPUS=0,1 ./scripts/restart_narration_studio.sh
```

Direct Python service:

```bash
python reader_app.py --host 127.0.0.1 --port 8810 --gpus 0 --allow-download
```

Recommended GPU computer:

| Use case | GPU | VRAM | System RAM | Notes |
|---|---|---:|---:|---|
| Development smoke tests | RTX 3060/4060 | 12 GB | 32 GB | Short text, low concurrency |
| Comfortable local generation | RTX 3090/4090/5090 | 24 GB+ | 64 GB | Best single-machine setup |
| Multi-user local server | 2x 24 GB GPUs | 24 GB each | 64-128 GB | Use multiple workers carefully |
| Production | NVIDIA L40S/A100/H100 class | 48 GB+ | 128 GB+ | Add monitoring and durable storage |

Software requirements for NVIDIA:

- NVIDIA driver installed.
- CUDA-capable PyTorch build.
- `nvidia-smi` available on the host.
- For Docker GPU mode on Linux, install NVIDIA Container Toolkit and add a Compose GPU override.

## Suggested Runtime Settings

CPU-only:

```env
NSTUDIO_GPUS=cpu
WORKER_COUNT=1
MAX_GPU_CONCURRENCY=1
MAX_CHARS_PER_CHUNK=500
```

Single GPU:

```env
NSTUDIO_GPUS=0
WORKER_COUNT=3
MAX_GPU_CONCURRENCY=1
MAX_CHARS_PER_CHUNK=1500
```

Two GPUs:

```env
NSTUDIO_GPUS=0,1
WORKER_COUNT=4
MAX_GPU_CONCURRENCY=2
MAX_CHARS_PER_CHUNK=1500
```

## What Can Run Without the Speech Model

These parts can run comfortably without a GPU:

- Frontend UI.
- Go backend.
- PostgreSQL or SQLite.
- Redis.
- Auth, admin, plans, credits, API keys, identity verification, notifications, and docs.
- API flow up to queued jobs.

Actual audio generation is the only part that needs heavy CPU/GPU compute.
