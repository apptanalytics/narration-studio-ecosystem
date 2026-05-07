"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Mic2, Plus } from "lucide-react";
import { toast } from "sonner";
import { ActionModal } from "@/components/ActionModal";
import { ExpandableAudioTable, type ExpandableAudioRow } from "@/components/ExpandableAudioTable";
import { Shell } from "@/components/Shell";
import { API_BASE, api } from "@/lib/api";
import type { VoiceClone } from "@/lib/types";

function voiceMeta(voice: string) {
  const filename = voice.split("/").pop() || voice;
  const name = filename.replace(/^[a-f0-9]{12}_/, "").replace(/\.(mp3|wav|ogg|m4a|webm)$/i, "").replace(/[-_]/g, " ");
  const gender = /female/i.test(filename) ? "Female" : /male/i.test(filename) ? "Male" : "Neutral";
  const language = /kh|khmer/i.test(filename) ? "Khmer" : "Other";
  return { filename, name, gender, language };
}

export default function VoiceClonesPage() {
  const [voices, setVoices] = useState<VoiceClone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<VoiceClone | null>(null);
  const [form, setForm] = useState({ name: "", gender: "Neutral", language: "Khmer" });
  const [page, setPage] = useState(1);
  const pageSize = 5;

  async function load() {
    setLoading(true);
    try {
      const data = await api.userVoiceClones();
      setVoices(Array.isArray(data.voice_clones) ? data.voice_clones : []);
    } catch {
      toast.error("Could not load voices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  function openEdit(voice: VoiceClone) {
    const meta = voiceMeta(voice.audio_url || "");
    setEditing(voice);
    setForm({
      name: voice.name || meta.name,
      gender: voice.gender || meta.gender,
      language: voice.language || meta.language,
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patchVoiceClone(editing.id, form);
      toast.success("Voice updated.");
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update voice.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteVoice(voice: VoiceClone) {
    if (!window.confirm(`Delete ${voice.name || voice.audio_url || "this voice"}?`)) return;
    setSaving(true);
    try {
      await api.deleteVoiceClone(voice.id);
      toast.success("Voice deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete voice.");
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => [
    ["Ready", voices.length],
    ["Processing", voices.filter((voice) => voice.status && voice.status !== "ready").length],
    ["Total Voices", voices.length],
    ["Total Usage", 0],
  ] as const, [voices.length]);
  const totalPages = Math.max(1, Math.ceil(voices.length / pageSize));
  const visibleVoices = voices.slice((page - 1) * pageSize, page * pageSize);
  const rows: ExpandableAudioRow[] = visibleVoices.map((voice) => {
    const audio = voice.audio_url || "";
    const meta = voiceMeta(audio);
    return {
      id: String(voice.id),
      voice: voice.name || meta.name,
      source: `Narration Studio · clone`,
      duration: "0:06",
      created: voice.created_at ? new Date(voice.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "-",
      audioUrl: audio ? `${API_BASE}/voices/preview?voice=${encodeURIComponent(audio)}` : undefined,
      onEdit: () => openEdit(voice),
      onDelete: () => deleteVoice(voice),
      editDisabled: saving,
      deleteDisabled: saving,
    };
  });

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Your Voices</h1>
          <p className="mt-2 text-neutral-600">Manage your voice library.</p>
        </div>
        <Link href="/dashboard/voice-cloning" className="btn"><Plus className="h-4 w-4" /> Add Voice</Link>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-sm font-semibold text-neutral-500">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>
      <div className="card mt-6 overflow-hidden">
        {loading ? <p className="p-5 text-neutral-600">Loading voices...</p> : null}
        {!loading && voices.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
            <Mic2 className="h-10 w-10 text-neutral-400" />
            <h2 className="mt-4 text-xl font-bold">No voices yet</h2>
            <p className="mt-2 text-neutral-600">Upload a permitted MP3 voice sample to create your first clone reference.</p>
            <Link href="/dashboard/voice-cloning" className="btn mt-5">Add Voice</Link>
          </div>
        ) : null}
        {!loading && voices.length > 0 ? (
          <div className="p-4">
            <ExpandableAudioTable rows={rows} emptyMessage="No voices yet." />
          </div>
        ) : null}
        {voices.length > pageSize ? (
          <div className="flex items-center justify-between p-4">
            <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <p className="text-sm font-bold text-neutral-600">Page {page} of {totalPages}</p>
            <button className="btn secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
          </div>
        ) : null}
      </div>
      {editing ? (
        <ActionModal
          title="Edit Voice"
          onClose={() => setEditing(null)}
          footer={(
            <>
              <button className="btn secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
              <button className="btn" onClick={() => void saveEdit()} disabled={saving || !form.name.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </>
          )}
        >
          <div className="grid gap-4">
            <label className="space-y-2 text-sm font-bold">Name<input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="space-y-2 text-sm font-bold">Gender<input className="field" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })} /></label>
            <label className="space-y-2 text-sm font-bold">Language<input className="field" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} /></label>
          </div>
        </ActionModal>
      ) : null}
    </Shell>
  );
}
