export type DocsVersion = "v1" | "v2";

export const latestStableVersion: DocsVersion = "v1";

export const docsVersions: { version: DocsVersion; label: string; status: "Stable" | "Preview" }[] = [
  { version: "v1", label: "v1", status: "Stable" },
  { version: "v2", label: "v2", status: "Preview" },
];

export function isDocsVersion(value: string | undefined): value is DocsVersion {
  return value === "v1" || value === "v2";
}
