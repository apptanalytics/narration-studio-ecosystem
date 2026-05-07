#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    echo "Install it, then run this script again."
    exit 1
  fi
}

copy_if_missing() {
  local src="$1"
  local dst="$2"
  if [[ ! -f "$dst" ]]; then
    cp "$src" "$dst"
    echo "Created $dst"
  fi
}

need python3
need go
need npm

mkdir -p reader_outputs/audio go-backend/reader_outputs narration-studio-web

copy_if_missing ".env.example" ".env"
copy_if_missing ".env.khmer-tts.local.example" ".env.khmer-tts.local"
copy_if_missing "go-backend/.env.example" "go-backend/.env"

if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"

(
  cd go-backend
  go mod download
  go build -o server ./cmd/server
)

(
  cd narration-studio-web
  npm install
  if [[ ! -f ".env.local" ]]; then
    {
      echo "BACKEND_API_URL=http://127.0.0.1:8080"
      echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8080"
    } > .env.local
    echo "Created narration-studio-web/.env.local"
  fi
)

echo "Setup complete."
echo "Run: ./scripts/restart_narration_studio.sh"
