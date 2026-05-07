import type { ActivityLog, ApiKey, ApiLog, ApiUsage, AuthUser, GenerateRequest, GenerateResult, IdentityVerification, JobRecord, NotificationRecord, PricingPlan, PurchaseRecord, SecuritySettings, UserSession, VerificationStatusResponse, VerificationSubmission, Visitor, VoiceClone } from "./types";

export const API_BASE = "/api/backend";
export const PROXY_BASE = "/api/proxy";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = typeof window !== "undefined" ? window.localStorage.getItem("narration_api_key") : "";
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (apiKey) headers.set("Authorization", `Bearer ${apiKey}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const message = errorMessage(data, res.statusText);
    throw new Error(message);
  }
  return unwrapApiData<T>(data);
}

export class ApiRequestError extends Error {
  status: number;
  path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.path = path;
  }
}

export async function proxyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${PROXY_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const message = res.status === 404 ? `Backend endpoint missing: ${path}` : errorMessage(data, res.statusText);
    throw new ApiRequestError(message, res.status, path);
  }
  return unwrapApiData<T>(data);
}

function unwrapApiData<T>(data: unknown): T {
  if (typeof data === "object" && data && "success" in data && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

function errorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data) {
    if ("detail" in data) return String((data as { detail: unknown }).detail);
    if ("error" in data) {
      const error = (data as { error?: { message?: unknown } }).error;
      if (error?.message) return String(error.message);
    }
  }
  return fallback;
}

export const backendUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("/api/")) return `${API_BASE}/${path.slice(5)}`;
  return path;
};

export const api = {
  health: () => apiFetch<{ status: string; voices: string[]; credit_limit: number }>("/health"),
  visitor: () => apiFetch<Visitor>("/visitor"),
  voices: () => apiFetch<{ voices: string[] }>("/voices"),
  publicVoices: () => apiFetch<{ voices: unknown[] }>("/voices?scope=public"),
  generate: (body: GenerateRequest) => apiFetch<GenerateResult>("/generate", { method: "POST", body: JSON.stringify(body) }),
  createJob: (body: GenerateRequest) => apiFetch<{ job_id: string; status_url: string; job: JobRecord }>("/jobs", { method: "POST", body: JSON.stringify(body) }),
  jobs: () => apiFetch<{ jobs: JobRecord[] }>("/dashboard/history"),
  job: async (id: string) => {
    const data = await apiFetch<JobRecord | { job: JobRecord }>(`/jobs/${id}`);
    return "job" in data ? data.job : data;
  },
  deleteJob: (id: string) => apiFetch<{ deleted: string }>(`/jobs/${id}`, { method: "DELETE" }),
  uploadVoice: (file: File) => {
    const body = new FormData();
    body.set("audio", file);
    body.set("name", file.name.replace(/\.[^.]+$/, ""));
    body.set("gender", "Neutral");
    body.set("language", "Khmer");
    body.set("legal_agreement", "true");
    body.set("agreement", "true");
    return proxyFetch<{ voice_clone: VoiceClone }>("/voice-clones", { method: "POST", body });
  },
  createVoiceClone: (file: File, fields: { name: string; gender: string; language: string }) => {
    const body = new FormData();
    body.set("audio", file);
    body.set("name", fields.name);
    body.set("gender", fields.gender);
    body.set("language", fields.language);
    body.set("legal_agreement", "true");
    body.set("agreement", "true");
    return proxyFetch<{ voice_clone: VoiceClone }>("/voice-clones", { method: "POST", body });
  },
  userVoiceClones: () => proxyFetch<{ voice_clones: VoiceClone[] }>("/voice-clones"),
  patchVoiceClone: (id: string | number, body: Partial<VoiceClone>) => proxyFetch<{ voice_clone: VoiceClone }>(`/voice-clones/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteVoiceClone: (id: string | number) => proxyFetch<unknown>(`/voice-clones/${id}`, { method: "DELETE" }),
  verificationStatus: () => apiFetch<VerificationStatusResponse>("/verification/status"),
  submitVerification: (body: FormData) => apiFetch<VerificationStatusResponse>("/verification/submit", { method: "POST", body }),
  notifications: () => apiFetch<{ notifications: NotificationRecord[]; unread: number }>("/notifications"),
  markNotificationsRead: () => apiFetch<{ success: boolean }>("/notifications/read-all", { method: "PATCH", body: JSON.stringify({}) }),
  deleteNotification: (id: string | number) => apiFetch<unknown>(`/notifications/${id}`, { method: "DELETE" }),
  clearNotifications: () => apiFetch<unknown>("/notifications", { method: "DELETE" }),
  me: async () => {
    const data = await proxyFetch<AuthUser | { user: AuthUser }>("/auth/me");
    return "user" in data ? data.user : data;
  },
  login: (email: string, password: string, totp_code?: string) => proxyFetch<{ user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password, totp_code }) }),
  register: (email: string, password: string, full_name: string, newsletter = false) => proxyFetch<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name, newsletter }),
  }),
  logout: () => proxyFetch<{ success: boolean }>("/auth/logout", { method: "POST", body: JSON.stringify({}) }),
  logoutAll: () => proxyFetch<unknown>("/auth/logout-all", { method: "POST", body: JSON.stringify({}) }),
  refresh: () => proxyFetch<{ success: boolean }>("/auth/refresh", { method: "POST", body: JSON.stringify({}) }),
  forgotPassword: (email: string) => proxyFetch<unknown>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, new_password: string) => proxyFetch<unknown>("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, code, new_password }) }),
  resendEmailOtp: (email: string) => proxyFetch<unknown>("/auth/resend-email-otp", { method: "POST", body: JSON.stringify({ email }) }),
  verifyEmailOtp: (email: string, code: string) => proxyFetch<unknown>("/auth/verify-email-otp", { method: "POST", body: JSON.stringify({ email, code }) }),
  sessions: () => proxyFetch<{ sessions: UserSession[] }>("/auth/sessions"),
  revokeSession: (id: string | number) => proxyFetch<unknown>(`/auth/sessions/${id}`, { method: "DELETE" }),
  totpSetup: () => proxyFetch<{ secret: string; url: string }>("/auth/totp/setup", { method: "POST", body: JSON.stringify({}) }),
  totpEnable: (code: string) => proxyFetch<unknown>("/auth/totp/enable", { method: "POST", body: JSON.stringify({ code }) }),
  totpDisable: () => proxyFetch<unknown>("/auth/totp/disable", { method: "POST", body: JSON.stringify({}) }),
  googleLoginUrl: () => `${API_BASE}/auth/google/login`,
  userApiKeys: () => proxyFetch<{ api_keys?: ApiKey[]; keys?: ApiKey[] }>("/user/api-keys"),
  createUserApiKey: (body: Record<string, unknown>) => proxyFetch<{ api_key: ApiKey; token?: string }>("/user/api-keys", { method: "POST", body: JSON.stringify(body) }),
  patchUserApiKey: (id: string, body: Record<string, unknown>) => proxyFetch<{ api_key: ApiKey }>(`/user/api-keys/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  regenerateUserApiKey: (id: string) => proxyFetch<{ api_key: ApiKey; token?: string }>(`/user/api-keys/${id}/regenerate`, { method: "POST", body: JSON.stringify({}) }),
  deleteUserApiKey: (id: string) => proxyFetch<{ deleted?: string }>(`/user/api-keys/${id}`, { method: "DELETE" }),
  userApiLogs: () => proxyFetch<{ logs: ApiLog[] }>("/user/api-logs"),
  userApiUsage: () => proxyFetch<ApiUsage>("/user/api-usage"),
  adminApiKeys: () => proxyFetch<{ api_keys: ApiKey[] }>("/admin/api-keys"),
  adminApiLogs: () => proxyFetch<{ logs: ApiLog[] }>("/admin/api-logs"),
  adminUsers: () => proxyFetch<{ users: AuthUser[] }>("/admin/users"),
  adminUser: (id: string) => proxyFetch<{ user: AuthUser }>(`/admin/users/${id}`),
  adminCreateUser: (body: Record<string, unknown>) => proxyFetch<{ user: AuthUser }>("/admin/users", { method: "POST", body: JSON.stringify(body) }),
  adminPatchUser: (id: string, body: Record<string, unknown>) => proxyFetch<unknown>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminDeleteUser: (id: string) => proxyFetch<unknown>(`/admin/users/${id}`, { method: "DELETE" }),
  adminApproveUser: (id: string) => proxyFetch<unknown>(`/admin/users/${id}/approve`, { method: "PATCH", body: JSON.stringify({}) }),
  adminRejectUser: (id: string) => proxyFetch<unknown>(`/admin/users/${id}/reject`, { method: "PATCH", body: JSON.stringify({}) }),
  adminUpdateUserStatus: (id: string, status: string) => proxyFetch<unknown>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  adminUpdateUserRole: (id: string, role: string) => proxyFetch<unknown>(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  adminUpdateUserPlan: (id: string, plan_id: number | null) => proxyFetch<unknown>(`/admin/users/${id}/plan`, { method: "PATCH", body: JSON.stringify({ plan_id }) }),
  adminUpdateUserCredits: (id: string, credits_total: number, credits_used: number) => proxyFetch<unknown>(`/admin/users/${id}/credits`, { method: "PATCH", body: JSON.stringify({ credits_total, credits_used }) }),
  adminUpdateUserApiAccess: (id: string, enabled: boolean) => proxyFetch<unknown>(`/admin/users/${id}/api-access`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  adminUpdateUserVoiceClones: (id: string, voice_clone_limit: number) => proxyFetch<unknown>(`/admin/users/${id}/voice-clones`, { method: "PATCH", body: JSON.stringify({ voice_clone_limit }) }),
  adminLogoutAllUserDevices: (id: string) => proxyFetch<unknown>(`/admin/users/${id}/logout-all`, { method: "POST", body: JSON.stringify({}) }),
  adminResendVerification: (id: string) => proxyFetch<unknown>(`/admin/users/${id}/resend-verification`, { method: "POST", body: JSON.stringify({}) }),
  adminMarkEmailVerified: (id: string) => proxyFetch<unknown>(`/admin/users/${id}/mark-email-verified`, { method: "POST", body: JSON.stringify({}) }),
  adminUserSessions: (id: string) => proxyFetch<{ sessions: UserSession[] }>(`/admin/users/${id}/sessions`),
  adminRevokeUserSession: (id: string, sessionId: string | number) => proxyFetch<unknown>(`/admin/users/${id}/sessions/${sessionId}`, { method: "DELETE" }),
  adminUserApiKeys: (id: string) => proxyFetch<{ api_keys: ApiKey[] }>(`/admin/users/${id}/api-keys`),
  adminRevokeUserApiKey: (id: string, keyId: string | number) => proxyFetch<unknown>(`/admin/users/${id}/api-keys/${keyId}`, { method: "DELETE" }),
  adminUserActivityLogs: (id: string) => proxyFetch<{ logs: ActivityLog[] }>(`/admin/users/${id}/activity-logs`),
  adminUserPurchases: (id: string) => proxyFetch<{ purchases: PurchaseRecord[] }>(`/admin/users/${id}/purchases`),
  adminUserVoiceClonesList: (id: string) => proxyFetch<{ voice_clones: VoiceClone[] }>(`/admin/users/${id}/voice-clones`),
  adminDeleteUserVoiceClone: (id: string, cloneId: string | number) => proxyFetch<unknown>(`/admin/users/${id}/voice-clones/${cloneId}`, { method: "DELETE" }),
  adminUserVerification: (id: string) => proxyFetch<{ verification: IdentityVerification | null }>(`/admin/users/${id}/identity-verification`),
  adminPatchUserVerification: (id: string, body: Partial<IdentityVerification>) => proxyFetch<{ verification: IdentityVerification }>(`/admin/users/${id}/identity-verification`, { method: "PATCH", body: JSON.stringify(body) }),
  adminSecuritySettings: () => proxyFetch<SecuritySettings | { settings: SecuritySettings }>("/admin/security/settings"),
  adminPatchSecuritySettings: (settings: SecuritySettings) => proxyFetch<unknown>("/admin/security/settings", { method: "PATCH", body: JSON.stringify(settings) }),
  adminSecurityLogs: () => proxyFetch<{ logs: ActivityLog[] }>("/admin/security/logs"),
  adminPlans: () => proxyFetch<{ plans: PricingPlan[] }>("/admin/plans"),
  adminCreatePlan: (body: Partial<PricingPlan>) => proxyFetch<{ plan: PricingPlan }>("/admin/plans", { method: "POST", body: JSON.stringify(body) }),
  adminPatchPlan: (id: number, body: Partial<PricingPlan>) => proxyFetch<unknown>(`/admin/plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminDeletePlan: (id: number) => proxyFetch<unknown>(`/admin/plans/${id}`, { method: "DELETE" }),
  adminVerifications: () => proxyFetch<{ items: VerificationSubmission[] }>("/admin/identity-verifications"),
  approveVerification: (id: string) => proxyFetch<VerificationStatusResponse>(`/admin/identity-verifications/${id}/approve`, { method: "PATCH", body: JSON.stringify({}) }),
  rejectVerification: (id: string, reason: string) => proxyFetch<VerificationStatusResponse>(`/admin/identity-verifications/${id}/reject`, { method: "PATCH", body: JSON.stringify({ note: reason }) }),
  suspiciousVerification: (id: string, note: string) => proxyFetch<VerificationStatusResponse>(`/admin/identity-verifications/${id}/reject`, { method: "PATCH", body: JSON.stringify({ note }) }),
  createAdminApiKey: (body: Record<string, unknown>) => proxyFetch<{ api_key: ApiKey; token?: string }>("/admin/api-keys", { method: "POST", body: JSON.stringify(body) }),
  patchAdminApiKey: (id: string, body: Record<string, unknown>) => proxyFetch<{ api_key: ApiKey }>(`/admin/api-keys/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  regenerateAdminApiKey: (id: string) => proxyFetch<{ api_key: ApiKey; token?: string }>(`/admin/api-keys/${id}/regenerate`, { method: "POST", body: JSON.stringify({}) }),
  deleteAdminApiKey: (id: string) => proxyFetch<{ deleted?: string }>(`/admin/api-keys/${id}`, { method: "DELETE" }),
  v1: (path: string, init?: RequestInit) => proxyFetch<unknown>(`/v1${path}`, init),
};
