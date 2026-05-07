"use client";

import { AdminShell } from "@/components/AdminShell";
import { AdminResourcePage } from "@/components/AdminResourcePage";
import { adminPages } from "@/lib/adminData";

export default function AdminApiAccessPage() {
  return (
    <AdminShell>
      <AdminResourcePage config={adminPages["api-access"]} />
    </AdminShell>
  );
}
