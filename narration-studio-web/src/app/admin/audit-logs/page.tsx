"use client";

import { AdminResourcePage } from "@/components/AdminResourcePage";
import { AdminShell } from "@/components/AdminShell";
import { adminPages } from "@/lib/adminData";

export default function AdminAuditLogsPage() {
  return (
    <AdminShell>
      <AdminResourcePage config={adminPages["audit-logs"]} />
    </AdminShell>
  );
}
