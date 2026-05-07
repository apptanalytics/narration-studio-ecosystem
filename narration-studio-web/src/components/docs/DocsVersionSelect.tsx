"use client";

import { useRouter } from "next/navigation";
import { docsContent } from "@/content/docs";
import { docsHref, type DocsSlug } from "@/lib/docs/navigation";
import { docsVersions, type DocsVersion } from "@/lib/docs/versions";

export function DocsVersionSelect({ version, slug, className = "" }: { version: DocsVersion; slug: DocsSlug; className?: string }) {
  const router = useRouter();
  return (
    <select
      className={`field h-10 py-0 text-sm font-bold dark:border-neutral-800 dark:bg-neutral-950 ${className || "w-36"}`}
      value={version}
      onChange={(event) => {
        const next = event.target.value as DocsVersion;
        const nextSlug = docsContent[next][slug] ? slug : "introduction";
        router.push(docsHref(next, nextSlug));
      }}
    >
      {docsVersions.map((item) => (
        <option key={item.version} value={item.version}>{item.label} {item.status}</option>
      ))}
    </select>
  );
}
