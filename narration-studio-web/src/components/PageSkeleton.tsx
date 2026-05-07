export function PageSkeleton({ variant = "page" }: { variant?: "page" | "dashboard" | "admin" }) {
  const withSidebar = variant === "dashboard" || variant === "admin";
  const navItems = variant === "admin" ? 13 : 8;

  return (
    <div className="min-h-screen bg-neutral-100">
      {withSidebar ? (
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-neutral-200 bg-white p-4 md:block">
          <div className="mb-8 h-8 w-40 animate-pulse rounded-lg bg-neutral-200" />
          <div className="space-y-2">
            {Array.from({ length: navItems }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-xl bg-neutral-100" />
            ))}
          </div>
        </aside>
      ) : null}
      <div className={withSidebar ? "md:pl-64" : ""}>
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white/90 px-4">
          <div className="h-5 w-44 animate-pulse rounded bg-neutral-200" />
          <div className="h-9 w-32 animate-pulse rounded-xl bg-neutral-100" />
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <div className="mb-8 max-w-3xl space-y-3">
            <div className="h-9 w-64 animate-pulse rounded-lg bg-neutral-200" />
            <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="h-5 w-5 animate-pulse rounded bg-neutral-200" />
                <div className="mt-4 h-4 w-24 animate-pulse rounded bg-neutral-200" />
                <div className="mt-3 h-8 w-20 animate-pulse rounded bg-neutral-200" />
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="h-6 w-40 animate-pulse rounded bg-neutral-200" />
              <div className="h-10 w-32 animate-pulse rounded-xl bg-neutral-100" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_120px]">
                  <div className="h-10 animate-pulse rounded bg-neutral-100" />
                  <div className="h-10 animate-pulse rounded bg-neutral-100" />
                  <div className="h-10 animate-pulse rounded bg-neutral-100" />
                  <div className="h-10 animate-pulse rounded bg-neutral-100" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
