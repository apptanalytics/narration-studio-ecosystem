# Credit System

Credits are the usage currency for speech generation. The Go backend calculates credits from text length and deducts them only when generation completes.

## Credit Formula

```txt
required_credits = number of Unicode characters in request.text
available_credits = credits_total - credits_used - reserved_credits
reserved_credits = sum(character count of pending/running/merging jobs)
```

The code uses `utf8.RuneCountInString`, so Khmer text counts by Unicode code point, not by bytes.

## When Credits Are Checked

Credits are checked in `CreateSpeech` before the job is inserted.

Checks:

1. Text must be non-empty.
2. Text length must be less than the user's plan `max_text_chars`.
3. Voice must be accessible by the user.
4. Available credits must cover the new job after active job reservations.

If credits are not enough, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Not enough credits",
    "details": {
      "available": 1200,
      "reserved": 3000,
      "required": 4500
    }
  }
}
```

## When Credits Are Deducted

Credits are deducted in the queue worker only after final audio is merged and the job is marked completed.

```txt
users.credits_used += character_count(job.text)
generation_jobs.credits_used = character_count(job.text)
generation_jobs.status = completed
```

Failed and cancelled jobs do not deduct credits.

## Monthly Reset

The auth middleware refreshes the user credit window when an authenticated request is made.

If `credits_reset_at` is empty:

- `credit_period_started_at` is set to now.
- `credits_reset_at` is set to one month from now.

If the current time is past `credits_reset_at`:

- `credits_used` is reset to `0`.
- `credit_period_started_at` is set to now.
- `credits_reset_at` is set to one month from now.

## Plan Assignment

When an admin assigns a plan:

- `users.plan_id` is updated.
- `users.credits_total` becomes `pricing_plans.credits`.
- `users.credits_used` resets to `0`.
- `credit_period_started_at` becomes now.
- `credits_reset_at` becomes one month from now.
- `api_access_enabled` copies from the plan.
- `voice_clone_limit` copies from the plan.

## Default Plans

| Plan | Monthly Credits | Max Text per Job | API Access | Voice Clone Limit |
|---|---:|---:|---|---:|
| Free | 5,000 | 20,000 | Enabled | 5 |
| Basic | 30,000 | 60,000 | Enabled | 10 |
| Starter | 70,000 | 120,000 | Enabled | 20 |
| Studio | 150,000 | 300,000 | Enabled | Unlimited |
| Studio Max | 600,000 | 750,000 | Enabled | Unlimited |
| Student | 30,000 | 60,000 | Enabled | 10 |

## Admin Credit Controls

Admins can manage credits with:

- `PATCH /api/admin/users/:id/plan`
- `PATCH /api/admin/users/:id/credits`
- `GET /api/admin/credits`

`PATCH /api/admin/users/:id/credits` accepts:

```json
{
  "credits_total": 30000,
  "credits_used": 1250
}
```

## Credit Examples

A user has:

```txt
credits_total = 5000
credits_used = 1000
one active pending job = 500 characters
new request text = 1500 characters
```

Available credits:

```txt
5000 - 1000 - 500 = 3500
```

The new request is accepted because `1500 <= 3500`.

If the new request has `4000` characters, it is rejected because active reservations leave only `3500` credits.

## Important Behavior

- Credits are not charged at queue time.
- Active jobs reserve credits so users cannot submit many pending jobs that exceed their balance.
- Credits are not refunded on failure because they were never deducted.
- API request limits exist in plan metadata, but credit deduction is based on characters generated.
- Unlimited voice cloning is represented by `voice_clone_limit = -1`.
