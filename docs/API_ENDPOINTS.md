# API Endpoints

The public backend is the Go service at `http://localhost:8080`. The frontend should call it through the Next.js proxy at `http://localhost:3000/api/proxy/*`.

## Response Format

Successful Go responses:

```json
{
  "success": true,
  "message": "Done",
  "data": {}
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable error",
    "details": {}
  }
}
```

## Authentication

The Go API supports:

- Cookie session auth with `access_token` and `refresh_token`.
- Bearer JWT auth for access tokens.
- API key auth for `/api/v1/*` using `Authorization: Bearer nstudio_live_...`.

User accounts must verify email and be admin-approved before normal login, except Google-created users and admin bootstrap users.

## Public and Auth Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check |
| `GET` | `/api/visitor` | No | Visitor/session metadata |
| `GET` | `/api/voices` | No | Public voice list |
| `GET` | `/api/voices/preview` | No | Preview a voice by query string |
| `HEAD` | `/api/voices/preview` | No | Preview metadata |
| `GET` | `/api/plans` | No | Active pricing plans |
| `POST` | `/api/auth/register` | No | Create account, sends email OTP |
| `POST` | `/api/auth/login` | No | Login with email/password and optional `totp_code` |
| `POST` | `/api/auth/refresh` | Refresh cookie | Rotate access/refresh cookies |
| `POST` | `/api/auth/forgot-password` | No | Send password reset OTP |
| `POST` | `/api/auth/reset-password` | No | Reset password with OTP |
| `GET` | `/api/auth/google/login` | No | Start Google OAuth |
| `GET` | `/api/auth/google/callback` | No | OAuth callback |
| `POST` | `/api/auth/verify-email-otp` | Optional | Verify email OTP |
| `POST` | `/api/auth/resend-email-otp` | Optional | Resend email OTP |

## User Account Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/auth/me` | Current user profile |
| `PATCH` | `/api/auth/me` | Update name, email, avatar |
| `PATCH` | `/api/auth/password` | Update password |
| `POST` | `/api/auth/logout` | Revoke current session |
| `POST` | `/api/auth/logout-all` | Revoke all sessions |
| `GET` | `/api/auth/sessions` | List active sessions |
| `DELETE` | `/api/auth/sessions/:id` | Revoke one session |
| `POST` | `/api/auth/totp/setup` | Create authenticator secret |
| `POST` | `/api/auth/totp/enable` | Enable 2FA |
| `POST` | `/api/auth/totp/disable` | Disable 2FA |
| `POST` | `/api/auth/2fa/setup` | Alias for TOTP setup |
| `POST` | `/api/auth/2fa/verify` | Alias for TOTP enable |
| `POST` | `/api/auth/2fa/disable` | Alias for TOTP disable |

## Speech Generation Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/speech` | Cookie/JWT/API key | Create a speech job |
| `GET` | `/api/v1/jobs/:id` | Cookie/JWT/API key | Get job status |
| `GET` | `/api/v1/jobs/:id/chunks` | Cookie/JWT/API key | Get chunk status |
| `POST` | `/api/v1/jobs/:id/cancel` | Cookie/JWT/API key | Cancel pending/running job |
| `POST` | `/api/generate` | Cookie/JWT | Legacy create speech job |
| `POST` | `/api/jobs` | Cookie/JWT | Legacy create speech job |
| `GET` | `/api/jobs` | Cookie/JWT | User generation history |
| `GET` | `/api/jobs/:id` | Cookie/JWT | Legacy job status |
| `GET` | `/api/jobs/:id/chunks` | Cookie/JWT | Legacy chunk status |
| `POST` | `/api/jobs/:id/cancel` | Cookie/JWT | Legacy cancel |
| `DELETE` | `/api/jobs/:id` | Cookie/JWT | Delete job and chunks |
| `GET` | `/audio/*path` | No | Serve generated audio |
| `HEAD` | `/audio/*path` | No | Audio metadata |

Create speech request:

```json
{
  "text": "សួស្តី នេះជាសំឡេងសាកល្បង",
  "voice": "Maly-Female.mp3",
  "model": "khmer-tts",
  "wait": false
}
```

Create speech response:

