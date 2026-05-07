"use client";

import { AdminResourcePage } from "@/components/AdminResourcePage";
import { AdminShell } from "@/components/AdminShell";
import { adminPages } from "@/lib/adminData";

export default function AdminVoiceClonesPage() {
  return (
    <AdminShell>
      <AdminResourcePage config={adminPages["voice-clones"]} />
    </AdminShell>
  );
}
