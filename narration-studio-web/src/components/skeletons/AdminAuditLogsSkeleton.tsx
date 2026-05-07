import { DashboardFrameSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons/SkeletonLayouts";

export function AdminAuditLogsSkeleton() {
  return <DashboardFrameSkeleton admin><PageHeaderSkeleton /><TableSkeleton rows={10} columns={5} /></DashboardFrameSkeleton>;
}
