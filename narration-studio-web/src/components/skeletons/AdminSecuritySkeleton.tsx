import { DashboardFrameSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminSecuritySkeleton() {
  return <DashboardFrameSkeleton admin><PageHeaderSkeleton /><div className="grid gap-4 lg:grid-cols-[420px_1fr]"><div className="card p-5"><Skeleton className="h-6 w-44" />{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="mt-4 h-11 rounded-lg" />)}<Skeleton className="mt-4 h-11 w-32 rounded-lg bg-neutral-900 dark:bg-neutral-700" /></div><TableSkeleton rows={8} columns={4} /></div></DashboardFrameSkeleton>;
}
