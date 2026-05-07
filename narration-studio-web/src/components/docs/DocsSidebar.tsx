import Link from "next/link";
import { docsHref, docsNavigation, type DocsSlug } from "@/lib/docs/navigation";
import type { DocsVersion } from "@/lib/docs/versions";

export function DocsSidebar({ version, slug }: { version: DocsVersion; slug: DocsSlug }) {
  return (
    <aside className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:sticky lg:top-24 lg:self-start">
      {docsNavigation.map((group) => (
        <div key={group.group} className="mb-6">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-neutral-500">{group.group}</p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <Link
                key={item.slug}
                href={docsHref(version, item.slug)}
                className={`block rounded-lg px-3 py-2 text-sm font-semibold ${slug === item.slug ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"}`}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
