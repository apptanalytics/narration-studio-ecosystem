import { Shell } from "@/components/Shell";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";

export default function ApiKeysPage() {
  return (
    <Shell>
      <h1 className="text-3xl font-black">API Keys</h1>
      <p className="mt-2 text-neutral-600">Create, regenerate, disable, and delete user API keys.</p>
      <div className="mt-6"><ApiKeysPanel /></div>
    </Shell>
  );
}
