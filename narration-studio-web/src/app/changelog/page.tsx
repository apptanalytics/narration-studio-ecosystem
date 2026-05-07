import Link from "next/link";
import { changelog } from "@/content/changelog";

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-950 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white/90 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-lg font-black">Narration Studio</Link>
          <nav className="flex items-center gap-5 text-sm font-bold text-neutral-600">
            <Link href="/docs/v1/changelog">Docs changelog</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/dashboard/studio">Dashboard</Link>
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <p className="text-sm font-black uppercase tracking-widest text-neutral-500">Release history</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Changelog</h1>
        <p className="mt-4 text-lg text-neutral-600">Narration Studio product and API changes.</p>
        <div className="mt-10 space-y-6">
          {changelog.map((entry) => (
            <article key={entry.version} className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-neutral-500">{entry.date}</p>
                  <h2 className="mt-2 text-2xl font-black">{entry.version} - {entry.title}</h2>
                </div>
                <Link href={`/docs/v1/changelog`} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-bold">View docs</Link>
              </div>
              {(["added", "changed", "fixed", "security", "breaking"] as const).map((key) => (
                <section key={key} className="mt-5">
                  <h3 className="font-black capitalize">{key === "breaking" ? "Breaking changes" : key}</h3>
                  {entry[key].length ? <ul className="mt-2 space-y-1 text-sm text-neutral-700">{entry[key].map((item) => <li key={item}>- {item}</li>)}</ul> : <p className="mt-2 text-sm text-neutral-500">None.</p>}
                </section>
              ))}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
