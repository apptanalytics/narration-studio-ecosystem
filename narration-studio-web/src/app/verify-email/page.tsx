"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResendEmailOtpMutation, useVerifyEmailOtpMutation } from "@/store/api/authApi";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifyEmailOtp, { isLoading: loading }] = useVerifyEmailOtpMutation();
  const [resendEmailOtp] = useResendEmailOtpMutation();

  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get("email") || "");
  }, []);

  async function verify() {
    try {
      await verifyEmailOtp({ email: email.trim(), code: code.trim() }).unwrap();
      toast.success("Email verified. Admin approval is required before login.");
      window.location.href = `/account-pending?email=${encodeURIComponent(email.trim())}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify email.");
    }
  }

  async function resend() {
    try {
      await resendEmailOtp({ email: email.trim() }).unwrap();
      toast.success("Verification code sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend code.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="card w-full max-w-md p-6">
        <Link href="/" className="text-sm font-bold text-neutral-500 hover:text-neutral-950">Narration Studio</Link>
        <h1 className="mt-4 text-3xl font-black">Verify Email</h1>
        <p className="mt-2 text-sm text-neutral-600">Enter the 6 digit OTP sent to your email.</p>
        <div className="mt-5 space-y-4">
          <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></div>
          <div className="space-y-2"><Label>Verification code</Label><Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} /></div>
        </div>
        <button className="btn mt-5 w-full" onClick={() => void verify()} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify email</button>
        <button className="btn secondary mt-3 w-full" onClick={() => void resend()}>Resend code</button>
      </div>
    </main>
  );
}
