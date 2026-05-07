import { DocsPage } from "@/components/docs/DocsPage";

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <DocsPage slug={slug} />;
}
