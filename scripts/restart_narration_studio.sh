#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

load_env_file() {
  local file="$1"
  [[ -f "${file}" ]] || return 0
  while IFS='=' read -r key value; do
    key="${key%%[[:space:]]*}"
    [[ -n "${key}" ]] || continue
    [[ "${key}" == \#* ]] && continue
    [[ "${key}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [[ -z "${!key+x}" ]]; then
      value="${value%%#*}"
      value="${value%"${value##*[![:space:]]}"}"
      value="${value#"${value%%[![:space:]]*}"}"
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      export "${key}=${value}"
    fi
  done < "${file}"
}

load_env_file ".env"

tts_port="${NSTUDIO_TTS_PORT:-8810}"
backend_port="${NSTUDIO_BACKEND_PORT:-8080}"
frontend_port="${NSTUDIO_FRONTEND_PORT:-3000}"
gpus="${NSTUDIO_GPUS:-cpu}"
log_dir="${NSTUDIO_LOG_DIR:-reader_outputs/narration-studio}"
model_id="${NARRATION_MODEL_ID:-${VOXCPM_MODEL_ID:-}}"
allow_download="${NSTUDIO_ALLOW_DOWNLOAD:-0}"

mkdir -p "${log_dir}" reader_outputs go-backend/reader_outputs

stop_pid_file() {
  local file="$1"
  if [[ -f "${file}" ]]; then
    local pid
    pid="$(cat "${file}" 2>/dev/null || true)"
    if [[ "${pid}" =~ ^[0-9]+$ ]] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
    fi
  fi
}

stop_matches() {
  local pattern="$1"
  local pids
  pids="$(pgrep -f "${pattern}" 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    while IFS= read -r pid; do
      if [[ "${pid}" =~ ^[0-9]+$ ]]; then
        kill "${pid}" 2>/dev/null || true
      fi
    done <<< "${pids}"
  fi
}

stop_pid_file "${log_dir}/tts.pid"
stop_pid_file "${log_dir}/backend.pid"
stop_pid_file "${log_dir}/frontend.pid"
stop_matches "reader_app.py --port ${tts_port}"
stop_matches "./server"
stop_matches "go run ./cmd/server"
stop_matches "next dev --hostname 0.0.0.0"
sleep 2

tts_args=(reader_app.py --port "${tts_port}" --gpus "${gpus}")
if [[ -n "${model_id}" ]]; then
  tts_args+=(--model-id "${model_id}")
fi
if [[ "${allow_download}" =~ ^(1|true|yes)$ ]]; then
  tts_args+=(--allow-download)
fi

nohup .venv/bin/python "${tts_args[@]}" >"${log_dir}/tts-8810.log" 2>&1 < /dev/null &
echo $! > "${log_dir}/tts.pid"

(
  cd go-backend
  nohup env PORT="${backend_port}" FASTAPI_TTS_URL="http://127.0.0.1:${tts_port}" ./server >"../${log_dir}/backend-8080.log" 2>&1 < /dev/null &
  echo $! > "../${log_dir}/backend.pid"
)

(
  cd narration-studio-web
  nohup env PORT="${frontend_port}" BACKEND_API_URL="http://127.0.0.1:${backend_port}" NEXT_PUBLIC_API_URL="http://127.0.0.1:${backend_port}" npm run dev >"../${log_dir}/frontend-3000.log" 2>&1 < /dev/null &
  echo $! > "../${log_dir}/frontend.pid"
)

sleep 3

echo "FastAPI TTS: http://127.0.0.1:${tts_port} PID $(cat "${log_dir}/tts.pid")"
echo "Go backend:  http://127.0.0.1:${backend_port} PID $(cat "${log_dir}/backend.pid")"
echo "Frontend:    http://127.0.0.1:${frontend_port} PID $(cat "${log_dir}/frontend.pid")"
echo "Logs:"
echo "  ${log_dir}/tts-8810.log"
echo "  ${log_dir}/backend-8080.log"
echo "  ${log_dir}/frontend-3000.log"
