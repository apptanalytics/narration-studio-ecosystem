import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton, TopNavSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function PricingSkeleton() {
  return <main className="min-h-screen bg-neutral-100 dark:bg-neutral-950"><TopNavSkeleton /><section className="mx-auto max-w-7xl p-4 py-10 sm:p-6"><div className="mx-auto mb-8 max-w-2xl text-center"><Skeleton className="mx-auto h-11 w-72" /><Skeleton className="mx-auto mt-4 h-5 w-full" /></div><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div className="card p-6" key={i}><Skeleton className="h-6 w-24" /><Skeleton className="mt-5 h-12 w-32" /><div className="mt-6 space-y-3">{Array.from({ length: 6 }).map((__, j) => <Skeleton key={j} className="h-4 w-full" />)}</div><Skeleton className="mt-6 h-11 rounded-lg" /></div>)}</div><div className="mt-8"><TableSkeleton rows={5} columns={4} /></div></section></main>;
}
