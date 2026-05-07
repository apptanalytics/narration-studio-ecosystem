import { AdminShell } from "@/components/AdminShell";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";

export default function AdminApiKeysPage() {
  return (
    <AdminShell>
      <h1 className="text-3xl font-black">Admin API Keys</h1>
      <p className="mt-2 text-neutral-600">View, search, enable, disable, regenerate, and delete all API keys.</p>
      <div className="mt-6"><ApiKeysPanel admin /></div>
    </AdminShell>
  );
}
