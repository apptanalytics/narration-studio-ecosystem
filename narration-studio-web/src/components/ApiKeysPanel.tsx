"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import type { ApiKey, ApiLog, ApiUsage, Visitor } from "@/lib/types";

type ApiKeysPanelProps = {
  admin?: boolean;
};

const emptyUsage: ApiUsage = { requests_used: 0, credits_used: 0, successful_requests: 0, failed_requests: 0 };

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function dateLabel(value?: number | null) {
  return value ? new Date(value * 1000).toLocaleString() : "Never";
}

export function ApiKeysPanel({ admin = false }: ApiKeysPanelProps) {
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [usage, setUsage] = useState<ApiUsage>(emptyUsage);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [token, setToken] = useState("");
  const [form, setForm] = useState({
    name: "Website key",
    allowed_origins: "http://localhost:3000",
    allowed_methods: "GET, POST",
    allowed_headers: "Authorization, Content-Type",
    allowed_ips: "",
    monthly_request_limit: "",
    machine_name: "",
    enabled: true,
  });

  async function load() {
    setLoading(true);
    try {
      api.visitor().then(setVisitor).catch(() => undefined);
      if (admin) {
        const [keyData, logData] = await Promise.all([
          api.adminApiKeys().catch(() => ({ api_keys: [] })),
          api.adminApiLogs().catch(() => ({ logs: [] })),
        ]);
        setKeys(keyData.api_keys || []);
        setLogs(logData.logs || []);
      } else {
        const [keyData, logData, usageData] = await Promise.all([
          api.userApiKeys().catch(() => ({ api_keys: [] })),
          api.userApiLogs().catch(() => ({ logs: [] })),
          api.userApiUsage().catch(() => emptyUsage),
        ]);
        setKeys(keyData.api_keys || []);
        setLogs(logData.logs || []);
        setUsage(usageData || emptyUsage);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [admin]);

  const isUltimate = Boolean(visitor?.admin_allowed || visitor?.ultimate_clone_allowed || visitor?.auth_user?.role === "admin");
  const successRate = useMemo(() => {
    const total = usage.successful_requests + usage.failed_requests;
    return total ? Math.round((usage.successful_requests / total) * 100) : 100;
  }, [usage.failed_requests, usage.successful_requests]);
  const requestsToday = logs.filter((log) => new Date(log.created_at * 1000).toDateString() === new Date().toDateString()).length;

  async function createKey() {
    try {
      const body = {
        name: form.name,
        allowed_origins: splitList(form.allowed_origins),
        allowed_methods: splitList(form.allowed_methods).map((item) => item.toUpperCase()),
        allowed_headers: splitList(form.allowed_headers),
        allowed_ips: splitList(form.allowed_ips),
        machine_name: form.machine_name || null,
        monthly_request_limit: form.monthly_request_limit ? Number(form.monthly_request_limit) : null,
        enabled: form.enabled,
      };
      const created = admin ? await api.createAdminApiKey(body) : await api.createUserApiKey(body);
      setToken(created.token || "");
      toast.success("API key created. Copy the token now.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create API key.");
    }
  }

  async function regenerateKey(key: ApiKey) {
    if (!window.confirm(`Regenerate ${key.name}? The old token will stop working.`)) return;
    try {
      const updated = admin ? await api.regenerateAdminApiKey(key.id) : await api.regenerateUserApiKey(key.id);
      setToken(updated.token || "");
      toast.success("API key regenerated. Copy the token now.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Regenerate unavailable.");
    }
  }

  async function toggleKey(key: ApiKey) {
    try {
      const body = { enabled: !key.enabled };
      if (admin) await api.patchAdminApiKey(key.id, body);
      else await api.patchUserApiKey(key.id, body);
      await load();
    } catch {
      toast.error("Could not update API key.");
    }
  }

  async function deleteKey(key: ApiKey) {
    if (!window.confirm(`Delete ${key.name}?`)) return;
    try {
      if (admin) await api.deleteAdminApiKey(key.id);
      else await api.deleteUserApiKey(key.id);
      toast.success("API key deleted.");
      await load();
    } catch {
      toast.error("Could not delete API key.");
    }
  }

  const stats = [
    ["Requests today", requestsToday],
    ["Requests this month", usage.requests_used || logs.length],
    ["Monthly limit", isUltimate ? "Unlimited" : "500"],
    ["Success rate", `${successRate}%`],
    ["Credits used", usage.credits_used],
  ];

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-sm font-semibold text-neutral-500">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">API Keys</h2>
          <p className="mt-1 text-sm text-neutral-600">{admin ? "Manage every API key." : "Create restricted keys for apps and servers."}</p>
        </div>
        <button className="btn" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Create key</button>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-neutral-200 text-left text-neutral-500">
            <tr>
              {["Name", "Prefix", "Status", "Allowed origins", "Allowed IPs", "Methods", "Created", "Last used", "Actions"].map((head) => <th key={head} className="p-3">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="p-5" colSpan={9}><Loader2 className="h-4 w-4 animate-spin" /></td></tr> : null}
            {!loading && keys.length === 0 ? <tr><td className="p-5 text-neutral-600" colSpan={9}>No API keys yet.</td></tr> : null}
            {keys.map((key) => (
              <tr key={key.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3 font-bold">{key.name}<span className="block text-xs font-normal text-neutral-500">{key.machine_name || key.user_email || ""}</span></td>
                <td className="p-3 font-mono">{key.token_prefix}...</td>
                <td className="p-3"><button onClick={() => toggleKey(key)} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold">{key.enabled ? "enabled" : "disabled"}</button></td>
                <td className="p-3">{(key.allowed_origins || []).join(", ") || "Any"}</td>
                <td className="p-3">{(key.allowed_ips || []).join(", ") || "Any"}</td>
                <td className="p-3">{(key.allowed_methods || ["GET", "POST"]).join(", ")}</td>
                <td className="p-3">{dateLabel(key.created_at)}</td>
                <td className="p-3">{dateLabel(key.last_used_at)}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button className="btn secondary" onClick={() => regenerateKey(key)} title="Regenerate"><RefreshCw className="h-4 w-4" /></button>
                    <button className="btn secondary" onClick={() => deleteKey(key)} title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-black">Request Logs</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-neutral-200 text-left text-neutral-500">
              <tr>{["Time", "Key", "Endpoint", "Method", "Status", "IP", "Origin", "Credits", "Error"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
            </thead>
            <tbody>
              {logs.length === 0 ? <tr><td colSpan={9} className="p-5 text-neutral-600">No request logs yet.</td></tr> : null}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-neutral-100 last:border-0">
                  <td className="p-3">{dateLabel(log.created_at)}</td>
                  <td className="p-3 font-mono">{log.key}</td>
                  <td className="p-3">{log.endpoint}</td>
                  <td className="p-3">{log.method}</td>
                  <td className="p-3">{log.status_code}</td>
                  <td className="p-3">{log.ip_address}</td>
                  <td className="p-3">{log.origin || "-"}</td>
                  <td className="p-3">{log.credits_used || 0}</td>
                  <td className="p-3">{log.error_code || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-black">Create API Key</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label>Key name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Allowed Origins</Label><Input value={form.allowed_origins} onChange={(e) => setForm({ ...form, allowed_origins: e.target.value })} /></div>
              <div className="space-y-2"><Label>Allowed Methods</Label><Input value={form.allowed_methods} onChange={(e) => setForm({ ...form, allowed_methods: e.target.value })} /></div>
              <div className="space-y-2"><Label>Allowed Headers</Label><Input value={form.allowed_headers} onChange={(e) => setForm({ ...form, allowed_headers: e.target.value })} /></div>
              <div className="space-y-2"><Label>Allowed IPs</Label><Input value={form.allowed_ips} onChange={(e) => setForm({ ...form, allowed_ips: e.target.value })} /></div>
              <div className="space-y-2"><Label>Monthly request limit</Label><Input value={form.monthly_request_limit} onChange={(e) => setForm({ ...form, monthly_request_limit: e.target.value })} placeholder="Unlimited" type="number" /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Machine/device name</Label><Input value={form.machine_name} onChange={(e) => setForm({ ...form, machine_name: e.target.value })} /></div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 sm:col-span-2"><Label>Enabled</Label><Switch checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} /></div>
              {token ? (
                <div className="rounded-xl bg-neutral-100 p-3 sm:col-span-2">
                  <p className="text-xs font-bold text-neutral-500">Copy this token now. It is shown once.</p>
                  <div className="mt-2 flex gap-2">
                    <code className="flex-1 break-all text-xs">{token}</code>
                    <button className="btn secondary" onClick={() => navigator.clipboard.writeText(token)}><Copy className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button className="btn secondary" onClick={() => setModalOpen(false)}>Close</button>
              <button className="btn" onClick={createKey}><KeyRound className="h-4 w-4" /> Create</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
