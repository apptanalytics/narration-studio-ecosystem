import { Skeleton } from "@/components/ui/skeleton";
import { DashboardFrameSkeleton, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function AdminUserDetailSkeleton() {
  return <DashboardFrameSkeleton admin><PageHeaderSkeleton wide /><StatCardsSkeleton /><div className="mt-6 flex gap-2 overflow-hidden">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-lg" />)}</div><div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]"><div className="card p-5"><Skeleton className="h-6 w-40" /><div className="mt-5 grid gap-3 sm:grid-cols-2"><Skeleton className="h-11 rounded-lg" /><Skeleton className="h-11 rounded-lg" /><Skeleton className="h-11 rounded-lg" /><Skeleton className="h-11 rounded-lg" /></div></div><div className="card p-5"><Skeleton className="h-6 w-36" /><Skeleton className="mt-4 h-36 rounded-lg" /></div></div><div className="mt-6"><TableSkeleton rows={5} columns={5} /></div></DashboardFrameSkeleton>;
}
