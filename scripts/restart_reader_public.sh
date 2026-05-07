#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

env_file="${READER_PUBLIC_ENV:-.env.reader-public.local}"
if [[ -f "${env_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${env_file}"
  set +a
fi

backend_port="${READER_BACKEND_PORT:-8810}"
frontend_port="${READER_FRONTEND_PORT:-3000}"
gpus="${READER_GPUS:-0,1,2}"
backend_log="${READER_BACKEND_LOG:-reader_outputs/backend.log}"
frontend_log="${READER_FRONTEND_LOG:-reader_outputs/frontend.log}"

mkdir -p reader_outputs

mapfile -t pids < <(
  pgrep -f "reader_app.py --port ${backend_port}|next start --hostname 0.0.0.0 --port ${frontend_port}|next-server|multiprocessing.spawn" || true
)
if (( ${#pids[@]} > 0 )); then
  kill "${pids[@]}" 2>/dev/null || true
  sleep 2
fi

nohup setsid .venv/bin/python reader_app.py --port "${backend_port}" --gpus "${gpus}" >"${backend_log}" 2>&1 < /dev/null &
backend_pid=$!

(
  cd reader-web
  nohup setsid npm run start >"../${frontend_log}" 2>&1 < /dev/null &
  echo $! > ../reader_outputs/frontend.pid
)

echo "${backend_pid}" > reader_outputs/backend.pid
echo "Backend: http://127.0.0.1:${backend_port} PID ${backend_pid}"
echo "Frontend: http://127.0.0.1:${frontend_port}"
echo "Logs: ${backend_log}, ${frontend_log}"
