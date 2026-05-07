"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Bell, Copy, KeyRound, Loader2, LogOut, QrCode, Save, ShieldCheck, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { ActionModal } from "@/components/ActionModal";
import { Shell } from "@/components/Shell";
import { Switch } from "@/components/ui/switch";
import { api, proxyFetch } from "@/lib/api";
import type { AuthUser, UserSession, VerificationStatusResponse } from "@/lib/types";
import { useDisable2FAMutation, useGetSessionsQuery, useLogoutAllMutation, useMeQuery, useResendEmailOtpMutation, useRevokeSessionMutation, useSetup2FAMutation, useVerify2FAMutation } from "@/store/api/authApi";

const tabs = ["Profile", "Security", "Sessions", "Notifications", "Identity Verification", "API Preferences"] as const;
type Tab = (typeof tabs)[number];

function message(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Profile");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [verification, setVerification] = useState<VerificationStatusResponse | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totp, setTotp] = useState<{ secret: string; url: string } | null>(null);
  const [totpQr, setTotpQr] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  const [notifications, setNotifications] = useState({ email_alerts: true, generation_completed: true, identity_verification: true, login_alert: true });
  const [apiPrefs, setApiPrefs] = useState({ allowed_origins: "http://localhost:3000", allowed_methods: "GET, POST" });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const meQuery = useMeQuery();
  const sessionsQuery = useGetSessionsQuery();
  const [setup2FA] = useSetup2FAMutation();
  const [verify2FA] = useVerify2FAMutation();
  const [disable2FA] = useDisable2FAMutation();
  const [logoutAll] = useLogoutAllMutation();
  const [revokeSession] = useRevokeSessionMutation();
  const [resendEmailOtp] = useResendEmailOtpMutation();

  function addMissing(item: string) {
    setMissing((current) => current.includes(item) ? current : [...current, item]);
  }

  async function load() {
    setLoading(true);
    setMissing([]);
    try {
      if (meQuery.data) setUser(meQuery.data);
    } catch (error) {
      toast.error(message(error));
    }
    try {
      const data = sessionsQuery.data || { sessions: [] };
      setSessions(data.sessions || []);
    } catch (error) {
      addMissing(message(error));
    }
    try {
      setVerification(await api.verificationStatus());
    } catch (error) {
      addMissing(message(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [meQuery.data, sessionsQuery.data]);

  useEffect(() => {
    let cancelled = false;
    if (!totp?.url) {
      setTotpQr("");
      return;
    }
    QRCode.toDataURL(totp.url, { errorCorrectionLevel: "M", margin: 2, width: 240 })
      .then((url) => {
        if (!cancelled) setTotpQr(url);
      })
      .catch(() => {
        if (!cancelled) setTotpQr("");
      });
    return () => {
      cancelled = true;
    };
  }, [totp?.url]);

  function patchUser(patch: Partial<AuthUser>) {
    setUser((current) => current ? { ...current, ...patch } : current);
  }

  async function run(label: string, action: () => Promise<unknown>, reload = true) {
    setSaving(true);
    try {
      await action();
      toast.success(label);
      if (reload) await load();
    } catch (error) {
      const text = message(error);
      addMissing(text);
      toast.error(text);
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    if (!user) return;
    await run("Profile saved.", () => proxyFetch("/auth/me", { method: "PATCH", body: JSON.stringify({ name: user.name || user.full_name, email: user.email, avatar_url: user.avatar_url }) }));
  }

  async function savePassword() {
    await run("Password updated.", () => proxyFetch("/auth/password", { method: "PATCH", body: JSON.stringify(passwords) }), false);
    setPasswordOpen(false);
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("Copy failed.");
    }
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Settings</h1>
          <p className="mt-2 text-neutral-600">Manage profile, security, sessions, notification preferences, identity verification, and API defaults.</p>
        </div>
        <button className="btn secondary" onClick={() => void load()} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Refresh</button>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-2">
        {tabs.map((item) => <button key={item} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold ${tab === item ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700"}`} onClick={() => setTab(item)}>{item}</button>)}
      </div>

      {missing.length ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black">Backend endpoint status</p><ul className="mt-2 list-disc space-y-1 pl-5">{missing.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}

      <div className="card mt-6 p-5">
        {tab === "Profile" ? (
          <div>
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 overflow-hidden rounded-full bg-neutral-950 text-white">
                {user?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : <User className="m-auto h-7 w-7" />}
              </div>
              <div><p className="text-xl font-black">{user?.name || user?.full_name || user?.email || "Loading..."}</p><p className="text-sm text-neutral-500">{user?.email}</p></div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold">Name<input className="field" value={user?.name || user?.full_name || ""} onChange={(event) => patchUser({ name: event.target.value, full_name: event.target.value })} /></label>
              <label className="space-y-2 text-sm font-bold">Email<input className="field" type="email" value={user?.email || ""} onChange={(event) => patchUser({ email: event.target.value })} /></label>
              <label className="space-y-2 text-sm font-bold md:col-span-2">Avatar URL<input className="field" value={user?.avatar_url || ""} onChange={(event) => patchUser({ avatar_url: event.target.value })} placeholder="https://..." /></label>
              <Info label="Plan" value={String(user?.plan_id || "Free")} />
              <Info label="Credits" value={`${user?.credits_used || 0} / ${user?.credits_total || 0}`} />
              <Info label="Last login" value={user?.last_login_at || "-"} />
              <Info label="Account status" value={user?.status || "unknown"} />
            </div>
            <button className="btn mt-5" onClick={() => void saveProfile()} disabled={saving}><Save className="h-4 w-4" /> Save profile</button>
          </div>
        ) : null}

        {tab === "Security" ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Info label="Email verification" value={user?.email_verified ? "Verified" : "Not verified"} />
              <Info label="2FA" value={user?.two_factor_enabled ? "Enabled" : "Disabled"} />
              <Info label="Role" value={user?.role || "user"} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn secondary" onClick={() => setPasswordOpen(true)}>Update password</button>
              <Link className="btn secondary" href="/forgot-password">Forgot/reset password</Link>
              <button className="btn secondary" onClick={() => void run("Verification email sent.", () => resendEmailOtp({ email: user?.email || "" }).unwrap(), false)}>Resend verification</button>
              <button className="btn secondary" onClick={() => void run("Authenticator secret created.", async () => { setTotp(await setup2FA().unwrap()); }, false)}><QrCode className="h-4 w-4" /> Set up 2FA</button>
              <button className="btn secondary" onClick={() => void run("2FA disabled.", () => disable2FA().unwrap())}>Disable 2FA</button>
            </div>
            {totp ? (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="font-bold">Authenticator setup</p>
                <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr]">
                  <div className="flex h-[260px] w-full max-w-[260px] items-center justify-center rounded-xl border border-neutral-200 bg-white p-3">
                    {totpQr ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={totpQr} alt="Authenticator QR code" className="h-full w-full object-contain" />
                    ) : <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />}
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-500">Manual setup key</p>
                      <div className="mt-1 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3">
                        <code className="min-w-0 flex-1 break-all font-mono text-sm">{totp.secret}</code>
                        <button className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-50" onClick={() => void copyText(totp.secret, "Secret copied.")} title="Copy secret">
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <details className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                      <summary className="cursor-pointer font-bold">Advanced setup URI</summary>
                      <p className="mt-2 break-all text-neutral-600">{totp.url}</p>
                    </details>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input className="field" inputMode="numeric" autoComplete="one-time-code" placeholder="Authenticator code" value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
                      <button className="btn" onClick={() => void run("2FA enabled.", () => verify2FA({ code: totpCode }).unwrap())} disabled={totpCode.length < 6}>Verify</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "Sessions" ? (
          <div>
            <div className="mb-4 flex justify-end"><button className="btn secondary" onClick={() => void run("Logged out all devices.", () => logoutAll().unwrap())}><LogOut className="h-4 w-4" /> Logout all devices</button></div>
            <div className="overflow-x-auto rounded-xl border border-neutral-200"><table className="w-full min-w-[760px] text-sm"><tbody>{sessions.length === 0 ? <tr><td className="p-5 text-neutral-600">No sessions returned by backend.</td></tr> : null}{sessions.map((session) => <tr key={session.id} className="border-b border-neutral-100"><td className="p-3 font-bold">{session.device_name || session.session_id || session.id}</td><td className="p-3">{session.ip_address || "-"}</td><td className="p-3">{session.is_active ? "active" : "inactive"}</td><td className="p-3">{session.last_used_at || "-"}</td><td className="p-3 text-right"><button className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50" onClick={() => void run("Session revoked.", () => revokeSession(session.id).unwrap())}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
          </div>
        ) : null}

        {tab === "Notifications" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(notifications).map(([key, value]) => <ToggleRow key={key} label={key.replaceAll("_", " ")} checked={value} onChange={(checked) => setNotifications((current) => ({ ...current, [key]: checked }))} />)}
            <button className="btn mt-2 w-fit" onClick={() => void run("Notification preferences saved.", () => proxyFetch("/user/notification-settings", { method: "PATCH", body: JSON.stringify(notifications) }), false)}><Bell className="h-4 w-4" /> Save notifications</button>
          </div>
        ) : null}

        {tab === "Identity Verification" ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xl font-black">{verification?.status || "not_submitted"}</p><p className="mt-1 text-sm text-neutral-600">Current identity verification status.</p></div>
            <Link href="/dashboard/verification" className="btn"><ShieldCheck className="h-4 w-4" /> Open Verification</Link>
          </div>
        ) : null}

        {tab === "API Preferences" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="API access" value={user?.api_access_enabled ? "Enabled" : "Disabled"} />
            <label className="space-y-2 text-sm font-bold">Default allowed origins<input className="field" value={apiPrefs.allowed_origins} onChange={(event) => setApiPrefs({ ...apiPrefs, allowed_origins: event.target.value })} /></label>
            <label className="space-y-2 text-sm font-bold">Default allowed methods<input className="field" value={apiPrefs.allowed_methods} onChange={(event) => setApiPrefs({ ...apiPrefs, allowed_methods: event.target.value })} /></label>
            <button className="btn mt-7 w-fit" onClick={() => void run("API preferences saved.", () => proxyFetch("/user/api-preferences", { method: "PATCH", body: JSON.stringify(apiPrefs) }), false)}><KeyRound className="h-4 w-4" /> Save API preferences</button>
          </div>
        ) : null}
      </div>

      {passwordOpen ? <ActionModal title="Update password" onClose={() => setPasswordOpen(false)} footer={<><button className="btn secondary" onClick={() => setPasswordOpen(false)}>Cancel</button><button className="btn" onClick={() => void savePassword()}>Save password</button></>}><div className="grid gap-4"><input className="field" type="password" placeholder="Current password" value={passwords.current_password} onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })} /><input className="field" type="password" placeholder="New password" value={passwords.new_password} onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })} /></div></ActionModal> : null}
    </Shell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"><p className="text-sm font-semibold text-neutral-500">{label}</p><p className="mt-1 font-black">{value}</p></div>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-4"><p className="font-bold capitalize">{label}</p><Switch checked={checked} onCheckedChange={onChange} /></div>;
}
