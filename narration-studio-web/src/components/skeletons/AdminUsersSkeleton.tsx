import { DashboardFrameSkeleton, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function AdminUsersSkeleton() {
  return <DashboardFrameSkeleton admin><PageHeaderSkeleton /><StatCardsSkeleton count={4} /><div className="mt-6"><TableSkeleton rows={8} columns={6} /></div></DashboardFrameSkeleton>;
}
