import { notFound, redirect } from "next/navigation";
import { docsContent } from "@/content/docs";
import type { DocsSlug } from "@/lib/docs/navigation";
import { latestStableVersion, isDocsVersion } from "@/lib/docs/versions";
import { DocsLayout } from "@/components/docs/DocsLayout";

type DocsPageProps = { slug?: string[] };

export function DocsPage({ slug = [] }: DocsPageProps) {
  const [versionMaybe, pageMaybe] = slug;
  if (!versionMaybe) redirect(`/docs/${latestStableVersion}/introduction`);
  if (!isDocsVersion(versionMaybe)) redirect(`/docs/${latestStableVersion}/${versionMaybe || "introduction"}`);
  const pageSlug = (pageMaybe || "introduction") as DocsSlug;
  const page = docsContent[versionMaybe][pageSlug];
  if (!page) notFound();
  return <DocsLayout version={versionMaybe} slug={pageSlug} page={page} />;
}
