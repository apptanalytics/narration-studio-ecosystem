import { AdminShell } from "@/components/AdminShell";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";

export default function AdminApiLogsPage() {
  return (
    <AdminShell>
      <h1 className="text-3xl font-black">Admin API Logs</h1>
      <p className="mt-2 text-neutral-600">All API request logs across users and keys.</p>
      <div className="mt-6"><ApiKeysPanel admin /></div>
    </AdminShell>
  );
}
