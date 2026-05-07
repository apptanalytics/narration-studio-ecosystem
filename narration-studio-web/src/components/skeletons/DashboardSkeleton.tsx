import { DashboardFrameSkeleton, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function DashboardSkeleton() {
  return <DashboardFrameSkeleton><PageHeaderSkeleton wide /><StatCardsSkeleton /><div className="mt-6"><TableSkeleton /></div></DashboardFrameSkeleton>;
}
