"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Loader2, Save, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import type { AuthUser, IdentityVerification, PricingPlan } from "@/lib/types";

const roles = ["user", "admin", "super_admin"];
const statuses = ["pending", "active", "suspended", "banned", "disabled", "rejected"];
const verificationStatuses = ["pending", "approved", "rejected"];

function displayDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function userName(user?: AuthUser | null) {
  return user?.name || user?.full_name || user?.email || "User";
}

function boolText(value?: boolean) {
  return value ? "Yes" : "No";
}

function badgeClass(active: boolean) {
  return active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-neutral-100 text-neutral-600";
}

export default function UserAdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [originalPlanId, setOriginalPlanId] = useState<number | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remainingCredits = useMemo(() => Math.max(0, Number(user?.credits_total || 0) - Number(user?.credits_used || 0)), [user]);
  const selectedPlan = plans.find((plan) => plan.id === user?.plan_id) || user?.plan || null;

  function patch(next: Partial<AuthUser>) {
    setUser((current) => current ? { ...current, ...next } : current);
  }

  function patchVerification(next: Partial<IdentityVerification>) {
    setVerification((current) => current ? { ...current, ...next } : current);
  }

  async function load() {
    setLoading(true);
    try {
      const [userData, planData, verificationData] = await Promise.all([
        api.adminUser(id),
        api.adminPlans(),
        api.adminUserVerification(id).catch(() => ({ verification: null })),
      ]);
      setUser(userData.user);
      setOriginalPlanId(userData.user.plan_id ?? null);
      setPlans(planData.plans || []);
      setVerification(verificationData.verification || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load user.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  function patchPlan(value: string) {
    const planId = Number(value) || null;
    const plan = plans.find((item) => item.id === planId);
    patch({
      plan_id: planId,
      plan: plan || null,
      ...(plan ? {
        credits_total: Number(plan.credits || 0),
        api_access_enabled: Boolean(plan.api_access_enabled),
        voice_clone_limit: Number(plan.voice_clone_limit || 0),
      } : {}),
    });
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      if ((user.plan_id ?? null) !== originalPlanId) {
        await api.adminUpdateUserPlan(id, user.plan_id ? Number(user.plan_id) : null);
      }
      await api.adminPatchUser(id, {
        name: user.name || user.full_name,
        email: user.email,
        avatar_url: user.avatar_url || "",
        role: user.role || "user",
        status: user.status || "pending",
        credits_total: Number(user.credits_total || 0),
        credits_used: Number(user.credits_used || 0),
        api_access_enabled: Boolean(user.api_access_enabled),
        voice_clone_limit: Number(user.voice_clone_limit || 0),
        email_verified: Boolean(user.email_verified),
        admin_verified: Boolean(user.admin_verified),
      });
      if (verification) {
        await api.adminPatchUserVerification(id, { status: verification.status || "pending", review_note: verification.review_note || "" }).catch(() => undefined);
      }
      toast.success("User saved.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save user.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!user || !window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.adminDeleteUser(id);
      toast.success("User deleted.");
      window.location.href = "/admin/users";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete user.");
      setDeleting(false);
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-neutral-950"><ArrowLeft className="h-4 w-4" /> Users</Link>
          <h1 className="mt-3 text-3xl font-black">{userName(user)}</h1>
          <p className="mt-2 text-neutral-600">View and edit account, credits, API access, authentication, and verification details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn secondary" onClick={() => void load()} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Refresh</button>
          <button className="btn" onClick={() => void save()} disabled={saving || loading || !user}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</button>
          <button className="btn secondary border-red-200 text-red-700 hover:bg-red-50" onClick={() => void deleteUser()} disabled={deleting || !user}>{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete</button>
        </div>
      </div>

      {loading ? <div className="card mt-6 flex items-center gap-2 p-5 text-sm font-bold text-neutral-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading user profile</div> : null}
      {!loading && !user ? <div className="card mt-6 p-5 text-sm font-bold text-red-700">User not found.</div> : null}

      {user ? (
        <div className="mt-6 grid gap-5">
          <Section title="Basic Profile">
            <div className="flex items-center gap-4 md:col-span-2">
              <div className="grid h-20 w-20 overflow-hidden rounded-lg bg-neutral-950 text-white">
                {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="m-auto h-8 w-8" />}
              </div>
              <div>
                <p className="text-xl font-black">{userName(user)}</p>
                <p className="text-sm text-neutral-500">{user.email}</p>
                <p className="mt-1 text-xs font-bold text-neutral-500">User ID: {user.id}</p>
              </div>
            </div>
            <Field label="Full name"><input className="field" value={user.name || user.full_name || ""} onChange={(event) => patch({ name: event.target.value, full_name: event.target.value })} /></Field>
            <Field label="Email"><input className="field" type="email" value={user.email || ""} onChange={(event) => patch({ email: event.target.value })} /></Field>
            <Field label="Avatar URL" wide><input className="field" value={user.avatar_url || ""} onChange={(event) => patch({ avatar_url: event.target.value })} /></Field>
            <Info label="Created" value={displayDate(user.created_at)} />
            <Info label="Updated" value={displayDate(user.updated_at)} />
            <Info label="Last login" value={displayDate(user.last_login_at)} />
          </Section>

          <Section title="Account State">
            <Field label="Role"><select className="field" value={user.role || "user"} onChange={(event) => patch({ role: event.target.value })}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></Field>
            <Field label="Status"><select className="field" value={user.status || "pending"} onChange={(event) => patch({ status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
            <Field label="Plan"><select className="field" value={user.plan_id ?? ""} onChange={(event) => patchPlan(event.target.value)}><option value="">No plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></Field>
            <Toggle label="Email verified" checked={Boolean(user.email_verified)} onChange={(checked) => patch({ email_verified: checked })} />
            <Toggle label="Admin verified" checked={Boolean(user.admin_verified)} onChange={(checked) => patch({ admin_verified: checked })} />
          </Section>

          <Section title="Credits and Limits">
            <Info label="Credits remaining" value={remainingCredits.toLocaleString()} />
            <Field label="Current credits total"><input className="field" type="number" value={user.credits_total || 0} onChange={(event) => patch({ credits_total: Number(event.target.value) })} /></Field>
            <Field label="Credits used"><input className="field" type="number" value={user.credits_used || 0} onChange={(event) => patch({ credits_used: Number(event.target.value) })} /></Field>
            <Info label="Credit period started" value={displayDate(user.credit_period_started_at)} />
            <Info label="Credits reset at" value={displayDate(user.credits_reset_at)} />
            <Toggle label="API access enabled" checked={Boolean(user.api_access_enabled)} onChange={(checked) => patch({ api_access_enabled: checked })} />
            <Info label="API request limit" value={selectedPlan?.api_requests_limit?.toLocaleString?.() || "-"} />
            <Field label="Voice clone limit"><input className="field" type="number" value={user.voice_clone_limit || 0} onChange={(event) => patch({ voice_clone_limit: Number(event.target.value) })} /></Field>
            <Info label="Voice clones used" value={String(user.voice_clones_used || 0)} />
          </Section>

          <Section title="Authentication Info">
            <Info label="Provider" value={user.provider || "email"} />
            <Info label="Provider ID" value={user.google_id || "-"} />
            <Info label="Google linked" value={boolText(Boolean(user.google_id || user.provider === "google"))} />
            <Info label="Provider email verified" value={boolText(Boolean(user.email_verified))} />
            <Info label="Two-factor enabled" value={boolText(Boolean(user.two_factor_enabled))} />
          </Section>

          <Section title="Verification / KYC Info">
            {verification ? (
              <>
                <Info label="Verification ID" value={String(verification.id)} />
                <Field label="Verification status"><select className="field" value={verification.status || "pending"} onChange={(event) => patchVerification({ status: event.target.value })}>{verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
                <Info label="Legal name" value={verification.legal_name || "-"} />
                <Info label="Country" value={verification.country || "-"} />
                <Info label="Document type" value={verification.document_type || "-"} />
                <Info label="Document number" value={verification.document_number || "-"} />
                <DocLink label="Document front" href={verification.document_front_url} />
                <DocLink label="Document back" href={verification.document_back_url} />
                <DocLink label="Selfie" href={verification.selfie_url} />
                <Field label="Rejection / review note" wide><textarea className="field min-h-24" value={verification.review_note || ""} onChange={(event) => patchVerification({ review_note: event.target.value })} /></Field>
                <Info label="Reviewed by admin" value={verification.reviewed_by_admin_id ? String(verification.reviewed_by_admin_id) : "-"} />
                <Info label="Reviewed at" value={displayDate(verification.reviewed_at)} />
              </>
            ) : (
              <p className="text-sm font-bold text-neutral-500 md:col-span-2">No identity verification has been submitted.</p>
            )}
          </Section>
        </div>
      ) : null}
    </AdminShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card p-5"><h2 className="text-lg font-black">{title}</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div></section>;
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`space-y-2 text-sm font-bold ${wide ? "md:col-span-2 xl:col-span-3" : ""}`}><span>{label}</span>{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-neutral-200 bg-white p-3"><p className="text-xs font-bold uppercase text-neutral-500">{label}</p><p className="mt-1 break-words text-sm font-bold text-neutral-950">{value}</p></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm font-bold"><span>{label}</span><span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(checked)}`}>{checked ? <Check className="inline h-3.5 w-3.5" /> : <X className="inline h-3.5 w-3.5" />} {checked ? "Yes" : "No"}</span><input className="sr-only" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function DocLink({ label, href }: { label: string; href?: string }) {
  return <div className="rounded-lg border border-neutral-200 bg-white p-3"><p className="text-xs font-bold uppercase text-neutral-500">{label}</p>{href ? <a className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-neutral-950 hover:underline" href={href} target="_blank"><ExternalLink className="h-3.5 w-3.5" /> Open</a> : <p className="mt-1 text-sm font-bold text-neutral-500">-</p>}</div>;
}
