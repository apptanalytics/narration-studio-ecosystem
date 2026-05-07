# Khmer TTS Narration Studio

Khmer TTS Narration Studio is a full-stack app for generating Khmer narration audio, managing users, cloning approved voices, and exposing a local speech API. The project has these services:

```txt
Next.js web app        http://localhost:3000
Go API backend         http://localhost:8080
Python TTS service     http://localhost:8810
Redis queue/cache      redis://localhost:6379
PostgreSQL database    localhost:5432
```

The frontend talks to the Go backend. The Go backend owns auth, API keys, admin workflows, usage logs, notifications, queues, and persistence. The Python service is the internal speech generation engine.

## Clone

```bash
git clone <repository-url>
cd khmer-tts-narration-studio
```

## Requirements

For local development without Docker:

- Python 3.10, 3.11, or 3.12
- Node.js 20 or newer
- Go 1.22 or newer
- Redis 7 or newer, optional but recommended
- PostgreSQL 16 or newer, optional when using local SQLite
- ffmpeg, recommended for audio workflows
- CUDA-capable GPU, optional but strongly recommended for fast generation

For Docker:

- Docker Desktop or Docker Engine with Compose v2
- At least 12 GB memory available to Docker
- NVIDIA container runtime only if you want GPU acceleration in Linux Docker

## Documentation

- [Architecture](./docs/ARCHITECTURE.md): service diagram, runtime flow, storage, deployment notes.
- [Tech stack](./docs/TECH_STACK.md): frontend, Go backend, Python service, database, and tooling libraries.
- [Hardware](./docs/HARDWARE.md): CPU-only mode, GPU mode, and recommended computer specs.
- [API endpoints](./docs/API_ENDPOINTS.md): Go API, admin API, user API, speech API, and internal Python endpoints.
- [Database](./docs/DATABASE.md): SQLite/PostgreSQL setup, schema, plan seeds, and ER diagram.
- [Credit system](./docs/CREDIT_SYSTEM.md): character-based credit rules, reservation, deduction, reset, and admin controls.
- [Code structure](./docs/CODE_STRUCTURE.md): frontend/backend/Python directory map and major code paths.

## One-Command Local Setup

The checked-in `.env.example` defaults to CPU mode so the project can start on machines without an NVIDIA GPU. CPU mode is supported for development and short speech tests:

```bash
NSTUDIO_GPUS=cpu ./scripts/restart_narration_studio.sh
```

GPU mode is recommended for real speech generation:

```bash
NSTUDIO_GPUS=0 ./scripts/restart_narration_studio.sh
```

See [Hardware](./docs/HARDWARE.md) for full CPU/GPU computer specs.

For first-time audio generation, either put a local model under `models/khmer-tts/base_model` and set `NARRATION_MODEL_ID=models/khmer-tts/base_model`, or set `NSTUDIO_ALLOW_DOWNLOAD=1` and `NARRATION_MODEL_ID=<model-id>` in `.env`.

### macOS or Linux

```bash
chmod +x scripts/setup-mac.sh scripts/restart_narration_studio.sh
./scripts/setup-mac.sh
./scripts/restart_narration_studio.sh
```

Open:

- Web app: http://localhost:3000
- Go API health: http://localhost:8080/api/health
- Python service health: http://localhost:8810/api/health

### Windows PowerShell

Run PowerShell from the project root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-windows.ps1
.\scripts\run-local-windows.ps1
```

Open:

- Web app: http://localhost:3000
- Go API health: http://localhost:8080/api/health
- Python service health: http://localhost:8810/api/health

## Docker Setup

Docker runs PostgreSQL, Redis, the Python TTS service, the Go backend, and the Next.js frontend.

### macOS, Linux, or Windows

```bash
docker compose up --build
```

Stop everything:

```bash
docker compose down
```

Optional helper scripts:

```bash
./scripts/setup-docker.sh
```

```powershell
.\scripts\setup-docker.ps1
```

Docker URLs:

- Web app: http://localhost:3000
- Go API: http://localhost:8080
- Python TTS service: http://localhost:8810
- PostgreSQL: `localhost:5432`, database/user/password `nstudio`

The first Docker build and first model load can take a long time because Python ML packages and model files are large.

## Manual Local Setup

Use this section when you want to run each service in its own terminal.

### 1. Python Service

macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
cp .env.khmer-tts.local.example .env.khmer-tts.local
python reader_app.py --host 127.0.0.1 --port 8810 --allow-download
```

