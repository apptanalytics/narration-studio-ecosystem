"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterMutation } from "@/store/api/authApi";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [registerMutation, { isLoading: loading }] = useRegisterMutation();

  async function register() {
    if (!agreed) {
      toast.error("You must agree to the policies first.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    try {
      await registerMutation({ email: email.trim(), password, full_name: fullName.trim(), newsletter }).unwrap();
      toast.success("Account created. Verify your email, then wait for admin approval.");
      router.replace(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Register failed.");
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
      <div className="card w-full max-w-lg p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-700 transition hover:text-neutral-950" aria-label="Go to Narration Studio home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-950 text-sm font-black text-white shadow-sm">N</span>
          <span>Narration Studio</span>
        </Link>
        <h1 className="mt-4 text-3xl font-black">Register</h1>
        <p className="mt-2 text-sm text-neutral-600">Create your account to use the studio dashboard.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="flex rounded-lg border border-neutral-200 bg-white focus-within:border-neutral-950 focus-within:ring-2 focus-within:ring-neutral-950/10">
              <input id="password" className="h-10 min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 text-sm outline-none" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type={showPassword ? "text" : "password"} />
              <button className="px-3 text-neutral-500" type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" type="password" />
          </div>
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm text-neutral-700">
          <input className="mt-1" type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span>
            I agree to the <Link className="font-bold text-neutral-950" href="/terms">Terms</Link>,{" "}
            <Link className="font-bold text-neutral-950" href="/privacy">Privacy Policy</Link>, and{" "}
            <Link className="font-bold text-neutral-950" href="/voice-safety-policy">Voice Safety Policy</Link>.
          </span>
        </label>
        <label className="mt-3 flex items-center gap-3 text-sm text-neutral-700">
          <input type="checkbox" checked={newsletter} onChange={(event) => setNewsletter(event.target.checked)} />
          <span>Send me product updates and newsletter</span>
        </label>
        <button className="btn mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={!agreed || loading || googleLoading} onClick={register}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Register
        </button>
        <p className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm font-semibold text-neutral-700">After registration, email OTP verification and admin approval are required before login.</p>
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs font-bold uppercase text-neutral-500">or</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>
        <div className="grid gap-3">
          <button
            className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-900 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={continueWithGoogle}
            disabled={googleLoading || loading}
            type="button"
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="grid h-6 w-6 place-items-center rounded-full border border-neutral-200 text-sm font-black text-blue-600">G</span>}
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
          Already have an account? <Link className={`font-bold text-neutral-950 ${googleLoading ? "pointer-events-none opacity-50" : ""}`} href="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}
