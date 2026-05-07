"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Check, KeyRound, Loader2, Lock, LogOut, MailCheck, Save, ShieldCheck, Trash2, User, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import { ActionModal } from "@/components/ActionModal";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import type { ActivityLog, ApiKey, AuthUser, PricingPlan, PurchaseRecord, UserSession, VoiceClone } from "@/lib/types";

const tabs = ["Overview", "Credits", "API Access", "Voice Clones", "Purchases", "Security", "Activity Logs", "Sessions", "API Keys"] as const;
const roles = ["user", "admin"];
const statuses = ["pending", "active", "disabled", "rejected"];
type Tab = (typeof tabs)[number];
type ModalKind = "credits" | "api-limit" | "voice-limit" | "security-action" | null;

function endpointMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}

function displayDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function userName(user: AuthUser | null) {
  return user?.name || user?.full_name || user?.email || "User";
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("Overview");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [voiceClones, setVoiceClones] = useState<VoiceClone[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [apiLimit, setApiLimit] = useState(0);
  const [voiceLimit, setVoiceLimit] = useState(0);

  const remainingCredits = useMemo(() => Number(user?.credits_total || 0) - Number(user?.credits_used || 0), [user]);

  function patch(patchUser: Partial<AuthUser>) {
    setUser((current) => current ? { ...current, ...patchUser } : current);
  }

  function addMissing(message: string) {
    setMissing((items) => items.includes(message) ? items : [...items, message]);
  }

  async function loadOptional<T>(loader: () => Promise<T>, apply: (data: T) => void) {
    try {
      apply(await loader());
    } catch (error) {
      addMissing(endpointMessage(error));
    }
  }

  async function load() {
    setLoading(true);
    setMissing([]);
    try {
      const [userData, planData] = await Promise.all([api.adminUser(id), api.adminPlans()]);
      setUser(userData.user);
      setPlans(planData.plans);
      setVoiceLimit(Number(userData.user.voice_clone_limit || 0));
    } catch (error) {
      toast.error(endpointMessage(error));
    }
    await Promise.all([
      loadOptional(() => api.adminUserSessions(id), (data) => setSessions(data.sessions || [])),
      loadOptional(() => api.adminUserApiKeys(id), (data) => setApiKeys(data.api_keys || [])),
      loadOptional(() => api.adminUserVoiceClonesList(id), (data) => setVoiceClones(data.voice_clones || [])),
      loadOptional(() => api.adminUserPurchases(id), (data) => setPurchases(data.purchases || [])),
      loadOptional(() => api.adminUserActivityLogs(id), (data) => setActivityLogs(data.logs || [])),
    ]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function runAction(label: string, action: () => Promise<unknown>, reload = true) {
    setSaving(true);
    try {
      await action();
      toast.success(label);
      if (reload) await load();
    } catch (error) {
      const message = endpointMessage(error);
      toast.error(message);
      addMissing(message);
    } finally {
      setSaving(false);
    }
  }

  async function saveAll() {
    if (!user) return;
    await runAction("User saved.", async () => {
      await api.adminPatchUser(id, { name: user.name || user.full_name, email: user.email, avatar_url: user.avatar_url });
      await api.adminUpdateUserRole(id, user.role || "user");
      await api.adminUpdateUserStatus(id, user.status || "pending");
      await api.adminUpdateUserPlan(id, user.plan_id ? Number(user.plan_id) : null);
      await api.adminUpdateUserCredits(id, Number(user.credits_total || 0), Number(user.credits_used || 0));
      await api.adminUpdateUserApiAccess(id, Boolean(user.api_access_enabled));
      await api.adminUpdateUserVoiceClones(id, Number(user.voice_clone_limit || 0));
    });
  }

  function applyCredit(delta: number) {
    if (!user) return;
    patch({ credits_total: Math.max(0, Number(user.credits_total || 0) + delta) });
    setModal(null);
  }

  function patchPlan(value: string) {
    const planId = Number(value) || null;
    const plan = plans.find((item) => item.id === planId);
    patch({
      plan_id: planId,
      ...(plan ? {
        credits_total: Number(plan.credits || 0),
        api_access_enabled: Boolean(plan.api_access_enabled),
        voice_clone_limit: Number(plan.voice_clone_limit || 0),
      } : {}),
    });
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">User Detail</h1>
          <p className="mt-2 text-neutral-600">Manage profile, credits, API access, voice clones, purchases, security, activity, sessions, and API keys for {userName(user)}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn secondary" onClick={() => void load()} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Refresh</button>
          <button className="btn" onClick={() => void saveAll()} disabled={saving || loading || !user}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save all changes</button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5"><User className="h-5 w-5 text-neutral-500" /><p className="mt-4 text-sm font-semibold text-neutral-500">Role</p><p className="mt-1 text-2xl font-black">{user?.role || "-"}</p></div>
        <div className="card p-5"><WalletCards className="h-5 w-5 text-neutral-500" /><p className="mt-4 text-sm font-semibold text-neutral-500">Credits left</p><p className="mt-1 text-2xl font-black">{remainingCredits.toLocaleString()}</p></div>
        <div className="card p-5"><KeyRound className="h-5 w-5 text-neutral-500" /><p className="mt-4 text-sm font-semibold text-neutral-500">API Access</p><p className="mt-1 text-2xl font-black">{user?.api_access_enabled ? "Enabled" : "Disabled"}</p></div>
        <div className="card p-5"><Lock className="h-5 w-5 text-neutral-500" /><p className="mt-4 text-sm font-semibold text-neutral-500">Status</p><p className="mt-1 text-2xl font-black">{user?.status || "-"}</p></div>
      </div>

      <div className="card mt-6 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${tab === item ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700"}`}>
              {item}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
          {loading ? <div className="flex items-center gap-2 text-sm font-bold text-neutral-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading user</div> : null}
          {!loading && !user ? <p className="text-sm font-bold text-red-700">User not found.</p> : null}

          {user && tab === "Overview" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-4 md:col-span-2">
                <div className="grid h-16 w-16 overflow-hidden rounded-full bg-neutral-950 text-white">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : <User className="m-auto h-7 w-7" />}
                </div>
                <div>
                  <p className="text-xl font-black">{userName(user)}</p>
                  <p className="text-sm text-neutral-500">{user.email}</p>
                </div>
              </div>
              <label className="space-y-2 text-sm font-bold">Name<input className="field" value={user.name || user.full_name || ""} onChange={(event) => patch({ name: event.target.value, full_name: event.target.value })} /></label>
              <label className="space-y-2 text-sm font-bold">Email<input className="field" type="email" value={user.email} onChange={(event) => patch({ email: event.target.value })} /></label>
              <label className="space-y-2 text-sm font-bold md:col-span-2">Avatar URL<input className="field" value={user.avatar_url || ""} onChange={(event) => patch({ avatar_url: event.target.value })} placeholder="https://..." /></label>
              <label className="space-y-2 text-sm font-bold">Role<select className="field" value={user.role || "user"} onChange={(event) => patch({ role: event.target.value })}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
              <label className="space-y-2 text-sm font-bold">Status<select className="field" value={user.status || "pending"} onChange={(event) => patch({ status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label className="space-y-2 text-sm font-bold">Plan<select className="field" value={user.plan_id ?? ""} onChange={(event) => patchPlan(event.target.value)}><option value="">No plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
              <label className="flex items-center gap-3 pt-8 text-sm font-bold"><input type="checkbox" checked={Boolean(user.api_access_enabled)} onChange={(event) => patch({ api_access_enabled: event.target.checked })} /> API access enabled</label>
            </div>
          ) : null}

          {user && tab === "Credits" ? (
            <div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm font-bold">Credits total<input className="field" type="number" value={user.credits_total || 0} onChange={(event) => patch({ credits_total: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm font-bold">Credits used<input className="field" type="number" value={user.credits_used || 0} onChange={(event) => patch({ credits_used: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm font-bold">Monthly credit limit<input className="field" type="number" value={user.credits_total || 0} onChange={(event) => patch({ credits_total: Number(event.target.value) })} /></label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn secondary" onClick={() => { setCreditAmount(1000); setModal("credits"); }}>Add credits</button>
                <button className="btn secondary" onClick={() => { setCreditAmount(-1000); setModal("credits"); }}>Remove credits</button>
              </div>
            </div>
          ) : null}

          {user && tab === "API Access" ? (
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={Boolean(user.api_access_enabled)} onChange={(event) => patch({ api_access_enabled: event.target.checked })} /> API access enabled</label>
              <button className="btn secondary" onClick={() => setModal("api-limit")}>Set API request limit</button>
              <p className="text-sm text-neutral-600">API keys for this user are listed in the API Keys tab.</p>
            </div>
          ) : null}

          {user && tab === "Voice Clones" ? (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="space-y-2 text-sm font-bold">Voice clone limit<input className="field w-36" type="number" value={user.voice_clone_limit || 0} onChange={(event) => patch({ voice_clone_limit: Number(event.target.value) })} /></label>
                <button className="btn secondary mt-7" onClick={() => { setVoiceLimit(Number(user.voice_clone_limit || 0)); setModal("voice-limit"); }}>Set limit</button>
              </div>
              <DataTable empty="No voice clones returned by backend.">
                {voiceClones.map((clone) => (
                  <tr key={clone.id} className="border-b border-neutral-100"><td className="p-3 font-bold">{clone.name || clone.id}</td><td className="p-3">{clone.gender || "-"}</td><td className="p-3">{clone.language || "-"}</td><td className="p-3">{displayDate(clone.created_at)}</td><td className="p-3 text-right"><button className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50" onClick={() => void runAction("Voice clone deleted.", () => api.adminDeleteUserVoiceClone(id, clone.id))}><Trash2 className="h-4 w-4" /></button></td></tr>
                ))}
              </DataTable>
            </div>
          ) : null}

          {tab === "Purchases" ? <DataTable empty="No purchase history endpoint data.">{purchases.map((purchase) => <tr key={purchase.id} className="border-b border-neutral-100"><td className="p-3 font-bold">{purchase.plan || purchase.id}</td><td className="p-3">{purchase.amount || "-"}</td><td className="p-3">{purchase.status || "-"}</td><td className="p-3">{displayDate(purchase.created_at)}</td></tr>)}</DataTable> : null}

          {user && tab === "Security" ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ActionButton label={user.email_verified ? "Email verified" : "Mark email verified"} icon={<MailCheck className="h-4 w-4" />} onClick={() => void runAction("Email marked verified.", () => api.adminMarkEmailVerified(id))} />
              <ActionButton label="Resend verification email" icon={<MailCheck className="h-4 w-4" />} onClick={() => void runAction("Verification email sent.", () => api.adminResendVerification(id), false)} />
              <ActionButton label="Require / disable 2FA" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => setModal("security-action")} />
              <ActionButton label="Enable account" icon={<Check className="h-4 w-4" />} onClick={() => void runAction("Account enabled.", () => api.adminUpdateUserStatus(id, "active"))} />
              <ActionButton label="Disable account" icon={<X className="h-4 w-4" />} onClick={() => void runAction("Account disabled.", () => api.adminUpdateUserStatus(id, "disabled"))} />
              <ActionButton label="Approve user" icon={<Check className="h-4 w-4" />} onClick={() => void runAction("User approved.", () => api.adminApproveUser(id))} />
              <ActionButton label="Reject user" icon={<X className="h-4 w-4" />} onClick={() => void runAction("User rejected.", () => api.adminRejectUser(id))} />
              <ActionButton label="Logout all devices" icon={<LogOut className="h-4 w-4" />} onClick={() => void runAction("All sessions revoked.", () => api.adminLogoutAllUserDevices(id), false)} />
            </div>
          ) : null}

          {tab === "Activity Logs" ? <DataTable empty="No activity logs returned by backend.">{activityLogs.map((log) => <tr key={log.id} className="border-b border-neutral-100"><td className="p-3 font-bold">{log.action || log.id}</td><td className="p-3">{log.ip_address || "-"}</td><td className="p-3">{log.user_agent || "-"}</td><td className="p-3">{displayDate(log.created_at)}</td></tr>)}</DataTable> : null}

          {tab === "Sessions" ? <DataTable empty="No sessions returned by backend.">{sessions.map((session) => <tr key={session.id} className="border-b border-neutral-100"><td className="p-3 font-bold">{session.device_name || session.session_id || session.id}</td><td className="p-3">{session.ip_address || "-"}</td><td className="p-3">{session.is_active ? "active" : "inactive"}</td><td className="p-3">{displayDate(session.last_used_at)}</td><td className="p-3 text-right"><button className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50" onClick={() => void runAction("Session revoked.", () => api.adminRevokeUserSession(id, session.id))}><Trash2 className="h-4 w-4" /></button></td></tr>)}</DataTable> : null}

          {tab === "API Keys" ? <DataTable empty="No API keys returned by backend.">{apiKeys.map((key) => <tr key={key.id} className="border-b border-neutral-100"><td className="p-3 font-bold">{key.name}</td><td className="p-3 font-mono">{key.token_prefix || key.token_preview || "-"}</td><td className="p-3">{key.enabled === false ? "disabled" : key.status || "active"}</td><td className="p-3">{displayDate(String(key.last_used_at || ""))}</td><td className="p-3 text-right"><button className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50" onClick={() => void runAction("API key revoked.", () => api.adminRevokeUserApiKey(id, key.id))}><Trash2 className="h-4 w-4" /></button></td></tr>)}</DataTable> : null}
        </div>
      </div>

      {missing.length ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black">Backend work still needed</p><ul className="mt-2 list-disc space-y-1 pl-5">{missing.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ActionButton label="Save all changes" icon={<Save className="h-4 w-4" />} onClick={() => void saveAll()} />
        <ActionButton label="Approve user" icon={<Check className="h-4 w-4" />} onClick={() => void runAction("User approved.", () => api.adminApproveUser(id))} />
        <ActionButton label="Reject user" icon={<X className="h-4 w-4" />} onClick={() => void runAction("User rejected.", () => api.adminRejectUser(id))} />
        <ActionButton label="Logout all devices" icon={<LogOut className="h-4 w-4" />} onClick={() => void runAction("All sessions revoked.", () => api.adminLogoutAllUserDevices(id), false)} />
        <button className="flex items-center gap-3 rounded-xl border border-red-200 bg-white p-4 text-left text-sm font-bold text-red-700 shadow-sm hover:bg-red-50" onClick={() => user && window.confirm(`Delete ${user.email}?`) && void runAction("User deleted.", () => api.adminDeleteUser(id), false).then(() => { window.location.href = "/admin/users"; })}><Trash2 className="h-5 w-5" /> Delete user</button>
      </div>

      {modal === "credits" ? <ActionModal title="Adjust credits" onClose={() => setModal(null)} footer={<><button className="btn secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn" onClick={() => applyCredit(creditAmount)}>Apply</button></>}><label className="space-y-2 text-sm font-bold">Amount<input className="field" type="number" value={creditAmount} onChange={(event) => setCreditAmount(Number(event.target.value))} /></label></ActionModal> : null}
      {modal === "api-limit" ? <ActionModal title="Set API request limit" description="This saves through the generic user patch endpoint when supported by the backend." onClose={() => setModal(null)} footer={<><button className="btn secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn" onClick={() => void runAction("API request limit saved.", () => api.adminPatchUser(id, { api_requests_limit: apiLimit })).then(() => setModal(null))}>Save</button></>}><label className="space-y-2 text-sm font-bold">Monthly API request limit<input className="field" type="number" value={apiLimit} onChange={(event) => setApiLimit(Number(event.target.value))} /></label></ActionModal> : null}
      {modal === "voice-limit" ? <ActionModal title="Set voice clone limit" onClose={() => setModal(null)} footer={<><button className="btn secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn" onClick={() => void runAction("Voice clone limit saved.", () => api.adminUpdateUserVoiceClones(id, voiceLimit)).then(() => setModal(null))}>Save</button></>}><label className="space-y-2 text-sm font-bold">Voice clone limit<input className="field" type="number" value={voiceLimit} onChange={(event) => setVoiceLimit(Number(event.target.value))} /></label></ActionModal> : null}
      {modal === "security-action" ? <ActionModal title="Two-factor requirement" description="Backend support for per-user 2FA requirement may be missing. This uses the generic user patch endpoint." onClose={() => setModal(null)}><div className="grid gap-3 sm:grid-cols-2"><button className="btn" onClick={() => void runAction("2FA required.", () => api.adminPatchUser(id, { two_factor_required: true })).then(() => setModal(null))}>Require 2FA</button><button className="btn secondary" onClick={() => void runAction("2FA requirement disabled.", () => api.adminPatchUser(id, { two_factor_required: false })).then(() => setModal(null))}>Disable requirement</button></div></ActionModal> : null}
    </AdminShell>
  );
}

function ActionButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left text-sm font-bold shadow-sm hover:bg-neutral-50" onClick={onClick}>{icon}{label}</button>;
}

function DataTable({ children, empty }: { children: React.ReactNode; empty: string }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white"><table className="w-full min-w-[760px] text-sm"><tbody>{rows.length ? children : <tr><td className="p-5 text-neutral-600">{empty}</td></tr>}</tbody></table></div>;
}
