"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPasswordMutation } from "@/store/api/authApi";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [resetPassword, { isLoading: loading }] = useResetPasswordMutation();

  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get("email") || "");
  }, []);

  async function submit() {
    try {
      await resetPassword({ email: email.trim(), code: code.trim(), new_password: password }).unwrap();
      toast.success("Password reset. Please login again.");
      window.location.href = "/login";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset password.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="card w-full max-w-md p-6">
        <Link href="/" className="text-sm font-bold text-neutral-500 hover:text-neutral-950">Narration Studio</Link>
        <h1 className="mt-4 text-3xl font-black">Reset Password</h1>
        <div className="mt-5 space-y-4">
          <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></div>
          <div className="space-y-2"><Label>Reset code</Label><Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" /></div>
          <div className="space-y-2"><Label>New password</Label><Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></div>
        </div>
        <button className="btn mt-5 w-full" onClick={() => void submit()} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Reset password</button>
      </div>
    </main>
  );
}
