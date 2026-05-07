import { DashboardFrameSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";
import { Skeleton } from "@/components/ui/skeleton";

export function SecuritySkeleton() {
  return <DashboardFrameSkeleton><PageHeaderSkeleton /><div className="grid gap-4 lg:grid-cols-2"><div className="card p-5"><Skeleton className="h-6 w-40" />{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mt-4 h-10 rounded-lg" />)}</div><TableSkeleton rows={6} columns={3} /></div></DashboardFrameSkeleton>;
}
