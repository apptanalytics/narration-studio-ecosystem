export type StudioMode = "clone" | "design" | "ultimate";

export type GenerateRequest = {
  text: string;
  voice?: string | null;
  mode: StudioMode;
  control?: string | null;
  prompt_text?: string | null;
  user_name?: string | null;
  output_name?: string | null;
  max_chars: number;
  cfg_value: number;
  inference_timesteps: number;
  normalize: boolean;
  denoise: boolean;
};

export type GenerateResult = {
  job_id: string;
  download_url: string;
  wav_url?: string;
  mp3_url?: string;
  mode: StudioMode;
  voice: string | null;
  credits_used: number;
  credit_limit: number;
  chunks: number;
  duration_sec: number;
  sample_rate: number;
};

export type JobRecord = {
  id: string;
  status: "pending" | "queued" | "running" | "completed" | "done" | "failed" | "error" | "cancelled";
  request: GenerateRequest & { text_credits?: number };
  created_at: number | string;
  updated_at?: number | string;
  label?: string | null;
  result?: GenerateResult | null;
  error?: string | null;
  text?: string;
  voice?: string;
  model?: string;
  audio_url?: string;
  error_message?: string;
  credits_used?: number;
  total_chunks?: number;
  completed_chunks?: number;
};

export type Visitor = {
  visitor_id: string;
  ip: string;
  queue_limit?: number;
  credit_limit: number;
  generation_limit: number;
  generation_used: number;
  generation_remaining: number;
  admin_allowed?: boolean;
  ultimate_clone_allowed?: boolean;
  auth_user?: AuthUser | null;
};

export type VerificationStatus = "not_submitted" | "pending" | "pending_review" | "verified" | "approved" | "rejected" | "suspicious";

export type VerificationSubmission = {
  id: string;
  user_id?: string;
  user?: string;
  legal_name: string;
  date_of_birth: string;
  country: string;
  document_type: string;
  document_number: string;
  status: VerificationStatus;
  rejection_reason?: string | null;
  internal_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  document_front_url?: string;
  document_back_url?: string | null;
  selfie_url?: string;
};

export type VerificationStatusResponse = {
  status: VerificationStatus;
  user_status?: VerificationStatus;
  submission: VerificationSubmission | null;
};

export type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  full_name?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  role?: string;
  status?: string;
  email_verified?: boolean;
  admin_verified?: boolean;
  plan_id?: number | null;
  plan?: PricingPlan | null;
  credits_total?: number;
  credits_used?: number;
  credit_period_started_at?: string | null;
  credits_reset_at?: string | null;
  api_access_enabled?: boolean;
  two_factor_enabled?: boolean;
  voice_clone_limit?: number;
  voice_clones_used?: number;
  provider?: string;
  google_id?: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  verification_status?: VerificationStatus;
};

export type IdentityVerification = {
  id: string | number;
  user_id?: string | number;
  legal_name?: string;
  date_of_birth?: string;
  country?: string;
  document_type?: string;
  document_number?: string;
  document_front_url?: string;
  document_back_url?: string;
  selfie_url?: string;
  status?: string;
  reviewed_by_admin_id?: string | number | null;
  review_note?: string;
  created_at?: string;
  updated_at?: string;
  reviewed_at?: string | null;
};

export type UserSession = {
  id: string | number;
  session_id?: string;
  device_name?: string;
  ip_address?: string;
  user_agent?: string;
  is_active?: boolean;
  created_at?: string;
  last_used_at?: string;
  expires_at?: string;
  revoked_at?: string | null;
};

export type VoiceClone = {
  id: string | number;
  name?: string;
  gender?: string;
  language?: string;
  audio_url?: string;
  status?: string;
  created_at?: string;
};

export type PurchaseRecord = {
  id: string | number;
  plan?: string;
  amount?: string | number;
  status?: string;
  credits_added?: number;
  invoice?: string;
  created_at?: string;
};

export type ActivityLog = {
  id: string | number;
  action?: string;
  metadata_json?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
};

export type SecuritySettings = {
  require_email_verification: boolean;
  require_identity_verification_for_clones?: boolean;
  require_identity_verification_for_voice_cloning: boolean;
  require_2fa_for_admins: boolean;
  require_passkey_for_admins: boolean;
  allow_registration: boolean;
  login_alert_emails: boolean;
  session_expiration_minutes: number;
  otp_expiry_minutes: number;
  otp_max_attempts: number;
  password_reset_enabled: boolean;
  google_login_enabled: boolean;
  sessions_tracked?: boolean;
  two_factor_ready?: boolean;
  passkeys_ready?: boolean;
  email_alerts_ready?: boolean;
};

export type PricingPlan = {
  id: number;
  name: string;
  slug: string;
  price_monthly: number;
  credits: number;
  api_requests_limit: number;
  api_access_enabled: boolean;
  voice_clone_limit: number;
  max_text_chars?: number;
  is_active: boolean;
};

export type ApiKey = {
  id: string;
  name: string;
  token_prefix: string;
  token_preview?: string;
  status?: string;
  enabled: boolean;
  requests: number;
  last_used_at: number | null;
  allowed_origins?: string[];
  allowed_ips?: string[];
  allowed_methods?: string[];
  allowed_headers?: string[];
  machine_name?: string | null;
  monthly_request_limit?: number | null;
  created_at?: number;
  updated_at?: number;
  regenerated_at?: number | null;
  user_email?: string;
};

export type ApiLog = {
  id: string;
  key?: string;
  endpoint: string;
  method: string;
  status_code: number;
  origin?: string;
  ip_address?: string;
  credits_used?: number;
  error_code?: string | null;
  error_message?: string | null;
  created_at: number;
};

export type ApiUsage = {
  requests_used: number;
  credits_used: number;
  successful_requests: number;
  failed_requests: number;
};
