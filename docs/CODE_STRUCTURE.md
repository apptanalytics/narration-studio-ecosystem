# Code Structure

## Root

| Path | Purpose |
|---|---|
| `README.md` | Project overview and setup entrypoint |
| `docker-compose.yml` | Full local stack with Redis, Python service, Go backend, frontend |
| `Dockerfile.tts` | Python speech service image |
| `.env.example` | Shared local defaults |
| `.env.khmer-tts.local.example` | Speech service local model defaults |
| `pyproject.toml` | Python package and dependency metadata |
| `uv.lock` | Python lock file |
| `scripts` | Setup, run, training, benchmark, and smoke-test scripts |
| `docs` | Project documentation |

## Frontend: `narration-studio-web`

| Path | Purpose |
|---|---|
| `src/app` | Next.js App Router pages and route handlers |
| `src/app/api/proxy` | Main server-side proxy to the Go backend |
| `src/app/api/auth`, `src/app/api/admin`, `src/app/api/backend` | Compatibility proxy route groups |
| `src/app/dashboard` | User dashboard pages |
| `src/app/admin` | Admin dashboard pages |
| `src/app/docs` | In-app API documentation route |
| `src/components` | Shared UI and feature components |
| `src/components/docs` | Docs layout, sidebar, API playground |
| `src/components/skeletons` | Loading skeleton components |
| `src/components/states` | Empty, loading, error, retry states |
| `src/components/ui` | Small reusable UI primitives |
| `src/store` | Redux store setup and auth slice |
| `src/store/api` | RTK Query endpoint modules |
| `src/lib` | Shared types, API helpers, proxy helpers |
| `src/content` | Docs and changelog content |

Important frontend flow:

```txt
Page/component
  -> RTK Query hook in src/store/api/*
  -> /api/proxy/* route handler
  -> src/lib/server-proxy.ts
  -> Go backend /api/*
```

Frontend route groups:

- Public: `/`, `/pricing`, `/docs`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.
- User: `/dashboard`, `/dashboard/studio`, `/dashboard/history`, `/dashboard/usage`, `/dashboard/api/*`, `/dashboard/settings`, `/dashboard/verification`, `/dashboard/voice-cloning`.
- Admin: `/admin`, `/admin/users`, `/admin/plans`, `/admin/credits`, `/admin/api-keys`, `/admin/api-logs`, `/admin/audit-logs`, `/admin/security`, `/admin/verifications`, `/admin/voice-clones`, `/admin/voices`.
- Legal/account: `/terms`, `/privacy`, `/voice-safety-policy`, `/account-pending`, `/account-disabled`.

## Go Backend: `go-backend`

| Path | Purpose |
|---|---|
| `cmd/server/main.go` | Starts config, database, queue workers, routes, graceful shutdown |
| `internal/config` | Environment loading and config defaults |
| `internal/database` | SQLite/PostgreSQL connection, auto-migrations, seed plans, seed admin |
| `internal/routes` | Route table |
| `internal/models` | GORM models |
| `internal/handlers/auth_handler.go` | Register, login, sessions, OTP, 2FA, Google OAuth |
| `internal/handlers/speech_handler.go` | Create jobs, inspect jobs, cancel/delete jobs |
| `internal/handlers/api_key_handler.go` | User/admin API keys and usage |
| `internal/handlers/admin_user_handler.go` | Admin user management |
| `internal/handlers/admin_plan_handler.go` | Pricing plan CRUD |
| `internal/handlers/identity_handler.go` | Identity verification |
| `internal/handlers/voice_clone_handler.go` | Voice clone upload/list/update/delete |
| `internal/handlers/notification_handler.go` | Notifications and WebSocket |
| `internal/handlers/webhook_handler.go` | Webhook CRUD and tests |
| `internal/handlers/misc_handler.go` | Health, audio serving, voices, visitor |
| `internal/middleware` | Auth, API key, admin, CORS, recovery |
| `internal/services/queue_service.go` | Redis/memory queue, chunking, generation lifecycle |
| `internal/services/fastapi_client.go` | Calls Python service |
| `internal/services/audio_merge_service.go` | WAV merge and MP3 conversion |
| `internal/services/auth_service.go` | Sessions and JWT refresh flow |
| `internal/services/otp_service.go` | Email OTP storage/verification |
| `internal/services/notification_service.go` | Notifications and WebSocket clients |
| `internal/services/webhook_service.go` | Webhook delivery |
| `internal/utils` | Passwords, JWTs, tokens, responses, cookies, signatures |

Go backend flow for speech:

```txt
routes.go
  -> speech_handler.CreateSpeech
  -> credits/plan/voice checks
  -> generation_jobs insert
  -> QueueService.Enqueue
  -> QueueService.Process
  -> TextChunker.Split
  -> FastAPIClient.Generate
  -> AudioMergeService.Merge
  -> users.credits_used update
  -> Notification/Webhook
```

## Python Service

| Path | Purpose |
|---|---|
| `reader_app.py` | FastAPI service used by Go backend |
| `app.py` | Standalone Gradio demo |
| `lora_ft_webui.py` | LoRA training/inference UI |
| `src/*/core.py` | Main model loading/inference wrapper |
| `src/*/cli.py` | CLI entrypoint |
| `src/*/model` | Model wrappers |
| `src/*/modules` | Neural network modules |
| `src/*/training` | Fine-tuning utilities |
| `src/*/utils` | Text normalization |
| `scripts/train_*_finetune.py` | Training script |
| `scripts/test_*_ft_infer.py` | Full fine-tune inference test |
| `scripts/test_*_lora_infer.py` | LoRA inference test |
| `scripts/test_pick_runtime_dtype.py` | Runtime dtype helper test |
| `tests` | Python unit tests |

Python service flow:

```txt
reader_app.py FastAPI
  -> WorkerManager
  -> model worker/process
  -> generate request
  -> output WAV/MP3
  -> response to Go backend
```

## Data and Model Files

| Path | Purpose |
|---|---|
| `voice_clone_dataset` | Reference audio samples and user uploads |
| `models/khmer-tts/model_profile.json` | Local Khmer model profile |
| `datasets/khmer-tts` | Dataset notes |
| `examples` | Training data examples |
| `conf/local_khmer_tts_lora.yaml` | Local LoRA config |
| `conf/*_v*` | Versioned fine-tuning configs |

## Tests

| Path | Purpose |
|---|---|
| `tests/test_cli.py` | CLI parser/model loading behavior |
| `tests/test_validate.py` | Training manifest validation |
| `tests/test_model_utils.py` | Model utility tests |
| `tests/test_lora_checkpoint_loading.py` | LoRA checkpoint loading tests |

Run all current checks:

```bash
pytest
cd go-backend && go test ./...
cd narration-studio-web && npm run lint && npm run build
```
