"use client";

import { useEffect, useState } from "react";
import { BarChart3, Database, FileAudio, KeyRound, Mic2, Sparkles } from "lucide-react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import type { ApiUsage, AuthUser, JobRecord } from "@/lib/types";

function Progress({ value, total }: { value: number; total: number }) {
  const percent = Math.min(100, Math.round((value / Math.max(total, 1)) * 100));
  return <div className="mt-3 h-2 rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-950" style={{ width: `${percent}%` }} /></div>;
}

function UnlimitedProgress() {
  return <div className="mt-3 h-2 rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-950" style={{ width: "100%" }} /></div>;
}

function formatReset(value?: string | null) {
  if (!value) return "Setting up";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Setting up";
  const diff = date.getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diff / 86_400_000));
  return `${days} day${days === 1 ? "" : "s"} · ${date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function UsagePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiUsage, setApiUsage] = useState<ApiUsage | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const creditsUsed = Number(user?.credits_used || 0);
  const creditsTotal = Number(user?.credits_total || user?.plan?.credits || 0);
  const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
  const apiUsed = Number(apiUsage?.requests_used || 0);
  const apiLimit = Number(user?.plan?.api_requests_limit || 0);
  const cloneUsed = Number(user?.voice_clones_used || 0);
  const cloneLimit = Number(user?.voice_clone_limit ?? user?.plan?.voice_clone_limit ?? 0);
  const audioFiles = jobs.filter((job) => Boolean(job.result?.download_url || job.audio_url)).length;
  const displayLimit = (value: number) => Number.isFinite(value) ? String(value) : "Unlimited";
  const isUnlimited = (value: number) => value < 0;

  useEffect(() => {
    api.me().then(setUser).catch(() => undefined);
    api.userApiUsage().then(setApiUsage).catch(() => undefined);
    api.jobs().then((data) => setJobs(Array.isArray(data.jobs) ? data.jobs : [])).catch(() => undefined);
  }, []);

  const stats = [
    ["Credits Used", `${creditsUsed}`, BarChart3],
    ["Credits Remaining", `${creditsRemaining}`, Sparkles],
    ["Monthly Reset", formatReset(user?.credits_reset_at), Sparkles],
    ["API Requests This Month", `${apiUsed} / ${isUnlimited(apiLimit) ? "Unlimited" : displayLimit(apiLimit)}`, KeyRound],
    ["Voice Clones Used", `${cloneUsed} / ${isUnlimited(cloneLimit) ? "Unlimited" : displayLimit(cloneLimit)}`, Mic2],
    ["Generations", `${jobs.length}`, FileAudio],
    ["Storage / Audio files", `${audioFiles} files`, Database],
  ] as const;

  return (
    <Shell>
      <h1 className="text-3xl font-black">Usage</h1>
      <p className="mt-2 text-neutral-600">Track account limits, generated audio, API usage, and voice clone capacity.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, value, Icon]) => (
          <div key={label} className="card p-5">
            <Icon className="h-5 w-5 text-neutral-500" />
            <p className="mt-4 text-sm font-semibold text-neutral-500">{label}</p>
            <p className="mt-1 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-bold">Credits used / total</h2>
          <p className="mt-2 text-sm text-neutral-600">{creditsUsed} / {creditsTotal}</p>
          <Progress value={creditsUsed} total={creditsTotal} />
        </div>
        <div className="card p-5">
          <h2 className="font-bold">API requests used / limit</h2>
          <p className="mt-2 text-sm text-neutral-600">{apiUsed} / {isUnlimited(apiLimit) ? "Unlimited" : displayLimit(apiLimit)}</p>
          {isUnlimited(apiLimit) ? <UnlimitedProgress /> : <Progress value={apiUsed} total={apiLimit} />}
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Voice clones used / limit</h2>
          <p className="mt-2 text-sm text-neutral-600">{cloneUsed} / {isUnlimited(cloneLimit) ? "Unlimited" : displayLimit(cloneLimit)}</p>
          {isUnlimited(cloneLimit) ? <UnlimitedProgress /> : <Progress value={cloneUsed} total={cloneLimit} />}
        </div>
      </div>
    </Shell>
  );
}
