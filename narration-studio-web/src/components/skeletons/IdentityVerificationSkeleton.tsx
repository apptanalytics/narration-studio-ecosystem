import { Skeleton } from "@/components/ui/skeleton";
import { DashboardFrameSkeleton, PageHeaderSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function IdentityVerificationSkeleton() {
  return <DashboardFrameSkeleton><PageHeaderSkeleton /><div className="grid gap-4 lg:grid-cols-3"><div className="card p-5 lg:col-span-2"><Skeleton className="h-6 w-52" /><div className="mt-5 grid gap-4 sm:grid-cols-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div><Skeleton className="mt-5 h-11 w-40 rounded-lg bg-neutral-900 dark:bg-neutral-700" /></div><div className="card p-5"><Skeleton className="h-6 w-32" /><Skeleton className="mt-5 h-28 rounded-lg" /></div></div></DashboardFrameSkeleton>;
}
