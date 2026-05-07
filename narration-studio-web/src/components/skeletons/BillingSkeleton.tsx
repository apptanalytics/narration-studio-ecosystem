import { Skeleton } from "@/components/ui/skeleton";
import { DashboardFrameSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function BillingSkeleton() {
  return <DashboardFrameSkeleton><PageHeaderSkeleton /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div className="card p-5" key={i}><Skeleton className="h-6 w-24" /><Skeleton className="mt-4 h-10 w-28" /><Skeleton className="mt-5 h-28" /></div>)}</div><div className="mt-6"><TableSkeleton rows={4} columns={4} /></div></DashboardFrameSkeleton>;
}
