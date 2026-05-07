import { Skeleton } from "@/components/ui/skeleton";
import { TopNavSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function LandingSkeleton() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <TopNavSkeleton />
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_460px]">
        <div className="space-y-6">
          <Skeleton className="h-16 w-full max-w-2xl" />
          <Skeleton className="h-16 w-4/5 max-w-xl" />
          <Skeleton className="h-5 w-3/4 max-w-2xl" />
          <Skeleton className="h-5 w-2/3 max-w-xl" />
          <div className="flex gap-3"><Skeleton className="h-11 w-32 rounded-lg" /><Skeleton className="h-11 w-32 rounded-lg" /></div>
        </div>
        <div className="card p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-36 rounded-lg" />
          <Skeleton className="mt-4 h-11 rounded-lg bg-neutral-900 dark:bg-neutral-700" />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div className="card p-5" key={i}><Skeleton className="h-8 w-8" /><Skeleton className="mt-5 h-5 w-32" /><Skeleton className="mt-3 h-4 w-full" /></div>)}</section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div className="card p-5" key={i}><Skeleton className="h-6 w-24" /><Skeleton className="mt-5 h-10 w-28" /><Skeleton className="mt-5 h-32" /></div>)}</section>
    </main>
  );
}
