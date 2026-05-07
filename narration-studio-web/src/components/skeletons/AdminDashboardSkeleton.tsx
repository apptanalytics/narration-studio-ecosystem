import { DashboardFrameSkeleton, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function AdminDashboardSkeleton() {
  return <DashboardFrameSkeleton admin><PageHeaderSkeleton wide /><StatCardsSkeleton /><div className="mt-6 grid gap-4 lg:grid-cols-2"><TableSkeleton rows={5} columns={4} /><TableSkeleton rows={5} columns={3} /></div></DashboardFrameSkeleton>;
}
