import { DashboardFrameSkeleton, PageHeaderSkeleton } from "@/components/skeletons/SkeletonLayouts";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationsSkeleton() {
  return <DashboardFrameSkeleton><PageHeaderSkeleton /> <div className="card divide-y divide-neutral-100">{Array.from({ length: 7 }).map((_, i) => <div className="flex gap-4 p-4" key={i}><Skeleton className="h-10 w-10 rounded-lg" /><div className="flex-1"><Skeleton className="h-5 w-56" /><Skeleton className="mt-2 h-4 w-full" /></div></div>)}</div></DashboardFrameSkeleton>;
}
