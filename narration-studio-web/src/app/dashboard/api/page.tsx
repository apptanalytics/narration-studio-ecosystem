import Link from "next/link";
import { Shell } from "@/components/Shell";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";

export default function ApiPage() {
  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">API</h1>
          <p className="mt-2 text-neutral-600">Usage stats, API keys, request logs, and quick start docs.</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn secondary" href="/docs">Docs</Link>
          <Link className="btn" href="/dashboard/api/playground">Open Playground</Link>
        </div>
      </div>
      <div className="mt-6"><ApiKeysPanel /></div>
    </Shell>
  );
}
