import type { DocsVersion } from "@/lib/docs/versions";

export type DocsSlug =
  | "introduction"
  | "quick-start"
  | "authentication"
  | "generate-speech"
  | "transcriptions"
  | "available-voices"
  | "parameters"
  | "pricing"
  | "errors"
  | "webhooks"
  | "code-examples"
  | "best-practices"
  | "faq"
  | "changelog";

export const docsNavigation: { group: string; items: { slug: DocsSlug; title: string }[] }[] = [
  { group: "Start", items: [{ slug: "introduction", title: "Introduction" }, { slug: "quick-start", title: "Quick Start" }, { slug: "authentication", title: "Authentication" }] },
  { group: "API", items: [{ slug: "generate-speech", title: "Generate Speech" }, { slug: "transcriptions", title: "Transcriptions" }, { slug: "available-voices", title: "Available Voices" }, { slug: "parameters", title: "Parameters" }, { slug: "errors", title: "Errors" }] },
  { group: "Resources", items: [{ slug: "pricing", title: "Pricing" }, { slug: "webhooks", title: "Webhooks" }, { slug: "code-examples", title: "Code Examples" }, { slug: "best-practices", title: "Best Practices" }, { slug: "faq", title: "FAQ" }, { slug: "changelog", title: "Changelog" }] },
];

export function docsHref(version: DocsVersion, slug: DocsSlug = "introduction") {
  return `/docs/${version}/${slug}`;
}
