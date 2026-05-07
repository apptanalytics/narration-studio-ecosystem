# Tech Stack

## Frontend

| Area | Library or Tool | Usage |
|---|---|---|
| Framework | Next.js 16 App Router | Pages, layouts, route handlers, server-side API proxy |
| UI runtime | React 19 | Client components and dashboard screens |
| Styling | Tailwind CSS 4 | Global styling and utility classes |
| State | Redux Toolkit, React Redux | Auth state and app-wide state |
| Data fetching | RTK Query | Typed API slices, auth refresh retry, cache invalidation |
| Forms | React Hook Form, Zod, Hookform resolvers | Form state and validation |
| Tables | TanStack React Table | Admin and data tables |
| Icons | lucide-react | UI icons |
| Audio UI | wavesurfer.js | Waveform player components |
| QR codes | qrcode | 2FA setup QR code rendering |
| Notifications | sonner | Toast notifications |
| Theme | next-themes | Light/dark theme support |
| Linting | ESLint 9, eslint-config-next | Frontend lint checks |
| Type checking | TypeScript 5 | Static types |

Main files:

- `narration-studio-web/src/app`: App Router pages and route handlers.
- `narration-studio-web/src/components`: Shared UI, dashboard, docs, audio, and admin components.
- `narration-studio-web/src/store`: Redux store, auth slice, and RTK Query APIs.
- `narration-studio-web/src/lib`: API helpers, types, docs helpers, and server proxy code.

## Go Backend

| Area | Library or Tool | Usage |
|---|---|---|
| HTTP server | Gin | Public JSON API, middleware, routing |
| ORM | GORM | SQLite/PostgreSQL models and migrations |
| Database drivers | `gorm.io/driver/sqlite`, `gorm.io/driver/postgres` | Local SQLite and production PostgreSQL |
| Auth tokens | `github.com/golang-jwt/jwt/v5` | Access and refresh JWTs |
| Password crypto | `golang.org/x/crypto/bcrypt` | Password hashing |
| Redis | `github.com/redis/go-redis/v9` | Queue stream, cache, progress data |
| WebSockets | `github.com/gorilla/websocket` | Live notification updates |
| OAuth | `golang.org/x/oauth2/google` | Google login |
| TOTP | `github.com/pquerna/otp` | Authenticator app 2FA |
| IDs | `github.com/google/uuid` | Job IDs and unique identifiers |

Main files:

- `go-backend/cmd/server/main.go`: process entrypoint.
- `go-backend/internal/routes/routes.go`: API route registration.
- `go-backend/internal/handlers`: request handlers by feature.
- `go-backend/internal/services`: auth, queue, email, notifications, webhooks, audio merging.
- `go-backend/internal/models/models.go`: GORM models.
- `go-backend/internal/database/database.go`: database connection, auto-migration, default plan seeding.
- `go-backend/internal/middleware`: auth, API key, admin, CORS, error recovery.

## Python Speech Service

| Area | Library or Tool | Usage |
|---|---|---|
| HTTP API | FastAPI, Uvicorn | Internal speech API and direct legacy endpoints |
| UI | Gradio | Optional local speech UI |
| ML runtime | PyTorch, torchaudio, torchcodec | Speech model inference |
| Model utilities | transformers, safetensors, huggingface-hub, modelscope | Model loading and weights |
| Audio | soundfile, librosa, ffmpeg | Audio read/write/conversion |
| ASR | FunASR | Reference transcript support |
| Data/training | datasets, pydantic, matplotlib, tqdm | Training and validation helpers |
| Validation/testing | pytest | Python unit tests |

Main files:

- `reader_app.py`: FastAPI speech API used by the Go backend.
- `app.py`: standalone Gradio demo app.
- `lora_ft_webui.py`: LoRA training and inference web UI.
- `src`: speech model package source.
- `src/*/training`: fine-tuning data, config, accelerator, tracker, validation.
- `scripts/train_*_finetune.py`: fine-tuning entrypoint.
- `scripts/test_*_lora_infer.py`: LoRA inference test entrypoint.

## Database and Queue

| Component | Local Default | Production Option |
|---|---|---|
| Database | SQLite at `reader_outputs/auth.db` | PostgreSQL with `DATABASE_DRIVER=postgres` |
| Queue | Redis stream `nstudio:generation_jobs` | Redis |
| Queue fallback | In-memory channel | Not recommended for production |
| Audio storage | Local filesystem | Persistent volume or object storage integration |

## Tooling

| Task | Command |
|---|---|
| Python tests | `pytest` |
| Go tests | `go test ./...` |
| Frontend lint | `npm run lint` |
| Frontend build | `npm run build` |
| Compose validation | `docker compose config` |
