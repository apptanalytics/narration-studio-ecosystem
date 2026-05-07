import { Shell } from "@/components/Shell";

export default function ApiSettingsPage() {
  return (
    <Shell>
      <h1 className="text-3xl font-black">API Settings</h1>
      <p className="mt-2 text-neutral-600">Configure CORS origins, allowed IPs, methods, and headers per API key from the API Keys page.</p>
      <div className="card mt-6 p-5">
        <h2 className="text-xl font-bold">Security defaults</h2>
        <ul className="mt-4 space-y-2 text-sm text-neutral-600">
          <li>Use allowed origins for browser apps.</li>
          <li>Use allowed IPs for server apps.</li>
          <li>Regenerate exposed tokens immediately.</li>
        </ul>
      </div>
    </Shell>
  );
}
