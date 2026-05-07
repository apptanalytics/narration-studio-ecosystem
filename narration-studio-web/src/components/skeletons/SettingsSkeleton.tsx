import { Skeleton } from "@/components/ui/skeleton";
import { DashboardFrameSkeleton, PageHeaderSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function SettingsSkeleton() {
  return <DashboardFrameSkeleton><PageHeaderSkeleton /><div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div className="card p-5" key={i}><Skeleton className="h-6 w-40" /><div className="mt-5 space-y-3"><Skeleton className="h-11 rounded-lg" /><Skeleton className="h-11 rounded-lg" /><Skeleton className="h-11 w-36 rounded-lg bg-neutral-900 dark:bg-neutral-700" /></div></div>)}</div></DashboardFrameSkeleton>;
}
