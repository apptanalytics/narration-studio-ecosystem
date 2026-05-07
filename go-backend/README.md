# Narration Studio Go Backend

This is the public backend for Narration Studio. FastAPI remains internal model inference only at `http://localhost:8810`; frontend traffic should go through this Go API at `http://localhost:8080`.

## Architecture

- Gin HTTP API with standard `{ success, message, data }` and `{ success, error }` responses.
- GORM with SQLite by default at `reader_outputs/auth.db`; PostgreSQL DSN support is included for later.
- Redis is used when available for OTP cache, session cache, refresh-token blacklist, job progress, and the generation queue. If Redis is unavailable, the speech queue falls back to memory.
- Speech jobs are persisted in SQLite, split into chunks of `MAX_CHARS_PER_CHUNK`, processed through a worker pool, and sent chunk-by-chunk to the internal FastAPI TTS server.

## Run

```bash
cd go-backend
cp .env.example .env
go mod download
go run ./cmd/server
```

Expected ports:

- Go backend: `http://localhost:8080`
- FastAPI model server: `http://localhost:8810`
- Next.js frontend: `http://localhost:3000`

## Required Environment

See `.env.example`. Secure production deployments must replace `JWT_SECRET`, configure Gmail SMTP, configure Google OAuth, and run with `APP_ENV=production` so cookies are marked secure.

SQLite is the local default. PostgreSQL is supported with:

```env
DATABASE_DRIVER=postgres
DATABASE_DSN=host=localhost user=nstudio password=nstudio dbname=nstudio port=5432 sslmode=disable TimeZone=UTC
```

See [`../docs/DATABASE.md`](../docs/DATABASE.md), [`../docs/API_ENDPOINTS.md`](../docs/API_ENDPOINTS.md), and [`../docs/CREDIT_SYSTEM.md`](../docs/CREDIT_SYSTEM.md) for the full backend docs.

## Main Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/me`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/:id`
- `POST /api/auth/resend-email-otp`
- `POST /api/auth/verify-email-otp`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/totp/setup`
- `POST /api/auth/totp/enable`
- `POST /api/auth/totp/disable`
- `GET /api/plans`
- `GET|POST|PATCH|DELETE /api/admin/plans`
- `GET|POST|PATCH|DELETE /api/admin/users`
- `GET|PATCH /api/admin/identity-verifications`
- `POST /api/v1/speech`
- `GET /api/v1/jobs/:id`
- `GET /api/v1/jobs/:id/chunks`
- `POST /api/v1/jobs/:id/cancel`
- `GET|POST|PATCH|DELETE /api/api/keys`
- `GET|POST|PATCH|DELETE /api/webhooks`
- `GET /api/ws/notifications`

API keys are generated as `nstudio_live_...` and only the hash is stored.

## Admin Bootstrap

Set these once before the first run to create the initial ultimate admin, then remove them:

```bash
ADMIN_BOOTSTRAP_EMAIL=admin@example.com
ADMIN_BOOTSTRAP_PASSWORD=replace-with-a-strong-password
```

## Assumptions

- New users must verify email and be approved by an admin before login.
- The optional admin bootstrap env vars create the first admin; normal users still require email verification and admin approval.
- FastAPI TTS endpoint is assumed to accept `POST /api/generate`; adjust `internal/services/fastapi_client.go` if the internal model route differs.
- Audio merging currently concatenates chunk files. For production-quality WAV merging, replace `AudioMergeService` with an ffmpeg-backed implementation.
