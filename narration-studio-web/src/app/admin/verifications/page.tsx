"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Loader2, Search, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import type { VerificationSubmission } from "@/lib/types";

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<VerificationSubmission[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VerificationSubmission | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.adminVerifications();
      setItems(data.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load verifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${item.user || ""} ${item.legal_name} ${item.country} ${item.status}`.toLowerCase().includes(needle));
  }, [items, query]);

  async function action(kind: "approve" | "reject" | "suspicious", item: VerificationSubmission) {
    try {
      if (kind === "approve") await api.approveVerification(item.id);
      if (kind === "reject") {
        const reason = window.prompt("Rejection reason");
        if (!reason) return;
        await api.rejectVerification(item.id, reason);
      }
      if (kind === "suspicious") {
        const note = window.prompt("Internal note");
        await api.suspiciousVerification(item.id, note || "Marked suspicious");
      }
      toast.success("Verification updated.");
      setSelected(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Identity Verifications</h1>
          <p className="mt-2 text-neutral-600">Review submitted identity documents and approve voice clone access for Narration Studio.</p>
        </div>
        <button className="btn secondary" onClick={() => void load()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Refresh</button>
      </div>
      <div className="card mt-6 p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users or status" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
              <tr><th className="p-3">User</th><th className="p-3">Legal Name</th><th className="p-3">Document</th><th className="p-3">Country</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100">
                  <td className="p-3 font-semibold">{item.user || item.user_id}</td>
                  <td className="p-3">{item.legal_name}</td>
                  <td className="p-3">{item.document_type}</td>
                  <td className="p-3">{item.country}</td>
                  <td className="p-3"><span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-bold">{item.status}</span></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100" onClick={() => setSelected(item)} aria-label="Preview"><Eye className="h-4 w-4" /></button>
                      <button className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100" onClick={() => void action("approve", item)} aria-label="Approve"><Check className="h-4 w-4" /></button>
                      <button className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100" onClick={() => void action("reject", item)} aria-label="Reject"><X className="h-4 w-4" /></button>
                      <button className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100" onClick={() => void action("suspicious", item)} aria-label="Suspicious"><ShieldAlert className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-xl font-black">{selected.legal_name}</h2><p className="text-sm text-neutral-500">{selected.user} · {selected.status}</p></div>
              <button className="rounded-lg border border-neutral-200 p-2" onClick={() => setSelected(null)}><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {[
                ["Document front", selected.document_front_url],
                ["Document back", selected.document_back_url],
                ["Selfie", selected.selfie_url],
              ].map(([label, url]) => (
                <div key={label || ""} className="rounded-xl border border-neutral-200 p-3">
                  <p className="mb-2 font-bold">{label}</p>
                  {url ? <iframe className="h-80 w-full rounded-lg bg-neutral-100" src={String(url)} /> : <p className="text-sm text-neutral-500">Not provided.</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
