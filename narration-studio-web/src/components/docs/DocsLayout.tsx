import Link from "next/link";
import { Check, Menu, Search } from "lucide-react";
import { changelog } from "@/content/changelog";
import type { DocsPageContent } from "@/content/docs";
import type { DocsSlug } from "@/lib/docs/navigation";
import type { DocsVersion } from "@/lib/docs/versions";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsVersionSelect } from "@/components/docs/DocsVersionSelect";
import { CodeCopyButton } from "@/components/docs/CodeCopyButton";
import { DocsThemeToggle } from "@/components/docs/DocsThemeToggle";
import { DocsApiPlayground } from "@/components/docs/DocsApiPlayground";

export function DocsLayout({ version, slug, page }: { version: DocsVersion; slug: DocsSlug; page: DocsPageContent }) {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="flex h-[72px] w-full items-center gap-4 px-4 lg:px-6">
          <Link href="/" className="flex w-[210px] shrink-0 items-center gap-3 font-black" aria-label="Narration Studio home">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-sm text-white dark:bg-white dark:text-neutral-950">N</span>
            <span className="whitespace-nowrap">Narration Studio</span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
            <div className="flex h-10 w-full max-w-xs min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-950">
              <Search className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="truncate whitespace-nowrap text-sm text-neutral-500">Search docs...</span>
            </div>
            <DocsVersionSelect version={version} slug={slug} className="w-[180px] shrink-0" />
          </div>

          <nav className="ml-auto hidden shrink-0 items-center gap-3 md:flex">
            <DocsThemeToggle className="px-3" />
            <Link href="/changelog" className="whitespace-nowrap text-sm font-bold text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white">Changelog</Link>
            <Link href="/login" className="inline-flex h-10 items-center whitespace-nowrap rounded-lg border border-neutral-200 px-3 text-sm font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900">Log in</Link>
            <Link href="/register" className="inline-flex h-10 items-center whitespace-nowrap rounded-lg bg-neutral-950 px-4 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200">Sign up</Link>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:hidden">
            <DocsVersionSelect version={version} slug={slug} className="w-[132px] shrink-0" />
            <DocsThemeToggle className="w-10 px-0" />
            <details className="relative">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open docs menu</span>
              </summary>
              <div className="absolute right-0 top-12 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
                <div className="mb-3 flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3 dark:border-neutral-800">
                  <Search className="h-4 w-4 shrink-0 text-neutral-400" />
                  <span className="truncate text-sm text-neutral-500">Search docs...</span>
                </div>
                <Link href="/changelog" className="block rounded-lg px-3 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900">Changelog</Link>
                <Link href="/login" className="mt-1 block rounded-lg px-3 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900">Log in</Link>
                <Link href="/register" className="mt-2 block rounded-lg bg-neutral-950 px-3 py-2 text-center text-sm font-bold text-white dark:bg-white dark:text-neutral-950">Sign up</Link>
              </div>
            </details>
          </div>
        </div>
      </header>
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="grid w-full gap-6 px-4 py-8 lg:grid-cols-[1fr_360px] lg:px-6 lg:py-10">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-neutral-500">Narration Studio API {version}</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">{page.title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">{page.intro}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="btn">Create account</Link>
              <Link href="/dashboard/api/keys" className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-bold hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900">Get API key</Link>
              <Link href="/pricing" className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-bold hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900">Plans</Link>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/40">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Production checklist</p>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4" /> Use `nstudio_live_` API keys</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4" /> Restrict origins and IPs</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4" /> Verify voice-cloning permission</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4" /> Poll `GET /v1/jobs/:id`</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="grid w-full gap-6 px-4 py-8 lg:grid-cols-[260px_minmax(0,1fr)_220px] lg:px-6 xl:grid-cols-[280px_minmax(0,1fr)_240px]">
        <DocsSidebar version={version} slug={slug} />
        <article className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <QuickCard title="Base URL" value="http://localhost:8080" />
            <QuickCard title="Speech" value="POST /v1/speech" />
            <QuickCard title="Job" value="GET /v1/jobs/:id" />
          </div>
          <div className="space-y-6">
            {page.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                <h2 className="mb-4 text-2xl font-black">{section.title}</h2>
                {section.body ? <p className="leading-7 text-neutral-700 dark:text-neutral-300">{section.body}</p> : null}
                {section.bullets ? <ul className="space-y-2 text-neutral-700 dark:text-neutral-300">{section.bullets.map((item) => <li key={item} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0" />{item}</li>)}</ul> : null}
                {section.code ? <CodeBlock code={section.code} /> : null}
                {section.note ? <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">{section.note}</p> : null}
              </section>
            ))}
          </div>
          {slug === "generate-speech" ? <DocsApiPlayground /> : null}
          {slug === "changelog" ? <DocsChangelog /> : null}
        </article>
        <aside className="hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:sticky lg:top-24 lg:block lg:self-start">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-neutral-500">On this page</p>
          {page.sections.map((item) => <a key={item.id} href={`#${item.id}`} className="block py-1 text-sm font-semibold text-neutral-500 hover:text-neutral-950 dark:hover:text-white">{item.title}</a>)}
          <div className="mt-8 border-t border-neutral-200 pt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-neutral-500">Account</p>
            <Link href="/login" className="block py-1 text-sm font-semibold text-neutral-500 hover:text-neutral-950 dark:hover:text-white">Log in</Link>
            <Link href="/register" className="block py-1 text-sm font-semibold text-neutral-500 hover:text-neutral-950 dark:hover:text-white">Sign up</Link>
            <Link href="/terms" className="block py-1 text-sm font-semibold text-neutral-500 hover:text-neutral-950 dark:hover:text-white">Terms</Link>
            <Link href="/privacy" className="block py-1 text-sm font-semibold text-neutral-500 hover:text-neutral-950 dark:hover:text-white">Privacy</Link>
          </div>
        </aside>
      </div>
      <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex w-full flex-col gap-4 px-4 py-8 text-sm text-neutral-600 dark:text-neutral-400 md:flex-row md:items-center md:justify-between lg:px-6">
          <p className="font-semibold">Narration Studio API docs</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/pricing" className="hover:text-neutral-950 dark:hover:text-white">Plans</Link>
            <Link href="/voice-safety-policy" className="hover:text-neutral-950 dark:hover:text-white">Voice policy</Link>
            <Link href="/terms" className="hover:text-neutral-950 dark:hover:text-white">Agreement</Link>
            <Link href="/privacy" className="hover:text-neutral-950 dark:hover:text-white">Privacy</Link>
            <Link href="/changelog" className="hover:text-neutral-950 dark:hover:text-white">Changelog</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function QuickCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <p className="text-xs font-black uppercase tracking-widest text-neutral-500">{title}</p>
      <p className="mt-2 break-words font-mono text-sm font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative mt-4">
      <CodeCopyButton code={code} />
      <pre className="overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-5 pr-14 text-sm leading-6 text-neutral-950 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50"><code>{code}</code></pre>
    </div>
  );
}

function DocsChangelog() {
  return (
    <div className="mt-10 space-y-6">
      {changelog.map((entry) => (
        <section key={entry.version} className="card p-5">
          <p className="text-sm font-black uppercase tracking-widest text-neutral-500">{entry.date}</p>
          <h2 className="mt-2 text-2xl font-black">{entry.version} - {entry.title}</h2>
          {(["added", "changed", "fixed", "security", "breaking"] as const).map((key) => (
            <div key={key} className="mt-4">
              <h3 className="font-black capitalize">{key === "breaking" ? "Breaking changes" : key}</h3>
              {entry[key].length ? <ul className="mt-2 space-y-1 text-sm text-neutral-700">{entry[key].map((item) => <li key={item}>- {item}</li>)}</ul> : <p className="mt-2 text-sm text-neutral-500">None.</p>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