```json
{
  "success": true,
  "message": "Speech generation queued",
  "data": {
    "job_id": "uuid",
    "status": "pending",
    "status_url": "/api/v1/jobs/uuid",
    "job": {}
  }
}
```

## Voice Clone and Identity Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/identity-verification/me` | Current identity status |
| `POST` | `/api/identity-verification/submit` | Submit identity form and files |
| `GET` | `/api/verification/status` | Alias for current identity status |
| `POST` | `/api/verification/submit` | Alias for identity submit |
| `POST` | `/api/voice-clones` | Upload a voice clone with legal agreement |
| `GET` | `/api/voice-clones` | List current user voice clones |
| `PATCH` | `/api/voice-clones/:id` | Rename/update voice metadata |
| `DELETE` | `/api/voice-clones/:id` | Delete a voice clone |

Voice clone requires:

- Approved identity verification for normal users.
- `legal_agreement=true` or `agreement=true`.
- Multipart `audio` or `file`.
- Voice clone quota available on the user plan.

## API Key Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/api/keys` | List current user API keys |
| `POST` | `/api/api/keys` | Create API key |
| `PATCH` | `/api/api/keys/:id` | Update API key settings |
| `DELETE` | `/api/api/keys/:id` | Revoke API key |
| `POST` | `/api/api/keys/:id/regenerate` | Rotate API key token |
| `GET` | `/api/user/api-keys` | Alias for user API keys |
| `POST` | `/api/user/api-keys` | Alias create |
| `PATCH` | `/api/user/api-keys/:id` | Alias update |
| `DELETE` | `/api/user/api-keys/:id` | Alias revoke |
| `POST` | `/api/user/api-keys/:id/regenerate` | Alias rotate |
| `GET` | `/api/user/api-logs` | User API usage logs |
| `GET` | `/api/user/api-usage` | Monthly usage totals |

API keys can restrict:

- Allowed origins.
- Allowed methods.
- Expiration date.
- Active/revoked status.

