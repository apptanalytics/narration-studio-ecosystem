export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  added: string[];
  changed: string[];
  fixed: string[];
  security: string[];
  breaking: string[];
};

export const changelog: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-05-04",
    title: "Narration Studio API v1",
    added: [
      "Cookie-based authentication",
      "API key management with nstudio_live_ tokens",
      "Speech generation jobs",
      "Identity verification for voice cloning",
      "Dynamic pricing plans",
    ],
    changed: [
      "FastAPI model server is internal only",
      "Go backend is the public API gateway",
    ],
    fixed: [
      "Improved auth error handling",
      "Normalized job statuses",
    ],
    security: [
      "HttpOnly cookies",
      "Refresh token rotation",
      "API origin and method restrictions",
    ],
    breaking: [],
  },
  {
    version: "2.0.0-preview",
    date: "2026-05-04",
    title: "Narration Studio API v2 Preview",
    added: ["Preview namespace for upcoming speech and transcription improvements", "Versioned documentation"],
    changed: ["Docs navigation now supports version switching"],
    fixed: ["Clarified endpoint names and token prefixes"],
    security: ["Continues v1 cookie and API key controls"],
    breaking: ["Preview behavior may change before v2 becomes stable"],
  },
];
