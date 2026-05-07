import { DashboardFrameSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function HistorySkeleton() {
  return <DashboardFrameSkeleton><PageHeaderSkeleton /><TableSkeleton rows={8} columns={4} /></DashboardFrameSkeleton>;
}
