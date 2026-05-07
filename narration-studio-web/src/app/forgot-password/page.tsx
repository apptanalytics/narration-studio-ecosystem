"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPasswordMutation } from "@/store/api/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [forgotPassword, { isLoading: loading }] = useForgotPasswordMutation();

  async function submit() {
    try {
      await forgotPassword({ email: email.trim() }).unwrap();
      toast.success("If the account exists, a reset code was sent.");
      window.location.href = `/reset-password?email=${encodeURIComponent(email.trim())}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request reset.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="card w-full max-w-md p-6">
        <Link href="/" className="text-sm font-bold text-neutral-500 hover:text-neutral-950">Narration Studio</Link>
        <h1 className="mt-4 text-3xl font-black">Forgot Password</h1>
        <p className="mt-2 text-sm text-neutral-600">Enter your email to receive a password reset OTP.</p>
        <div className="mt-5 space-y-2"><Label>Email</Label><Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" /></div>
        <button className="btn mt-5 w-full" onClick={() => void submit()} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send reset code</button>
        <Link className="mt-5 block text-sm font-bold text-neutral-950" href="/login">Back to login</Link>
      </div>
    </main>
  );
}
