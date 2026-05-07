"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearRememberedEmail, setPendingLogin, setRememberedEmail, setRequires2FA } from "@/store/authSlice";
import { useLoginMutation } from "@/store/api/authApi";
import { normalizeApiError } from "@/store/api/baseApi";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const rememberedEmail = useAppSelector((state) => state.auth.rememberedEmail);
  const requires2FA = useAppSelector((state) => state.auth.requires2FA);
  const [next, setNext] = useState("/dashboard/studio");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginMutation, { isLoading: loading }] = useLoginMutation();

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("next");
    if (value?.startsWith("/dashboard")) setNext(value);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
  }, [rememberedEmail]);

  async function login() {
    if (!email.trim() || !password) {
      toast.error("Email and password are required.");
      return;
    }
    try {
      await loginMutation({ email: email.trim(), password, totp_code: requires2FA ? totpCode.trim() : undefined }).unwrap();
      if (remember) dispatch(setRememberedEmail(email.trim()));
      else dispatch(clearRememberedEmail());
      toast.success("Logged in.");
      router.replace(next);
    } catch (error) {
      const appError = normalizeApiError(error);
      const message = appError.message;
      if (message.includes("Two-factor") || message.includes("2FA") || message.includes("authenticator")) {
        dispatch(setRequires2FA(true));
        dispatch(setPendingLogin({ email: email.trim() }));
        toast.error("Enter your authenticator app code to finish login.");
      } else if (message.includes("disabled")) router.push("/account-disabled");
      else if (message.includes("Admin approval")) router.push(`/account-pending?email=${encodeURIComponent(email.trim())}`);
      else if (message.includes("Verify your email") || message.includes("EMAIL_NOT_VERIFIED")) router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      else toast.error(message.includes("not found") ? "Account not found." : message.includes("Invalid") ? "Invalid email or password." : message);
    }
  }

  function continueWithGoogle() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!backendUrl) {
      toast.error("Backend API URL is not configured");
      return;
    }
    try {
      setGoogleLoading(true);
      window.location.href = `${backendUrl}/api/auth/google/login`;
    } catch {
      setGoogleLoading(false);
      toast.error("Could not start Google login");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="card w-full max-w-lg p-7">
        <Link href="/" className="mx-auto flex w-fit items-center gap-3 text-neutral-800 transition hover:text-neutral-950" aria-label="Go to Narration Studio home">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-neutral-950 text-lg font-black text-white shadow-sm">N</span>
          <span className="text-lg font-black tracking-tight">Narration Studio</span>
        </Link>
        <h1 className="mt-7 text-center text-3xl font-black">Login</h1>
        <p className="mt-2 text-center text-sm text-neutral-600">Continue to your studio dashboard.</p>
        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="flex rounded-lg border border-neutral-200 bg-white focus-within:border-neutral-950 focus-within:ring-2 focus-within:ring-neutral-950/10">
              <input id="password" className="h-10 min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 text-sm outline-none" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" onKeyDown={(event) => { if (event.key === "Enter") void login(); }} />
              <button className="px-3 text-neutral-500" type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          {requires2FA ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="space-y-2">
                <Label htmlFor="totp">Authenticator code</Label>
                <Input id="totp" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="6 digit code" inputMode="numeric" maxLength={6} onKeyDown={(event) => {
                  if (event.key === "Enter") void login();
                }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-neutral-600">2FA is enabled for this account. Enter the code from Google Authenticator or your authenticator app.</p>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 font-semibold text-neutral-700"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember email</label>
          <Link className="font-bold text-neutral-950" href="/forgot-password">Forgot password?</Link>
        </div>
        <button className="btn mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={loading || googleLoading} onClick={login}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Login
        </button>
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs font-bold uppercase text-neutral-500">or</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>
        <div className="grid gap-3">
          <button
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 text-base font-black text-neutral-950 shadow-sm transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={continueWithGoogle}
            disabled={googleLoading || loading}
            type="button"
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="grid h-7 w-7 place-items-center rounded-full border border-neutral-200 text-base font-black text-blue-600">G</span>}
            {googleLoading ? "Redirecting to Google..." : "Sign in with Google"}
          </button>
          <button
            className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold text-neutral-400"
            disabled
            title="Reddit OAuth is not configured yet"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-neutral-200 text-sm font-black text-orange-500">R</span>
            Continue with Reddit
            <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-neutral-500">Soon</span>
          </button>
        </div>
        <p className="mt-5 text-sm text-neutral-600">
          No account? <Link className={`font-bold text-neutral-950 ${googleLoading ? "pointer-events-none opacity-50" : ""}`} href="/register">Register</Link>
        </p>
      </div>
    </main>
  );
}
