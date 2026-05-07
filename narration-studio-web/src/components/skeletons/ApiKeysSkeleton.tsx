import { DashboardFrameSkeleton, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function ApiKeysSkeleton() {
  return <DashboardFrameSkeleton><PageHeaderSkeleton /><StatCardsSkeleton count={4} /><div className="mt-6"><TableSkeleton rows={5} columns={5} /></div><div className="mt-6"><TableSkeleton rows={4} columns={6} /></div></DashboardFrameSkeleton>;
}
