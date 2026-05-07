#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

env_file=".env.khmer-tts.local"
if [[ ! -f "$env_file" ]]; then
  env_file=".env.khmer-tts.local.example"
fi

set -a
source "$env_file"
set +a

exec .venv/bin/python reader_app.py \
  --host 127.0.0.1 \
  --port "${KHMER_TTS_PORT:-8820}" \
  --gpus "${KHMER_TTS_GPUS:-cpu}" \
  --model-id "${NARRATION_MODEL_ID:-${VOXCPM_MODEL_ID:-openbmb/VoxCPM2}}"
