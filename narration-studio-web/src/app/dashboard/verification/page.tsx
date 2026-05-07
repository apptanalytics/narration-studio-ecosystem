"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { VerificationStatusResponse } from "@/lib/types";

const BRAND_NAME = "Narration Studio";
const fileAccept = "image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf";

export default function VerificationPage() {
  const [status, setStatus] = useState<VerificationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<Record<string, File | null>>({ document_front: null, document_back: null, selfie: null });

  useEffect(() => {
    api.verificationStatus().then(setStatus).catch(() => toast.error("Could not load verification status.")).finally(() => setLoading(false));
  }, []);

  function pick(name: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0) ?? null;
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error("Files must be 10MB or smaller.");
      return;
    }
    setFiles((current) => ({ ...current, [name]: file }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!files.document_front || !files.selfie) {
      toast.error("Document front and selfie are required.");
      return;
    }
    form.set("document_front", files.document_front);
    form.set("selfie", files.selfie);
    if (files.document_back) form.set("document_back", files.document_back);
    setSubmitting(true);
    try {
      const next = await api.submitVerification(form);
      setStatus(next);
      toast.success("Verification submitted for review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const current = status?.status || "not_submitted";

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Identity Verification</h1>
          <p className="mt-2 text-neutral-600">Complete identity verification before creating voice clones on {BRAND_NAME}.</p>
        </div>
        <span className="rounded-full bg-neutral-950 px-3 py-2 text-sm font-bold text-white">{current.replace("_", " ")}</span>
      </div>

      <div className="card mt-6 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-neutral-500" />
          <div>
            <h2 className="font-bold">Verification status</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {current === "verified" ? "Your identity verification has been approved." : current === "pending_review" ? "Verification pending. An admin will review your submission." : current === "rejected" ? `Rejected: ${status?.submission?.rejection_reason || "Please resubmit your verification."}` : "Submit your verification to unlock voice cloning."}
            </p>
          </div>
        </div>
      </div>

      {loading ? <p className="mt-6 text-neutral-600">Loading...</p> : null}
      {current !== "verified" && current !== "pending_review" ? (
        <form className="card mt-6 grid gap-4 p-5" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Full legal name</Label><Input name="legal_name" required /></div>
            <div className="space-y-2"><Label>Date of birth</Label><Input name="date_of_birth" type="date" required /></div>
            <div className="space-y-2"><Label>Country</Label><Input name="country" required /></div>
            <div className="space-y-2">
              <Label>Document type</Label>
              <select name="document_type" className="field" required>
                <option>National ID card</option>
                <option>Passport</option>
                <option>Driver license</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Document number</Label><Input name="document_number" required /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["document_front", "Document front"],
              ["document_back", "Document back"],
              ["selfie", "Selfie / face photo"],
            ].map(([name, label]) => (
              <label key={name} className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center hover:bg-neutral-100">
                <UploadCloud className="h-6 w-6 text-neutral-500" />
                <span className="mt-2 text-sm font-bold">{label}</span>
                <span className="mt-1 text-xs text-neutral-500">{files[name]?.name || "JPG, PNG, PDF · max 10MB"}</span>
                <input className="hidden" type="file" accept={fileAccept} required={name !== "document_back"} onChange={(event) => pick(name, event)} />
              </label>
            ))}
          </div>
          <button className="btn w-fit disabled:opacity-50" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit verification
          </button>
        </form>
      ) : null}
    </Shell>
  );
}
