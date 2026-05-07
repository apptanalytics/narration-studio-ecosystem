"use client";

import { useEffect, useState } from "react";
import { Activity, KeyRound, Loader2, Mail, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ActionModal } from "@/components/ActionModal";
import { AdminShell } from "@/components/AdminShell";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import type { ActivityLog, SecuritySettings } from "@/lib/types";

const defaults: SecuritySettings = {
  require_email_verification: true,
  require_identity_verification_for_voice_cloning: true,
  require_2fa_for_admins: false,
  require_passkey_for_admins: false,
  allow_registration: true,
  login_alert_emails: true,
  session_expiration_minutes: 10080,
  otp_expiry_minutes: 10,
  otp_max_attempts: 5,
  password_reset_enabled: true,
  google_login_enabled: true,
};

const settingRows: Array<{ key: keyof SecuritySettings; label: string; description: string }> = [
  { key: "require_email_verification", label: "Require email verification", description: "New accounts must verify their email before access." },
  { key: "require_identity_verification_for_voice_cloning", label: "Require identity verification for voice cloning", description: "Voice clone creation stays blocked until identity approval." },
  { key: "require_2fa_for_admins", label: "Require 2FA for admins", description: "Admin accounts must use authenticator app verification." },
  { key: "require_passkey_for_admins", label: "Require passkey for admins", description: "Admin accounts must have passkey support once backend is configured." },
  { key: "allow_registration", label: "Allow registration", description: "Public account registration is open." },
  { key: "login_alert_emails", label: "Login alert emails", description: "Send email alerts after sign-in events." },
  { key: "password_reset_enabled", label: "Password reset enabled", description: "Users can request password reset OTP emails." },
  { key: "google_login_enabled", label: "Google login enabled", description: "Allow Google OAuth sign-in." },
];

export default function AdminSecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings>(defaults);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalKey, setModalKey] = useState<keyof SecuritySettings | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  function addMissing(message: string) {
    setMissing((items) => items.includes(message) ? items : [...items, message]);
  }

  async function load() {
    setLoading(true);
    setMissing([]);
    try {
      const data = await api.adminSecuritySettings();
      setSettings("settings" in data ? data.settings : data);
    } catch (error) {
      addMissing(error instanceof Error ? error.message : "Backend endpoint missing: /admin/security/settings");
    }
    try {
      const data = await api.adminSecurityLogs();
      setLogs(data.logs || []);
    } catch (error) {
      addMissing(error instanceof Error ? error.message : "Backend endpoint missing: /admin/security/logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function patch<K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await api.adminPatchSecuritySettings(settings);
      toast.success("Security settings saved.");
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save settings.";
      addMissing(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const statusCards = [
    ["Sessions tracked", settings.sessions_tracked === undefined ? "Unknown" : settings.sessions_tracked ? "Enabled" : "Not configured", Activity],
    ["2FA ready", settings.two_factor_ready === undefined ? "Unknown" : settings.two_factor_ready ? "Enabled" : "Not configured", ShieldCheck],
    ["Passkeys ready", settings.passkeys_ready === undefined ? "Unknown" : settings.passkeys_ready ? "Enabled" : "Not configured", KeyRound],
    ["Email alerts", settings.email_alerts_ready === undefined ? "Unknown" : settings.email_alerts_ready ? "Enabled" : "Not configured", Mail],
  ] as const;

  return (
    <AdminShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Security</h1>
          <p className="mt-2 max-w-3xl text-neutral-600">Manage authentication, registration, OTP, sessions, passkeys, and login alert policy.</p>
        </div>
        <button className="btn" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Security Settings</button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statusCards.map(([label, value, Icon]) => <div key={label} className="card p-5"><Icon className="h-5 w-5 text-neutral-500" /><p className="mt-4 text-sm font-semibold text-neutral-500">{label}</p><p className="mt-1 text-2xl font-black">{loading ? "Loading" : value}</p></div>)}
      </div>

      {missing.length ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black">Backend endpoint status</p><ul className="mt-2 list-disc space-y-1 pl-5">{missing.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}

      <div className="card mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          {settingRows.map((row) => (
            <div key={row.key} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="font-black">{row.label}</h2><p className="mt-1 text-sm text-neutral-600">{row.description}</p></div>
                <Switch checked={Boolean(settings[row.key])} onCheckedChange={(checked) => patch(row.key, checked as never)} />
              </div>
              <button className="btn secondary mt-4" onClick={() => setModalKey(row.key)}>Manage</button>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm font-bold">Session expiration minutes<input className="field" type="number" value={settings.session_expiration_minutes} onChange={(event) => patch("session_expiration_minutes", Number(event.target.value))} /></label>
          <label className="space-y-2 text-sm font-bold">OTP expiry minutes<input className="field" type="number" value={settings.otp_expiry_minutes} onChange={(event) => patch("otp_expiry_minutes", Number(event.target.value))} /></label>
          <label className="space-y-2 text-sm font-bold">OTP max attempts<input className="field" type="number" value={settings.otp_max_attempts} onChange={(event) => patch("otp_max_attempts", Number(event.target.value))} /></label>
        </div>
      </div>

      <div className="card mt-6 p-4">
        <h2 className="text-xl font-black">Security Logs</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><tbody>{logs.length === 0 ? <tr><td className="p-5 text-neutral-600">No security logs returned by backend.</td></tr> : null}{logs.map((log) => <tr key={log.id} className="border-b border-neutral-100"><td className="p-3 font-bold">{log.action || log.id}</td><td className="p-3">{log.ip_address || "-"}</td><td className="p-3">{log.created_at || "-"}</td></tr>)}</tbody></table></div>
      </div>

      {modalKey ? (
        <ActionModal title={settingRows.find((row) => row.key === modalKey)?.label || "Manage setting"} description={settingRows.find((row) => row.key === modalKey)?.description} onClose={() => setModalKey(null)} footer={<><button className="btn secondary" onClick={() => setModalKey(null)}>Close</button><button className="btn" onClick={() => void save().then(() => setModalKey(null))}>Save</button></>}>
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-4"><div><p className="font-bold">Enabled</p><p className="text-sm text-neutral-600">Toggle and save this security setting.</p></div><Switch checked={Boolean(settings[modalKey])} onCheckedChange={(checked) => patch(modalKey, checked as never)} /></div>
        </ActionModal>
      ) : null}
    </AdminShell>
  );
}
