import { Skeleton } from "@/components/ui/skeleton";
import { DashboardFrameSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function VoiceCloningSkeleton() {
  return <DashboardFrameSkeleton><PageHeaderSkeleton /><div className="grid gap-4 lg:grid-cols-[1fr_360px]"><div className="card p-5"><Skeleton className="h-6 w-44" /><Skeleton className="mt-4 h-40 rounded-lg" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><Skeleton className="h-11 rounded-lg" /><Skeleton className="h-11 rounded-lg" /></div><Skeleton className="mt-4 h-11 w-40 rounded-lg bg-neutral-900 dark:bg-neutral-700" /></div><div className="card p-5"><Skeleton className="h-6 w-40" /><Skeleton className="mt-4 h-32 rounded-lg" /></div></div><div className="mt-6"><TableSkeleton rows={4} columns={4} /></div></DashboardFrameSkeleton>;
}
