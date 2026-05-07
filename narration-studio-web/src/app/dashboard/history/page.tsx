"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExpandableAudioTable, type ExpandableAudioRow } from "@/components/ExpandableAudioTable";
import { Shell } from "@/components/Shell";
import { api, backendUrl } from "@/lib/api";
import type { JobRecord } from "@/lib/types";

function voiceMeta(voice?: string | null) {
  if (!voice) return "Design voice";
  const filename = voice.split("/").pop() || voice;
  return filename.replace(/^[a-f0-9]{8,}[-_]/i, "").replace(/\.(mp3|wav|ogg|m4a|webm)$/i, "").replace(/[-_]/g, " ");
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "-";
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const rest = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function jobCreatedAt(value: JobRecord["created_at"]) {
  if (typeof value === "number") return new Date(value * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function jobAudioUrl(job: JobRecord) {
  return backendUrl(job.result?.download_url || job.audio_url || "");
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  async function load() {
    setLoading(true);
    try {
      const data = await api.jobs();
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch {
      toast.error("Could not load history.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  const totalPages = Math.max(1, Math.ceil(jobs.length / pageSize));
  const visibleJobs = jobs.slice((page - 1) * pageSize, page * pageSize);
  const rows: ExpandableAudioRow[] = visibleJobs.map((job) => ({
    id: job.id,
    voice: voiceMeta(job.request?.voice || job.voice),
    source: `${job.label || job.request?.user_name || "Narration Studio"} · ${job.request?.mode || job.model || job.status}`,
    duration: formatDuration(job.result?.duration_sec),
    created: jobCreatedAt(job.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    audioUrl: jobAudioUrl(job),
    onDelete: async () => {
      await api.deleteJob(job.id);
      toast.success("Deleted.");
      await load();
    },
  }));

  return (
    <Shell>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">History</h1>
          <p className="mt-2 text-neutral-600">Generated jobs from the backend.</p>
        </div>
        <button className="btn secondary" onClick={load}>Refresh</button>
      </div>
      <div className="mt-6 grid gap-4">
        {loading ? <p className="p-5">Loading jobs...</p> : null}
        {!loading ? <ExpandableAudioTable rows={rows} emptyMessage="No jobs yet." /> : null}
        {jobs.length > pageSize ? (
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
            <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <p className="text-sm font-bold text-neutral-600">Page {page} of {totalPages}</p>
            <button className="btn secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
