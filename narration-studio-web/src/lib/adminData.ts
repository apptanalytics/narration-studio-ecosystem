import type { LucideIcon } from "lucide-react";
import { Activity, CreditCard, KeyRound, Lock, Mic2, ShieldCheck, Sparkles, Users, WalletCards } from "lucide-react";

export type AdminColumn = {
  key: string;
  label: string;
};

export type AdminRow = Record<string, string | number | boolean | null | undefined>;

export type AdminPageConfig = {
  title: string;
  description: string;
  endpoint: string;
  primaryAction: string;
  columns: AdminColumn[];
  rows: AdminRow[];
  statCards: Array<{ label: string; value: string; icon: LucideIcon }>;
  actions: string[];
};

export const roles = [
  { name: "user", permissions: "Dashboard, speech generation, own voices, own history" },
  { name: "creator", permissions: "User permissions, higher clone limit, priority generation" },
  { name: "developer", permissions: "User permissions, API keys, API logs" },
  { name: "support", permissions: "View users, payments, jobs. Cannot delete users or change admin roles" },
  { name: "admin", permissions: "Manage users, voices, credits, plans, payments, API access" },
  { name: "super_admin", permissions: "Full access, admin roles, security settings, delete users, audit logs" },
];

export const adminPages: Record<string, AdminPageConfig> = {
  overview: {
    title: "Admin Overview",
    description: "Manage users, roles, voices, credits, purchases, API access, security, and verification.",
    endpoint: "/api/admin/summary",
    primaryAction: "Refresh Overview",
    columns: [
      { key: "area", label: "Area" },
      { key: "status", label: "Status" },
      { key: "owner", label: "Owner" },
      { key: "lastUpdate", label: "Last Update" },
    ],
    rows: [
      { area: "Users", status: "Active", owner: "Admin", lastUpdate: "Today" },
      { area: "API Access", status: "Ready", owner: "Admin", lastUpdate: "Today" },
      { area: "Security", status: "Configured", owner: "Super Admin", lastUpdate: "Today" },
    ],
    statCards: [
      { label: "Users", value: "6", icon: Users },
      { label: "Credits Issued", value: "257K", icon: WalletCards },
      { label: "API Keys", value: "Ready", icon: KeyRound },
      { label: "Security Events", value: "0", icon: Lock },
    ],
    actions: ["Review users", "Check API logs", "Update security settings", "Open audit logs"],
  },
  users: {
    title: "Users",
    description: "View users, change roles, verify email, manage plans, credits, API access, and account status.",
    endpoint: "/api/admin/users",
    primaryAction: "Create User",
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "plan", label: "Plan" },
      { key: "credits", label: "Credits" },
      { key: "apiAccess", label: "API Access" },
      { key: "voiceClones", label: "Voice Clones" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Created At" },
      { key: "lastLogin", label: "Last Login" },
    ],
    rows: [
      { name: "Admin User", email: "admin@example.com", role: "admin", plan: "Studio Max", credits: "600,000", apiAccess: "Enabled", voiceClones: "Unlimited", status: "Active", createdAt: "2026-05-03", lastLogin: "Today" },
      { name: "Rithy", email: "rithy@gmail.com", role: "user", plan: "Free", credits: "5,000", apiAccess: "Enabled", voiceClones: "5", status: "Active", createdAt: "2026-05-03", lastLogin: "Today" },
    ],
    statCards: [
      { label: "Active Users", value: "6", icon: Users },
      { label: "Admins", value: "1", icon: ShieldCheck },
      { label: "API Enabled", value: "2", icon: KeyRound },
      { label: "Suspended", value: "0", icon: Lock },
    ],
    actions: ["View user", "Change role", "Activate / Suspend", "Reset password", "Verify email", "Add credits", "Assign plan", "Enable API access", "Delete user"],
  },
  roles: {
    title: "Roles",
    description: "Review role permissions and admin boundaries.",
    endpoint: "/api/admin/roles",
    primaryAction: "Save Role Matrix",
    columns: [{ key: "name", label: "Role" }, { key: "permissions", label: "Permissions" }],
    rows: roles,
    statCards: [
      { label: "Roles", value: "6", icon: ShieldCheck },
      { label: "Protected", value: "Admin roles", icon: Lock },
      { label: "Assignable", value: "Super admin only", icon: Users },
      { label: "Audit", value: "Required", icon: Activity },
    ],
    actions: ["Assign role", "Protect admin role", "Review permissions", "Audit role changes"],
  },
  voices: {
    title: "Voices",
    description: "Add, edit, enable, disable, and delete standard voices.",
    endpoint: "/api/admin/voices",
    primaryAction: "Add Standard Voice",
    columns: [{ key: "name", label: "Voice" }, { key: "gender", label: "Gender" }, { key: "language", label: "Language" }, { key: "enabled", label: "Enabled" }, { key: "createdAt", label: "Created At" }],
    rows: [
      { name: "Rithy Male", gender: "Male", language: "Khmer", enabled: "Yes", createdAt: "2026-05-03" },
      { name: "Maly Female", gender: "Female", language: "Khmer", enabled: "Yes", createdAt: "2026-05-03" },
    ],
    statCards: [
      { label: "Standard Voices", value: "11", icon: Mic2 },
      { label: "Enabled", value: "11", icon: ShieldCheck },
      { label: "Languages", value: "Khmer", icon: Activity },
      { label: "Disabled", value: "0", icon: Lock },
    ],
    actions: ["Upload sample", "Edit name", "Set gender", "Set language", "Enable / Disable", "Delete voice"],
  },
  "voice-clones": {
    title: "Voice Clone Review",
    description: "Review uploaded user voices, consent, identity verification, and misuse reports.",
    endpoint: "/api/admin/voice-clones",
    primaryAction: "Review Pending",
    columns: [{ key: "user", label: "User" }, { key: "voiceName", label: "Voice" }, { key: "status", label: "Status" }, { key: "consent", label: "Consent" }, { key: "identity", label: "Identity" }, { key: "createdAt", label: "Created At" }],
    rows: [
      { user: "Rithy", voiceName: "Uploaded Clone", status: "pending", consent: "Confirmed", identity: "Unverified", createdAt: "Today" },
      { user: "Admin User", voiceName: "Admin Clone", status: "ready", consent: "Confirmed", identity: "Verified", createdAt: "Today" },
    ],
    statCards: [
      { label: "Pending", value: "1", icon: Sparkles },
      { label: "Ready", value: "1", icon: ShieldCheck },
      { label: "Rejected", value: "0", icon: Lock },
      { label: "Suspended", value: "0", icon: Activity },
    ],
    actions: ["Approve", "Reject", "Delete unsafe voice", "Suspend user", "Review consent", "Review identity"],
  },
  credits: {
    title: "Credits",
    description: "Search users, add/remove credits, set monthly limits, and record reasons.",
    endpoint: "/api/admin/credits",
    primaryAction: "Add Credits",
    columns: [{ key: "user", label: "User" }, { key: "amount", label: "Amount" }, { key: "type", label: "Type" }, { key: "reason", label: "Reason" }, { key: "admin", label: "Admin" }, { key: "createdAt", label: "Created At" }],
    rows: [
      { user: "Admin User", amount: "600,000", type: "bonus", reason: "Admin plan", admin: "system", createdAt: "Today" },
      { user: "Rithy", amount: "5,000", type: "purchase", reason: "Free monthly credits", admin: "system", createdAt: "Today" },
    ],
    statCards: [
      { label: "Monthly Credits", value: "605K", icon: WalletCards },
      { label: "Transactions", value: "2", icon: Activity },
      { label: "Refunds", value: "0", icon: CreditCard },
      { label: "Adjustments", value: "1", icon: ShieldCheck },
    ],
    actions: ["Search user", "Add credits", "Remove credits", "Set monthly limit", "Add note/reason", "View transaction history"],
  },
  purchases: {
    title: "Purchases",
    description: "Manage purchases, invoices, refunds, and purchased credit assignment.",
    endpoint: "/api/admin/purchases",
    primaryAction: "Record Purchase",
    columns: [{ key: "user", label: "User" }, { key: "plan", label: "Plan" }, { key: "amount", label: "Amount" }, { key: "paymentMethod", label: "Payment Method" }, { key: "status", label: "Status" }, { key: "creditsAdded", label: "Credits Added" }, { key: "invoice", label: "Invoice" }, { key: "createdAt", label: "Created At" }],
    rows: [
      { user: "Admin User", plan: "Studio Max", amount: "$49.99", paymentMethod: "Manual", status: "paid", creditsAdded: "600,000", invoice: "INV-001", createdAt: "Today" },
    ],
    statCards: [
      { label: "Paid", value: "1", icon: CreditCard },
      { label: "Pending", value: "0", icon: Activity },
      { label: "Refunded", value: "0", icon: WalletCards },
      { label: "Revenue", value: "$49.99", icon: ShieldCheck },
    ],
    actions: ["Mark as paid", "Mark as failed", "Refund", "Add purchased credits", "Download invoice"],
  },
  "api-access": {
    title: "API Access",
    description: "Enable API access per user, limits, allowed IPs, allowed CORS origins, machines, keys, and logs.",
    endpoint: "/api/admin/api-keys",
    primaryAction: "Grant API Access",
    columns: [{ key: "user", label: "User" }, { key: "enabled", label: "Enabled" }, { key: "monthlyLimit", label: "Monthly Limit" }, { key: "allowedIps", label: "Allowed IPs" }, { key: "allowedOrigins", label: "Allowed Origins" }, { key: "machine", label: "Machine" }],
    rows: [
      { user: "Admin User", enabled: "Yes", monthlyLimit: "500,000", allowedIps: "*", allowedOrigins: "http://localhost:3000", machine: "Admin dashboard" },
      { user: "Rithy", enabled: "Yes", monthlyLimit: "500", allowedIps: "*", allowedOrigins: "Any", machine: "Default" },
    ],
    statCards: [
      { label: "API Users", value: "2", icon: KeyRound },
      { label: "Monthly Limit", value: "500K", icon: Activity },
      { label: "Revoked", value: "0", icon: Lock },
      { label: "Origins", value: "Configured", icon: ShieldCheck },
    ],
    actions: ["Enable / Disable API", "Set request limit", "Set allowed IPs", "Set CORS origins", "Set machine name", "Revoke key", "View logs"],
  },
  security: {
    title: "Security",
    description: "Control email verification, passkeys, 2FA, login alerts, sessions, and security logs.",
    endpoint: "/api/admin/security/settings",
    primaryAction: "Save Security Settings",
    columns: [{ key: "setting", label: "Setting" }, { key: "value", label: "Value" }, { key: "scope", label: "Scope" }],
    rows: [
      { setting: "Require email verification", value: "Off", scope: "Voice cloning" },
      { setting: "Require 2FA for admins", value: "Off", scope: "Admin users" },
      { setting: "Require passkey for admins", value: "Off", scope: "Admin users" },
      { setting: "Allow registration", value: "On", scope: "Public auth" },
    ],
    statCards: [
      { label: "2FA", value: "Ready", icon: Lock },
      { label: "Passkeys", value: "Ready", icon: ShieldCheck },
      { label: "Sessions", value: "Tracked", icon: Activity },
      { label: "Email Alerts", value: "Ready", icon: Users },
    ],
    actions: ["Resend verification", "Mark email verified", "Require 2FA", "Require passkey", "Revoke session", "View security logs"],
  },
  settings: {
    title: "Admin Settings",
    description: "Configure registration, password login, Google login, verification, failed login lockouts, and voice clone requirements.",
    endpoint: "/api/admin/security/settings",
    primaryAction: "Save Settings",
    columns: [{ key: "setting", label: "Setting" }, { key: "value", label: "Value" }],
    rows: [
      { setting: "Allow Google login", value: "On" },
      { setting: "Allow password login", value: "On" },
      { setting: "Allow registration", value: "On" },
      { setting: "Voice clone requires consent", value: "On" },
      { setting: "Max failed login attempts", value: "5" },
      { setting: "Account lock duration", value: "30 minutes" },
    ],
    statCards: [
      { label: "Auth", value: "Enabled", icon: Lock },
      { label: "Registration", value: "Open", icon: Users },
      { label: "Voice Consent", value: "Required", icon: Mic2 },
      { label: "Lockout", value: "30 min", icon: ShieldCheck },
    ],
    actions: ["Toggle email verification", "Toggle 2FA", "Toggle passkeys", "Toggle Google login", "Toggle registration", "Set lockout"],
  },
  "audit-logs": {
    title: "Audit Logs",
    description: "Every admin action should be written to AuditLog.",
    endpoint: "/api/admin/audit-logs",
    primaryAction: "Export Logs",
    columns: [{ key: "actor", label: "Actor" }, { key: "target", label: "Target" }, { key: "action", label: "Action" }, { key: "ip", label: "IP" }, { key: "createdAt", label: "Created At" }],
    rows: [
      { actor: "system", target: "admin dashboard", action: "admin_pages_ready", ip: "127.0.0.1", createdAt: "Today" },
      { actor: "admin", target: "api access", action: "reviewed", ip: "127.0.0.1", createdAt: "Today" },
    ],
    statCards: [
      { label: "Events", value: "2", icon: Activity },
      { label: "Role Changes", value: "0", icon: ShieldCheck },
      { label: "Credit Changes", value: "0", icon: WalletCards },
      { label: "Security", value: "0", icon: Lock },
    ],
    actions: ["Filter logs", "Export logs", "Review security event", "Review role change"],
  },
};
