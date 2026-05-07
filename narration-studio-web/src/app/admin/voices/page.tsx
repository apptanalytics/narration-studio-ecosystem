"use client";

import { AdminResourcePage } from "@/components/AdminResourcePage";
import { AdminShell } from "@/components/AdminShell";
import { adminPages } from "@/lib/adminData";

export default function AdminVoicesPage() {
  return (
    <AdminShell>
      <AdminResourcePage config={adminPages.voices} />
    </AdminShell>
  );
}
