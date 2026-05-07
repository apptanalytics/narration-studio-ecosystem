"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

function userLabel(user: AuthUser) {
  return user.name || user.full_name || user.email;
}

function badgeClass(kind: "role" | "status" | "plan" | "api" | "verified", value?: string | boolean | null) {
  const text = String(value ?? "").toLowerCase();
  if (kind === "role" && (text === "admin" || text === "super_admin")) return "border-violet-200 bg-violet-50 text-violet-800";
  if (kind === "status" && text === "active") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (kind === "status" && ["suspended", "disabled", "banned", "rejected"].includes(text)) return "border-red-200 bg-red-50 text-red-800";
  if (kind === "api" && value) return "border-sky-200 bg-sky-50 text-sky-800";
  if (kind === "verified" && value) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (kind === "plan") return "border-neutral-200 bg-white text-neutral-800";
  return "border-neutral-200 bg-neutral-100 text-neutral-600";
}

function Badge({ kind, children, value }: { kind: "role" | "status" | "plan" | "api" | "verified"; children: React.ReactNode; value?: string | boolean | null }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${badgeClass(kind, value)}`}>{children}</span>;
}

function creditsSummary(user: AuthUser) {
  const total = Number(user.credits_total || 0);
  const used = Number(user.credits_used || 0);
  return `${Math.max(0, total - used).toLocaleString()} / ${total.toLocaleString()}`;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.adminUsers();
      setUsers(data.users || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load admin users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => `${userLabel(user)} ${user.email} ${user.role} ${user.status} ${user.plan?.name || ""}`.toLowerCase().includes(needle));
  }, [query, users]);

  async function deleteUser(user: AuthUser) {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    const id = String(user.id);
    setSavingId(id);
    try {
      await api.adminDeleteUser(id);
      setUsers((items) => items.filter((item) => String(item.id) !== id));
      toast.success("User deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete user.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Users</h1>
          <p className="mt-2 max-w-3xl text-neutral-600">Scan account state quickly. Open a user profile to edit roles, plans, credits, API access, verification, and security settings.</p>
        </div>
        <button className="btn secondary" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Refresh Users
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5"><p className="text-sm font-semibold text-neutral-500">Total Users</p><p className="mt-2 text-3xl font-black">{users.length}</p></div>
        <div className="card p-5"><p className="text-sm font-semibold text-neutral-500">Pending</p><p className="mt-2 text-3xl font-black">{users.filter((user) => user.status === "pending").length}</p></div>
        <div className="card p-5"><p className="text-sm font-semibold text-neutral-500">Admins</p><p className="mt-2 text-3xl font-black">{users.filter((user) => user.role === "admin" || user.role === "super_admin").length}</p></div>
        <div className="card p-5"><p className="text-sm font-semibold text-neutral-500">API Enabled</p><p className="mt-2 text-3xl font-black">{users.filter((user) => user.api_access_enabled).length}</p></div>
      </div>

      <div className="card mt-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" />
          </div>
          <p className="text-sm font-semibold text-neutral-500">{loading ? "Loading..." : `${filtered.length} users`}</p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs font-black uppercase text-neutral-500">
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Credits</th>
                <th className="p-3">API</th>
                <th className="p-3">Voice Limit</th>
                <th className="p-3">Verified</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const id = String(user.id);
                const busy = savingId === id;
                return (
                  <tr key={id} className="border-b border-neutral-100 align-top last:border-0">
                    <td className="p-3">
                      <Link href={`/user/${id}`} className="font-black text-neutral-950 hover:underline">{userLabel(user)}</Link>
                      <p className="mt-1 text-xs text-neutral-500">{user.email}</p>
                    </td>
                    <td className="p-3">
                      <Badge kind="role" value={user.role}>{user.role || "user"}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge kind="status" value={user.status}>{user.status || "pending"}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge kind="plan" value={user.plan?.name}>{user.plan?.name || "No plan"}</Badge>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-neutral-900">{creditsSummary(user)}</p>
                      <p className="mt-1 text-xs text-neutral-500">remaining / total</p>
                    </td>
                    <td className="p-3">
                      <Badge kind="api" value={user.api_access_enabled}>{user.api_access_enabled ? "Enabled" : "Disabled"}</Badge>
                    </td>
                    <td className="p-3">
                      <span className="font-bold">{Number(user.voice_clones_used || 0)} / {Number(user.voice_clone_limit || 0)}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge kind="verified" value={user.email_verified}>Email {user.email_verified ? "Yes" : "No"}</Badge>
                        <Badge kind="verified" value={user.admin_verified}>Admin {user.admin_verified ? "Yes" : "No"}</Badge>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Link className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100" href={`/user/${id}`} title="View / edit user"><Eye className="h-4 w-4" /></Link>
                        <button className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50 disabled:opacity-50" onClick={() => void deleteUser(user)} disabled={busy} title="Delete user"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
