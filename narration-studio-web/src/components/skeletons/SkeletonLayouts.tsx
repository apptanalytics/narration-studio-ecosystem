import { Skeleton } from "@/components/ui/skeleton";

export function TopNavSkeleton() {
  return (
    <header className="border-b border-neutral-200 bg-white/90 px-4 py-3 dark:bg-neutral-900/90">
      <div className="mx-auto flex max-w-7xl items-center gap-4">
        <Skeleton className="h-7 w-40" />
        <div className="ml-auto hidden gap-3 md:flex">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </header>
  );
}

export function SidebarSkeleton({ admin = false }: { admin?: boolean }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-neutral-200 bg-white p-4 dark:bg-neutral-900 md:block">
      <Skeleton className="mb-8 h-8 w-40" />
      <div className="space-y-2">
        {Array.from({ length: admin ? 13 : 9 }).map((_, index) => (
          <Skeleton key={index} className="h-10 rounded-lg" />
        ))}
      </div>
    </aside>
  );
}

export function PageHeaderSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className={wide ? "h-10 w-80 max-w-full" : "h-10 w-56 max-w-full"} />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card p-5">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="mt-4 h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:bg-neutral-900">
      <div className="grid gap-3 border-b border-neutral-100 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => <Skeleton key={index} className="h-4" />)}
      </div>
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="grid gap-3 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, col) => <Skeleton key={col} className="h-6" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthSkeleton({ register = false }: { register?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-4 dark:bg-neutral-950">
      <div className="card w-full max-w-md p-6">
        <Skeleton className="mx-auto h-9 w-52" />
        <Skeleton className="mx-auto mt-3 h-4 w-72 max-w-full" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-11 rounded-lg" />
          {register ? <Skeleton className="h-11 rounded-lg" /> : null}
          {register ? <Skeleton className="h-11 rounded-lg" /> : null}
          <Skeleton className="h-11 rounded-lg bg-neutral-900 dark:bg-neutral-700" />
          <Skeleton className="h-11 rounded-lg" />
        </div>
      </div>
    </main>
  );
}

export function DashboardFrameSkeleton({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  return (
    <main className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <SidebarSkeleton admin={admin} />
      <div className="md:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 dark:bg-neutral-900/90">
          <Skeleton className="h-6 w-44" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </header>
        <section className="mx-auto max-w-7xl p-4 sm:p-6">{children}</section>
      </div>
    </main>
  );
}
