"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Loader2, Plus, Save, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { ActionModal } from "@/components/ActionModal";
import type { AdminPageConfig, AdminRow } from "@/lib/adminData";

function cellValue(row: AdminRow, key: string) {
  const value = row[key];
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function normalizeRow(config: AdminPageConfig, row: AdminRow): AdminRow {
  if (config.title !== "Users") return row;
  return {
    ...row,
    name: row.name || row.full_name || row.email || "-",
    role: row.role || "user",
    plan: row.plan || (row.role === "admin" || row.role === "super_admin" ? "Studio Max" : "Free"),
    credits: row.credits || (row.role === "admin" || row.role === "super_admin" ? "600,000" : "5,000"),
    apiAccess: row.apiAccess || row.api_access || "Enabled",
    voiceClones: row.voiceClones || row.voice_clones || (row.role === "admin" || row.role === "super_admin" ? "Unlimited" : "5"),
    status: row.status || (row.is_active === false ? "Suspended" : "Active"),
    createdAt: row.createdAt || row.created_at || "-",
    lastLogin: row.lastLogin || row.last_login_at || "-",
  };
}

function unwrapAdminData(data: unknown): Record<string, unknown> | unknown[] {
  if (typeof data === "object" && data && "success" in data && "data" in data) {
    const wrapped = data as { data: Record<string, unknown> | unknown[] };
    return wrapped.data;
  }
  return data as Record<string, unknown> | unknown[];
}

function rowsFromResponse(data: unknown) {
  const payload = unwrapAdminData(data);
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const objectPayload = payload as Record<string, unknown>;
  return objectPayload.items || objectPayload.users || objectPayload.plans || objectPayload.voices || objectPayload.logs || objectPayload.purchases || objectPayload.api_keys || objectPayload.webhooks || [];
}

function editableColumns(config: AdminPageConfig) {
  return config.columns.filter((column) => !["createdAt", "created_at", "lastLogin", "last_login_at", "id"].includes(column.key));
}

function endpointForRow(config: AdminPageConfig, row?: AdminRow) {
  const id = row?.id ?? row?.slug ?? row?.email ?? row?.name;
  return id ? `${config.endpoint}/${encodeURIComponent(String(id))}` : config.endpoint;
}

function missingEndpoint(endpoint: string) {
  return `Backend endpoint missing: ${endpoint}`;
}

export function AdminResourcePage({ config }: { config: AdminPageConfig }) {
  const [rows, setRows] = useState<AdminRow[]>(config.rows);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | "action" | null>(null);
  const [selectedRow, setSelectedRow] = useState<AdminRow | null>(null);
  const [draft, setDraft] = useState<AdminRow>({});
  const [actionLabel, setActionLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [backendMessage, setBackendMessage] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(config.endpoint, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Endpoint not ready");
        const data = await response.json();
        const values = rowsFromResponse(data);
        if (active && Array.isArray(values) && values.length) setRows((values as AdminRow[]).map((row) => normalizeRow(config, row)));
      })
      .catch(() => {
        if (active) setRows(config.rows.map((row) => normalizeRow(config, row)));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [config]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const normalizedRows = rows.map((row) => normalizeRow(config, row));
    if (!needle) return normalizedRows;
    return normalizedRows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }, [config, query, rows]);

  function openCreate() {
    const next: AdminRow = {};
    editableColumns(config).forEach((column) => {
      next[column.key] = "";
    });
    setDraft(next);
    setSelectedRow(null);
    setBackendMessage("");
    setModal("create");
  }

  function openEdit(row: AdminRow) {
    setSelectedRow(row);
    setDraft({ ...row });
    setBackendMessage("");
    setModal("edit");
  }

  function openAction(action: string) {
    setActionLabel(action);
    setDraft({});
    setBackendMessage("");
    setModal("action");
  }

  async function submitDraft() {
    const endpoint = modal === "create" ? config.endpoint : endpointForRow(config, selectedRow || undefined);
    const method = modal === "create" ? "POST" : "PATCH";
    setSaving(true);
    setBackendMessage("");
    try {
      const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error(response.status === 404 ? missingEndpoint(endpoint) : await response.text());
      toast.success(modal === "create" ? "Created." : "Saved.");
      if (modal === "create") setRows((current) => [draft, ...current]);
      if (modal === "edit" && selectedRow) {
        const key = String(selectedRow.id ?? selectedRow.email ?? selectedRow.name);
        setRows((current) => current.map((row) => String(row.id ?? row.email ?? row.name) === key ? { ...row, ...draft } : row));
      }
      setModal(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : missingEndpoint(endpoint);
      setBackendMessage(message || missingEndpoint(endpoint));
      toast.error(message || missingEndpoint(endpoint));
    } finally {
      setSaving(false);
    }
  }

  async function submitAction() {
    const slug = actionLabel.toLowerCase().replaceAll(" / ", "-").replaceAll(" ", "-");
    const endpoint = `${config.endpoint}/${slug}`;
    setSaving(true);
    setBackendMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error(response.status === 404 ? missingEndpoint(endpoint) : await response.text());
      toast.success(`${actionLabel} submitted.`);
      setModal(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : missingEndpoint(endpoint);
      setBackendMessage(message || missingEndpoint(endpoint));
      toast.error(message || missingEndpoint(endpoint));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{config.title}</h1>
          <p className="mt-2 max-w-3xl text-neutral-600">{config.description}</p>
        </div>
        <button
          className="btn"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          {config.primaryAction}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {config.statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <Icon className="h-5 w-5 text-neutral-500" />
            <p className="mt-4 text-sm font-semibold text-neutral-500">{label}</p>
            <p className="mt-1 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              className="field pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search admin records"
            />
          </div>
          <div className="text-sm font-semibold text-neutral-500">
            {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading API</span> : `${filteredRows.length} records`}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                {config.columns.map((column) => (
                  <th key={column.key} className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-neutral-500">
                    {column.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={String(row.id ?? row.email ?? row.name ?? index)} className="border-b border-neutral-100 last:border-0">
                  {config.columns.map((column) => (
                    <td key={column.key} className="px-3 py-3 font-medium text-neutral-700">
                      {cellValue(row, column.key)}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right">
                    {config.title === "Users" && row.email ? (
                      <Link href={`/admin/users/${encodeURIComponent(String(row.id ?? row.email))}`} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold hover:bg-neutral-100">
                        View/Edit
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold hover:bg-neutral-100" onClick={() => openEdit(row)}>
                        Manage
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {config.actions.map((action) => (
          <button
            key={action}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left text-sm font-bold shadow-sm hover:bg-neutral-50"
            onClick={() => openAction(action)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-white">
              <Check className="h-4 w-4" />
            </span>
            {action}
          </button>
        ))}
      </div>

      {modal === "create" || modal === "edit" ? (
        <ActionModal
          title={modal === "create" ? config.primaryAction : `Manage ${String(selectedRow?.name ?? selectedRow?.email ?? selectedRow?.id ?? config.title)}`}
          description={modal === "create" ? `Create a record through ${config.endpoint}.` : `Update this record through ${endpointForRow(config, selectedRow || undefined)}.`}
          onClose={() => setModal(null)}
          footer={<><button className="btn secondary" onClick={() => setModal(null)}><X className="h-4 w-4" /> Cancel</button><button className="btn" onClick={() => void submitDraft()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</button></>}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {editableColumns(config).map((column) => (
              <label key={column.key} className="space-y-2 text-sm font-bold">
                {column.label}
                <input
                  className="field"
                  value={String(draft[column.key] ?? "")}
                  onChange={(event) => setDraft((current) => ({ ...current, [column.key]: event.target.value }))}
                />
              </label>
            ))}
          </div>
          {backendMessage ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">{backendMessage}</p> : null}
        </ActionModal>
      ) : null}

      {modal === "action" ? (
        <ActionModal
          title={actionLabel}
          description={`Submit this action through ${config.endpoint}/${actionLabel.toLowerCase().replaceAll(" / ", "-").replaceAll(" ", "-")}.`}
          onClose={() => setModal(null)}
          footer={<><button className="btn secondary" onClick={() => setModal(null)}><X className="h-4 w-4" /> Cancel</button><button className="btn" onClick={() => void submitAction()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />} Submit</button></>}
        >
          <label className="space-y-2 text-sm font-bold">
            Note / value
            <textarea className="field min-h-28" value={String(draft.note ?? "")} onChange={(event) => setDraft({ note: event.target.value })} placeholder="Enter details for this admin action" />
          </label>
          {backendMessage ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">{backendMessage}</p> : null}
        </ActionModal>
      ) : null}
    </div>
  );
}
