import { DashboardFrameSkeleton, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function AdminVerificationsSkeleton() {
  return <DashboardFrameSkeleton admin><PageHeaderSkeleton /><StatCardsSkeleton count={3} /><div className="mt-6"><TableSkeleton rows={7} columns={5} /></div></DashboardFrameSkeleton>;
}
