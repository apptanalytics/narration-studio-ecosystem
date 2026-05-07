import { Skeleton } from "@/components/ui/skeleton";
import { DashboardFrameSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function AdminPlansSkeleton() {
  return <DashboardFrameSkeleton admin><PageHeaderSkeleton /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div className="card p-5" key={i}><Skeleton className="h-6 w-28" /><Skeleton className="mt-4 h-10 w-24" /><Skeleton className="mt-4 h-24 rounded-lg" /></div>)}</div><div className="mt-6"><TableSkeleton rows={6} columns={5} /></div></DashboardFrameSkeleton>;
}
