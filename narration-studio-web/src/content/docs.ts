import type { DocsSlug } from "@/lib/docs/navigation";
import type { DocsVersion } from "@/lib/docs/versions";

export type DocsSection = { id: string; title: string; body?: string; code?: string; bullets?: string[]; note?: string };
export type DocsPageContent = { title: string; intro: string; sections: DocsSection[] };

const baseUrl = "http://localhost:8080";

const common: Record<DocsSlug, DocsPageContent> = {
  introduction: {
    title: "Narration Studio API",
    intro: "Build speech generation, transcription, and voice workflows with Narration Studio. This guide covers accounts, API keys, plans, policy agreements, and production API calls.",
    sections: [
      { id: "start", title: "How to start", bullets: ["Create an account with Sign Up", "Verify your email and wait for approval if required", "Open Dashboard > API Keys", "Create an API key that starts with nstudio_live_", "Use the key from your server or a restricted browser origin"] },
      { id: "base-url", title: "Base URL", body: "Use the local URL while developing. In production, replace it with your production API URL.", code: baseUrl },
      { id: "endpoints", title: "Core endpoints", bullets: ["POST /v1/speech creates a speech generation job", "GET /v1/jobs/:id returns job status and result URLs", "GET /v1/voices lists available standard and cloned voices", "API keys start with nstudio_live_"] },
      { id: "account-links", title: "Account pages", bullets: ["Sign up: /register", "Log in: /login", "API keys: /dashboard/api/keys", "Billing: /dashboard/billing", "Voice policy: /voice-safety-policy"] },
    ],
  },
  "quick-start": {
    title: "Quick Start",
    intro: "Generate a speech job with an API key and poll the job endpoint.",
    sections: [
      { id: "request", title: "Create speech", body: "Send text and a voice id to create a generation job.", code: `curl -X POST ${baseUrl}/v1/speech \\\n  -H "Authorization: Bearer nstudio_live_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"input":"Hello from Narration Studio","voice":"maly","format":"mp3"}'` },
      { id: "job", title: "Check a job", code: `curl ${baseUrl}/v1/jobs/job_123 \\\n  -H "Authorization: Bearer nstudio_live_YOUR_KEY"` },
      { id: "javascript", title: "JavaScript fetch", code: `const response = await fetch("${baseUrl}/v1/speech", {\n  method: "POST",\n  headers: {\n    Authorization: "Bearer nstudio_live_YOUR_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    input: "Hello from Narration Studio",\n    voice: "maly",\n    format: "mp3"\n  })\n});\n\nconst job = await response.json();` },
      { id: "python", title: "Python requests", code: `import requests\n\nresponse = requests.post(\n    "${baseUrl}/v1/speech",\n    headers={\n        "Authorization": "Bearer nstudio_live_YOUR_KEY",\n        "Content-Type": "application/json",\n    },\n    json={\n        "input": "Hello from Narration Studio",\n        "voice": "maly",\n        "format": "mp3",\n    },\n)\n\nprint(response.json())` },
    ],
  },
  authentication: {
    title: "Authentication",
    intro: "Use dashboard sessions for the web app and nstudio_live_ API keys for public API requests.",
    sections: [
      { id: "bearer", title: "Bearer token", code: "Authorization: Bearer nstudio_live_YOUR_KEY" },
      { id: "restrictions", title: "Restrictions", bullets: ["Set allowed origins for browser keys", "Set allowed IPs for server keys", "Use separate keys for development and production", "Rotate exposed keys immediately"] },
      { id: "cookies", title: "Dashboard sessions", body: "The dashboard uses secure cookie-based authentication. API clients should use bearer API keys instead of copying dashboard cookies." },
    ],
  },
  "generate-speech": {
    title: "Generate Speech",
    intro: "Convert text to natural-sounding speech with the Narration Studio API. You can test the endpoint directly on this page.",
    sections: [
      { id: "compatible", title: "OpenAI SDK style", body: "Use the same client pattern as OpenAI SDK integrations by pointing your API client to the Narration Studio base URL and sending your nstudio_live_ key." },
      { id: "endpoint", title: "Endpoint", code: "POST /v1/speech" },
      { id: "body", title: "Request body", code: `{\n  "input": "Narration Studio generates natural speech.",\n  "voice": "maly",\n  "format": "mp3",\n  "speed": 1,\n  "normalize": true,\n  "webhook_url": "https://example.com/webhooks/narration"\n}` },
      { id: "response", title: "Response", code: `{\n  "id": "job_123",\n  "status": "queued",\n  "status_url": "/v1/jobs/job_123"\n}` },
      { id: "models", title: "List models", body: "Use this endpoint to discover supported speech models.", code: "GET /v1/models" },
      { id: "voices", title: "List voices", body: "Use this endpoint to list standard and verified cloned voices.", code: "GET /v1/voices" },
    ],
  },
  transcriptions: {
    title: "Transcriptions",
    intro: "Transcription endpoints are planned for Narration Studio API clients.",
    sections: [
      { id: "endpoint", title: "Endpoint", code: "POST /v1/transcriptions" },
      { id: "status", title: "Availability", body: "If this backend endpoint is not enabled in your deployment, calls return a documented missing endpoint error." },
    ],
  },
  "available-voices": {
    title: "Available Voices",
    intro: "List standard and verified cloned voices available to the caller.",
    sections: [
      { id: "list", title: "List voices", code: "GET /v1/voices" },
      { id: "fields", title: "Voice fields", bullets: ["id", "name", "language", "gender", "type", "preview_url"] },
    ],
  },
  parameters: {
    title: "Parameters",
    intro: "Tune speech output with explicit request parameters.",
    sections: [
      { id: "speech", title: "Speech parameters", bullets: ["input: required text", "voice: required voice id", "format: mp3 or wav", "speed: optional number", "normalize: optional boolean"] },
    ],
  },
  pricing: {
    title: "Pricing",
    intro: "Plans control credits, request limits, and voice clone capacity.",
    sections: [
      { id: "plans", title: "Plans", bullets: ["Free: evaluate the product with limited monthly credits", "Basic and Starter: higher monthly credits and API requests", "Studio and Studio Max: larger production usage and priority workflows"] },
      { id: "credits", title: "Credits", body: "Speech generation consumes credits based on usage and plan limits. Billing and plan changes are managed from the dashboard billing page." },
      { id: "keys", title: "API keys", body: "Each key can have request limits and origin restrictions. Keep production keys server-side when possible." },
      { id: "refunds", title: "Policy agreement", bullets: ["Refunds may be available within the posted refund window", "Heavy usage or abuse can affect refund eligibility", "Voice cloning requires permission and identity verification", "Misuse, impersonation, fraud, and unsafe content can lead to suspension"] },
    ],
  },
  errors: {
    title: "Errors",
    intro: "Narration Studio returns structured JSON errors.",
    sections: [
      { id: "codes", title: "Common codes", code: `401 UNAUTHORIZED\n403 ORIGIN_NOT_ALLOWED\n402 INSUFFICIENT_CREDITS\n404 NOT_FOUND\n429 RATE_LIMITED\n500 SERVER_ERROR` },
    ],
  },
  webhooks: {
    title: "Webhooks",
    intro: "Use webhooks to receive job completion notifications.",
    sections: [
      { id: "events", title: "Events", bullets: ["speech.job.completed", "speech.job.failed", "voice_clone.ready"] },
      { id: "payload", title: "Payload", code: `{\n  "event": "speech.job.completed",\n  "job_id": "job_123",\n  "status": "completed",\n  "audio_url": "https://.../audio/job_123.mp3"\n}` },
      { id: "signature", title: "Signature", body: "Verify webhook signatures before trusting payloads.", note: "Do not process webhook payloads that fail signature validation." },
    ],
  },
  "code-examples": {
    title: "Code Examples",
    intro: "Copy-ready examples for calling Narration Studio from JavaScript, Python, and cURL.",
    sections: [
      { id: "javascript", title: "JavaScript", code: `const response = await fetch("${baseUrl}/v1/speech", {\n  method: "POST",\n  headers: {\n    Authorization: "Bearer nstudio_live_YOUR_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({ input: "Hello", voice: "Maly", format: "mp3" })\n});` },
      { id: "python", title: "Python", code: `import requests\n\nresponse = requests.post(\n    "${baseUrl}/v1/speech",\n    headers={"Authorization": "Bearer nstudio_live_YOUR_KEY"},\n    json={"input": "Hello", "voice": "Maly", "format": "mp3"},\n)\nprint(response.json())` },
      { id: "curl", title: "cURL", code: `curl -X POST ${baseUrl}/v1/speech \\\n  -H "Authorization: Bearer nstudio_live_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"input":"Hello","voice":"Maly","format":"mp3"}'` },
    ],
  },
  "best-practices": {
    title: "Best Practices",
    intro: "Use Narration Studio safely in production.",
    sections: [
      { id: "keys", title: "Protect keys", bullets: ["Keep unrestricted keys server-side", "Use origin restrictions for browser tests", "Rotate keys after exposure"] },
      { id: "jobs", title: "Use jobs", bullets: ["Create speech with POST /v1/speech", "Poll GET /v1/jobs/:id", "Store returned audio URLs instead of regenerating"] },
      { id: "voice-safety", title: "Voice safety", bullets: ["Only clone voices you own or have permission to use", "Complete identity verification before cloning", "Follow the voice safety policy and account agreement"] },
    ],
  },
  faq: {
    title: "FAQ",
    intro: "Common Narration Studio API questions.",
    sections: [
      { id: "keys", title: "Where do I get an API key?", body: "Create an account, log in, then open Dashboard > API Keys. Tokens start with nstudio_live_." },
      { id: "base-url", title: "What base URL should I use?", body: "Use http://localhost:8080 for local development or your production API URL in deployment." },
      { id: "models", title: "What model should I use?", body: "Start with the default Narration Studio speech model shown in the playground, then list models with GET /v1/models when your backend exposes it." },
    ],
  },
  changelog: {
    title: "Changelog",
    intro: "Versioned API release history for Narration Studio.",
    sections: [{ id: "release", title: "Latest release", body: "See the changelog entries below for added, changed, fixed, security, and breaking change notes." }],
  },
};

export const docsContent: Record<DocsVersion, Record<DocsSlug, DocsPageContent>> = {
  v1: common,
  v2: {
    ...common,
    introduction: { ...common.introduction, title: "Narration Studio API v2 Preview", intro: "Preview documentation for the next Narration Studio API version." },
    "generate-speech": { ...common["generate-speech"], intro: "Preview speech generation contract for v2. Stable production clients should use v1." },
  },
};