Windows PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
Copy-Item .env.khmer-tts.local.example .env.khmer-tts.local -ErrorAction SilentlyContinue
.\.venv\Scripts\python.exe reader_app.py --host 127.0.0.1 --port 8810 --allow-download
```

For an offline or custom model, edit `.env.khmer-tts.local` before starting the service.

### 2. Redis

macOS:

```bash
brew install redis
brew services start redis
```

Windows with Docker:

```powershell
docker run --name khmer-tts-redis -p 6379:6379 -d redis:7-alpine
```

Redis is recommended for queues and progress tracking. The backend can still start without Redis, but queue state will fall back to memory.

### 3. Go Backend

macOS or Linux:

```bash
cd go-backend
cp .env.example .env
go mod download
go build -o server ./cmd/server
FASTAPI_TTS_URL=http://127.0.0.1:8810 ./server
```

Use PostgreSQL instead of SQLite:

```bash
DATABASE_DRIVER=postgres \
DATABASE_DSN="host=localhost user=nstudio password=nstudio dbname=nstudio port=5432 sslmode=disable TimeZone=UTC" \
FASTAPI_TTS_URL=http://127.0.0.1:8810 \
./server
```

Windows PowerShell:

```powershell
cd go-backend
Copy-Item .env.example .env -ErrorAction SilentlyContinue
go mod download
go build -o server.exe ./cmd/server
$env:FASTAPI_TTS_URL = "http://127.0.0.1:8810"
.\server.exe
```

For the first admin account, set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in `go-backend/.env`, start the backend once, then remove those values.

### 4. Next.js Frontend

macOS or Linux:

```bash
cd narration-studio-web
npm install
cat > .env.local <<'EOF'
BACKEND_API_URL=http://127.0.0.1:8080
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
EOF
npm run dev
```

Windows PowerShell:

```powershell
cd narration-studio-web
npm install
@"
BACKEND_API_URL=http://127.0.0.1:8080
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
"@ | Set-Content .env.local
npm run dev
```

## Environment Files

- `.env.example` contains shared local defaults.
- `.env.khmer-tts.local.example` contains local speech-service defaults.
- `go-backend/.env.example` contains backend auth, database, queue, SMTP, Google OAuth, and admin bootstrap settings.
- `narration-studio-web/.env.local` points the frontend to the backend.

Do not commit real secrets, SMTP passwords, OAuth credentials, private model paths, generated databases, or generated audio.

## Testing

Run Python tests:

```bash
source .venv/bin/activate
pytest
```

Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Run Go tests:

```bash
cd go-backend
go test ./...
```

Run frontend checks:

```bash
cd narration-studio-web
npm run lint
npm run build
```

Validate Docker Compose:

```bash
docker compose config
```

## Common Commands

Start all local services after setup:

```bash
./scripts/restart_narration_studio.sh
```

Start only the Khmer local speech service:

```bash
./scripts/run_khmer_tts_local.sh
```

## Troubleshooting

- If the frontend cannot log in or call APIs, check that `NEXT_PUBLIC_API_URL` points to `http://127.0.0.1:8080`.
- If jobs never finish, check Redis and the Python service health endpoint.
- If generation is slow, use a CUDA GPU or reduce worker concurrency.
- If model loading fails offline, edit `.env.khmer-tts.local` and point it to a local model directory.
- If Docker runs out of memory, increase Docker Desktop memory and rebuild.
