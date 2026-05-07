"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { VerificationStatusResponse } from "@/lib/types";

const accepted = "audio/mpeg,.mp3,audio/wav,.wav,audio/ogg,.ogg,audio/mp4,.m4a,audio/webm,.webm";

export default function VoiceCloningPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [gender, setGender] = useState("Male");
  const [language, setLanguage] = useState("Khmer");
  const [consent, setConsent] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [verification, setVerification] = useState<VerificationStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const verified = verification?.status === "verified" || verification?.status === "approved";

  useEffect(() => {
    api.verificationStatus().then(setVerification).catch(() => undefined);
  }, []);

  function pick(next: File | null) {
    setFile(next);
    if (next && !voiceName) setVoiceName(next.name.replace(/\.[^.]+$/, ""));
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    pick(event.dataTransfer.files.item(0));
  }

  async function upload() {
    if (!file) {
      toast.error("Choose an audio file first.");
      return;
    }
    if (!consent) {
      setAgreementOpen(true);
      return;
    }
    if (!verified) {
      toast.error("Identity verification is required before creating a voice clone.");
      return;
    }
    setLoading(true);
    try {
      await api.createVoiceClone(file, { name: voiceName || file.name.replace(/\.[^.]+$/, ""), gender, language });
      toast.success("Voice uploaded.");
      setFile(null);
      setVoiceName("");
      setConsent(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Voice upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <h1 className="text-3xl font-black">Voice Cloning</h1>
      <p className="mt-2 text-neutral-600">Upload a new voice sample and create a permitted clone reference.</p>
      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-neutral-500" />
            <div>
              <p className="font-bold">Identity verification</p>
              <p className="mt-1 text-sm text-neutral-600">
                {verified ? "Verified. You can create voice clones." : verification?.status === "pending_review" ? "Verification pending. Voice clone creation is disabled until approval." : verification?.status === "rejected" ? `Rejected: ${verification.submission?.rejection_reason || "Please resubmit."}` : "Verification is required before voice cloning."}
              </p>
            </div>
          </div>
          {!verified ? <Link className="btn secondary" href="/dashboard/verification">Open Verification</Link> : null}
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="font-bold">Voice cloning requires permission.</p>
        <p className="mt-2 text-sm text-neutral-600">Only upload your own voice or a voice you have legal permission to use.</p>
        <p className="mt-2 text-sm text-neutral-600">ការក្លូនសំឡេងត្រូវការការអនុញ្ញាត។ សូមផ្ទុកឡើងតែសំឡេងផ្ទាល់ខ្លួន ឬសំឡេងដែលអ្នកមានសិទ្ធិប្រើប្រាស់តាមច្បាប់។</p>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="card p-5">
          <input ref={inputRef} className="hidden" type="file" accept={accepted} onChange={(event: ChangeEvent<HTMLInputElement>) => pick(event.target.files?.item(0) ?? null)} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(event) => event.preventDefault()}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center transition hover:bg-neutral-100"
          >
            <UploadCloud className="h-10 w-10 text-neutral-500" />
            <span className="mt-4 font-bold">Click or drag & drop audio</span>
            <span className="mt-2 text-sm text-neutral-500">Supported: MP3, WAV, OGG, M4A, WEBM</span>
            <span className="mt-1 text-sm text-neutral-500">Recommended: clear single speaker, 5-30 seconds</span>
            {file ? <span className="mt-4 rounded-full bg-white px-3 py-1 text-sm font-semibold shadow-sm">{file.name}</span> : null}
          </button>
        </div>
        <div className="card p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voice-name">Voice name</Label>
              <Input id="voice-name" value={voiceName} onChange={(event) => setVoiceName(event.target.value)} placeholder="Rithy voice" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" className="field" value={gender} onChange={(event) => setGender(event.target.value)}>
                <option>Male</option><option>Female</option><option>Neutral</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <select id="language" className="field" value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option>Khmer</option><option>English</option><option>Other</option>
              </select>
            </div>
            <label className="flex items-start gap-3 text-sm text-neutral-700">
              <input className="mt-1" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              I accept the legal agreement for creating a voice clone on Narration Studio.
            </label>
            <button className="btn secondary w-full" onClick={() => setAgreementOpen(true)}>Read Legal Agreement</button>
            <button className="btn w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={loading || !consent || !file || !verified} onClick={upload}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Voice
            </button>
          </div>
        </div>
      </div>
      {agreementOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black">Legal Agreement</h2>
            <p className="mt-3 text-sm text-neutral-700">By creating a voice clone on Narration Studio, I confirm that:</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
              <li>I am using my own voice or have legal permission.</li>
              <li>I will NOT use this for scams, fraud, impersonation, or illegal activity.</li>
              <li>Misuse may result in account suspension, ban, and reporting to authorities.</li>
              <li>If required by law, my data may be shared with authorities.</li>
              <li>I accept full responsibility for all generated content.</li>
              <li>Narration Studio may review, disable, or delete voice clones at any time.</li>
            </ol>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn secondary" onClick={() => setAgreementOpen(false)}>Cancel</button>
              <button className="btn" onClick={() => { setConsent(true); setAgreementOpen(false); }}>I Agree</button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