## Notifications and Webhooks

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/notifications` | List notifications and unread count |
| `PATCH` | `/api/notifications/:id/read` | Mark one notification read |
| `PATCH` | `/api/notifications/read-all` | Mark all read |
| `DELETE` | `/api/notifications/:id` | Delete one notification |
| `DELETE` | `/api/notifications` | Clear notifications |
| `GET` | `/api/ws/notifications` | WebSocket notification stream |
| `GET` | `/api/webhooks` | List webhooks |
| `POST` | `/api/webhooks` | Create webhook |
| `PATCH` | `/api/webhooks/:id` | Update webhook |
| `DELETE` | `/api/webhooks/:id` | Delete webhook |
| `POST` | `/api/webhooks/:id/test` | Send test webhook |

Webhook events currently include generation and voice/identity events such as `generation.completed`, `generation.failed`, `voice_clone.created`, `identity.approved`, and `identity.rejected`.

## Admin Endpoints

All admin endpoints require an authenticated admin or super admin user.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/summary` | Admin dashboard counts |
| `GET` | `/api/admin/roles` | Role definitions |
| `GET` | `/api/admin/credits` | User credit balances |
| `GET` | `/api/admin/purchases` | Purchase list placeholder |
| `GET` | `/api/admin/voices` | Admin voice list |
| `GET` | `/api/admin/voice-clones` | All voice clones |
| `GET` | `/api/admin/users` | List users |
| `GET` | `/api/admin/users/:id` | Get user |
| `POST` | `/api/admin/users` | Create user |
| `PATCH` | `/api/admin/users/:id` | Update allowed user fields |
| `DELETE` | `/api/admin/users/:id` | Delete user |
| `PATCH` | `/api/admin/users/:id/approve` | Approve pending user |
| `PATCH` | `/api/admin/users/:id/reject` | Reject user |
| `PATCH` | `/api/admin/users/:id/status` | Set user status |
| `PATCH` | `/api/admin/users/:id/role` | Set role |
| `PATCH` | `/api/admin/users/:id/plan` | Assign plan and reset period |
| `PATCH` | `/api/admin/users/:id/credits` | Edit credit totals/used |
| `PATCH` | `/api/admin/users/:id/api-access` | Enable/disable API access |
| `PATCH` | `/api/admin/users/:id/voice-clones` | Set clone limit |
| `POST` | `/api/admin/users/:id/resend-verification` | Resend email OTP |
| `POST` | `/api/admin/users/:id/mark-email-verified` | Mark email verified |
| `POST` | `/api/admin/users/:id/reset-password-email` | Send reset email |
| `POST` | `/api/admin/users/:id/logout-all` | Revoke user sessions |
| `GET` | `/api/admin/users/:id/identity-verification` | User identity record |
| `PATCH` | `/api/admin/users/:id/identity-verification` | Update identity record |
| `GET` | `/api/admin/users/:id/sessions` | User sessions |
| `DELETE` | `/api/admin/users/:id/sessions/:sessionId` | Revoke user session |
| `GET` | `/api/admin/users/:id/api-keys` | User API keys |
| `DELETE` | `/api/admin/users/:id/api-keys/:keyId` | Revoke user API key |
| `GET` | `/api/admin/users/:id/activity-logs` | User audit logs |
| `GET` | `/api/admin/users/:id/purchases` | User purchases placeholder |
| `GET` | `/api/admin/users/:id/voice-clones` | User voice clones |
| `DELETE` | `/api/admin/users/:id/voice-clones/:cloneId` | Delete user voice clone |
| `GET` | `/api/admin/security/settings` | Security settings |
| `PATCH` | `/api/admin/security/settings` | Save security settings |
| `GET` | `/api/admin/security/logs` | Security audit logs |
| `GET` | `/api/admin/plans` | List all plans |
| `POST` | `/api/admin/plans` | Create plan |
| `PATCH` | `/api/admin/plans/:id` | Update plan |
| `DELETE` | `/api/admin/plans/:id` | Deactivate plan |
| `GET` | `/api/admin/identity-verifications` | List identity submissions |
| `GET` | `/api/admin/identity-verifications/:id` | Get identity submission |
| `PATCH` | `/api/admin/identity-verifications/:id/approve` | Approve identity |
| `PATCH` | `/api/admin/identity-verifications/:id/reject` | Reject identity |
| `GET` | `/api/admin/api-keys` | All API keys |
| `GET` | `/api/admin/api-logs` | All API usage logs |
| `GET` | `/api/admin/audit-logs` | Audit logs |

## Internal Python Service Endpoints

The Python service runs on `http://localhost:8810`. In the full app, the Go backend calls only `POST /api/generate` directly. Other endpoints are useful for direct local testing and legacy workflows.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service/model status |
| `GET` | `/api/visitor` | Visitor credit/rate-limit metadata |
| `GET` | `/api/ultimate/access` | Check ultimate clone allowlist |
| `GET` | `/api/gpus` | Worker pool status |
| `GET` | `/api/voices` | Voice list |
| `POST` | `/api/voices/upload` | Upload user voice |
| `GET` | `/api/voices/preview` | Preview voice by query |
| `GET` | `/api/voices/{filename}/preview` | Preview voice by filename |
| `GET` | `/api/examples` | Example payloads |
| `POST` | `/api/warmup` | Load/warm model workers |
| `POST` | `/api/generate` | Generate audio immediately |
| `POST` | `/api/jobs` | Create Python-side background job |
| `GET` | `/api/jobs` | List Python-side jobs |
| `GET` | `/api/jobs/{job_id}` | Get Python-side job |
| `DELETE` | `/api/jobs/{job_id}` | Delete Python-side job |
| `GET` | `/api/download/{job_id}/{filename}` | Download Python-side output |
| `GET` | `/api/v1/models` | OpenAI-style model list |
| `GET` | `/api/v1/voices` | OpenAI-style voice list |
| `GET` | `/api/v1/audio/voices` | OpenAI-style voice list alias |
| `GET` | `/api/v1/audio/voices/{voice}/preview` | OpenAI-style voice preview |
| `POST` | `/api/v1/audio/speech` | OpenAI-style speech endpoint |
| `POST` | `/api/v1/audio/transcriptions` | Placeholder transcription endpoint |
| `GET` | `/api/v1/usage` | API key usage |
| `GET` | `/api/v1/logs` | API key logs |
