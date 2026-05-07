import { Skeleton } from "@/components/ui/skeleton";

export function DocsSkeleton() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="flex w-full items-center gap-3 px-4 py-3 lg:px-6">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="hidden h-5 w-40 sm:block" />
          <Skeleton className="ml-auto hidden h-10 max-w-xl flex-1 rounded-lg md:block" />
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="hidden h-10 w-16 rounded-lg sm:block" />
          <Skeleton className="h-10 w-20 rounded-lg bg-neutral-900 dark:bg-neutral-700" />
        </div>
      </header>

      <section className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="grid w-full gap-6 px-4 py-8 lg:grid-cols-[1fr_360px] lg:px-6 lg:py-10">
          <div>
            <Skeleton className="h-4 w-56" />
            <Skeleton className="mt-4 h-12 w-full max-w-3xl" />
            <Skeleton className="mt-3 h-12 w-4/5 max-w-2xl" />
            <Skeleton className="mt-5 h-5 w-full max-w-3xl" />
            <Skeleton className="mt-2 h-5 w-2/3 max-w-2xl" />
            <div className="mt-6 flex flex-wrap gap-3">
              <Skeleton className="h-11 w-36 rounded-lg bg-neutral-900 dark:bg-neutral-700" />
              <Skeleton className="h-11 w-32 rounded-lg" />
              <Skeleton className="h-11 w-24 rounded-lg" />
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/40">
            <Skeleton className="h-3 w-44" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-5 w-full" />)}
            </div>
          </div>
        </div>
      </section>

      <div className="grid w-full gap-6 px-4 py-8 lg:grid-cols-[260px_minmax(0,1fr)_220px] lg:px-6 xl:grid-cols-[280px_minmax(0,1fr)_240px]">
        <aside className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          {Array.from({ length: 3 }).map((_, group) => (
            <div key={group} className="mb-6 space-y-2">
              <Skeleton className="h-3 w-28" />
              {Array.from({ length: 4 }).map((__, item) => <Skeleton key={item} className="h-9 rounded-lg" />)}
            </div>
          ))}
        </aside>
        <article className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <section key={index} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="mt-4 h-5 w-full" />
              <Skeleton className="mt-2 h-5 w-4/5" />
              {index % 2 === 0 ? <Skeleton className="mt-4 h-56 rounded-xl bg-neutral-900 dark:bg-neutral-800" /> : <Skeleton className="mt-4 h-28 rounded-xl" />}
            </section>
          ))}
        </article>
        <aside className="hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:block">
          <Skeleton className="mb-3 h-3 w-24" />
          {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="mb-2 h-5 w-full" />)}
          <Skeleton className="mt-8 h-px w-full" />
          <Skeleton className="mt-4 h-3 w-20" />
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="mt-2 h-5 w-28" />)}
        </aside>
      </div>
    </main>
  );
}
