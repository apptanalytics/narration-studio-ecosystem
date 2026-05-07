"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Download, FileAudio, Loader2, Pause, Play, RefreshCw, Search, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, API_BASE, backendUrl } from "@/lib/api";
import { Accordion } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { VoiceWaveformPlayer } from "@/components/VoiceWaveformPlayer";
import type { AuthUser, GenerateRequest, GenerateResult, JobRecord, StudioMode, Visitor, VoiceClone } from "@/lib/types";

const ADVANCED_STORAGE_KEY = "narration_studio_advanced_settings";
const VOICE_STYLE_STORAGE_KEY = "narration_studio_voice_style";
const TEXT_DRAFT_STORAGE_KEY = "narration_studio_text_draft";
const DEFAULT_TEXT = "Hey... I just want to say congratulations. I'm really proud of you. You worked so hard for this, and you deserve it.";
const DEFAULT_VOICE_STYLE = "Act as a warm, emotional narrator. Voice: soft and caring. Tone: sincere and heartfelt. Add slight pauses for emotion. Emphasize really proud of you. Keep it natural and human.";

const examples = [
  {
    label: "Warm congratulations",
    text: "Hey... I just want to say congratulations. I'm really proud of you. You worked so hard for this, and you deserve it.",
    style: "Act as a warm, emotional narrator. Voice: soft and caring. Tone: sincere and heartfelt. Add slight pauses for emotion. Emphasize really proud of you. Keep it natural and human.",
  },
  {
    label: "Khmer welcome",
    text: "សូមស្វាគមន៍មកកាន់ Narration Studio។ សូមរីករាយជាមួយសំឡេង AI ដែលស្តាប់ទៅដូចធម្មជាតិ។",
  },
  {
    label: "Product intro",
    text: "Narration Studio helps teams generate clear, natural voiceovers for videos, products, and applications.",
  },
  {
    label: "Calm narration",
    text: "Take a slow breath and listen closely. This voice is designed to sound warm, calm, and easy to understand.",
  },
];

type Language = "en" | "km";

const studioText = {
  en: {
    studio: "Studio",
    tryDemo: "Try the voice demo",
    studioHint: "Selected voice updates the preview instantly. Apply it before generating.",
    voiceLibrary: "Voice Library",
    generateVoice: "Generate voice",
    notApplied: "Not applied",
    applied: "Applied",
    previewDuration: "Preview duration 0:06",
    clonedVoice: "Cloned voice",
    standardVoice: "Standard voice",
    play: "Play",
    pausedHint: "Paused - click play to resume.",
    tableLink: "Table link: rows generated with",
    areHighlighted: "are highlighted after Apply Voice.",
    mode: "Mode",
    voiceStyle: "Voice style",
    cancel: "Cancel",
    applyVoice: "Apply Voice",
    selectVoice: "Select Voice",
    chooseVoice: "Choose a voice for your speech generation.",
    standard: "Standard",
    cloned: "Cloned",
    searchVoices: "Search voices...",
    all: "All",
    male: "Male",
    female: "Female",
    neutral: "Neutral",
    noVoices: "No voices match this filter.",
    selectedVoice: "Select Voice",
  },
  km: {
    studio: "ស្ទូឌីយោ",
    tryDemo: "សាកល្បងសំឡេង",
    studioHint: "ជ្រើសសំឡេងដើម្បីមើលជាមុនភ្លាមៗ។ ចុចអនុវត្តសំឡេងមុនពេលបង្កើត។",
    voiceLibrary: "បណ្ណាល័យសំឡេង",
    generateVoice: "បង្កើតសំឡេង",
    notApplied: "មិនទាន់អនុវត្ត",
    applied: "បានអនុវត្ត",
    previewDuration: "រយៈពេលសាកល្បង 0:06",
    clonedVoice: "សំឡេងក្លូន",
    standardVoice: "សំឡេងស្តង់ដារ",
    play: "ចាក់",
    pausedHint: "បានផ្អាក - ចុចចាក់ដើម្បីបន្ត។",
    tableLink: "តំណតារាង៖ ជួរដែលបង្កើតដោយ",
    areHighlighted: "នឹងត្រូវបានសម្គាល់ បន្ទាប់ពីចុចអនុវត្តសំឡេង។",
    mode: "របៀប",
    voiceStyle: "រចនាប័ទ្មសំឡេង",
    cancel: "បោះបង់",
    applyVoice: "អនុវត្តសំឡេង",
    selectVoice: "ជ្រើសសំឡេង",
    chooseVoice: "ជ្រើសសំឡេងសម្រាប់ការបង្កើតសុន្ទរកថា។",
    standard: "ស្តង់ដារ",
    cloned: "ក្លូន",
    searchVoices: "ស្វែងរកសំឡេង...",
    all: "ទាំងអស់",
    male: "ប្រុស",
    female: "ស្រី",
    neutral: "អព្យាក្រឹត",
    noVoices: "គ្មានសំឡេងត្រូវនឹងតម្រងនេះទេ។",
    selectedVoice: "ជ្រើសសំឡេង",
  },
} as const;

type AdvancedSettings = {
  chunkSize: number;
  cfg: number;
  steps: number;
  outputFilename: string;
  normalize: boolean;
  denoise: boolean;
};

const defaultAdvancedSettings: AdvancedSettings = {
  chunkSize: 350,
  cfg: 2,
  steps: 10,
  outputFilename: "",
  normalize: false,
  denoise: false,
};

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function safeOutputFilename(readerName: string) {
  const base = readerName.trim() || "Narration Studio";
  return `${base.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "narration"}.wav`;
}

function voiceMeta(voice: string) {
  const filename = voice.split("/").pop() || voice;
  const name = filename.replace(/^[a-f0-9]{12}_/, "").replace(/\.(mp3|wav|ogg|m4a|webm)$/i, "").replace(/[-_]/g, " ");
  const gender = /female/i.test(filename) ? "Female" : /male/i.test(filename) ? "Male" : "Voice";
  return { filename, name, gender, language: "" };
}

function voiceMetaFromClone(voice: string, clone?: VoiceClone) {
  const fallback = voiceMeta(voice);
  if (!clone) return fallback;
  return {
    filename: fallback.filename,
    name: clone.name?.trim() || fallback.name,
    gender: clone.gender?.trim() || fallback.gender,
    language: clone.language?.trim() || fallback.language,
  };
}

function voiceGenderLabel(gender: string) {
  return gender === "Voice" ? "Neutral" : gender;
}

function isClonedVoice(voice: string) {
  const filename = voice.split("/").pop() || voice;
  return voice.startsWith("uploads/") || /^[a-f0-9]{8,}[-_]/i.test(filename);
}

function queueStatusClass(status: JobRecord["status"]) {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "running") return "border-cyan-200 bg-cyan-50 text-cyan-900";
  if (status === "queued") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-red-200 bg-red-50 text-red-900";
}

function resultAudioUrls(result?: GenerateResult | null) {
  const wav = backendUrl(result?.wav_url || result?.download_url);
  const mp3Source = result?.mp3_url || result?.download_url?.replace(/\.wav($|\?)/i, ".mp3$1");
  return {
    wav,
    mp3: backendUrl(mp3Source),
  };
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "-";
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const rest = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function timestampSeconds(value: unknown) {
  if (typeof value === "number") return value > 1000000000000 ? Math.floor(value / 1000) : value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  }
  return Math.floor(Date.now() / 1000);
}

function normalizeJobRecord(rawInput: unknown): JobRecord {
  const raw = rawInput as Partial<JobRecord> & Record<string, unknown>;
  const request = raw.request || {
    text: typeof raw.text === "string" ? raw.text : "",
    voice: typeof raw.voice === "string" ? raw.voice : null,
    mode: "clone" as StudioMode,
    control: null,
    prompt_text: null,
    user_name: "Narration",
    output_name: typeof raw.audio_url === "string" ? raw.audio_url.split("/").pop() || "narration-studio.wav" : "narration-studio.wav",
    max_chars: defaultAdvancedSettings.chunkSize,
    cfg_value: defaultAdvancedSettings.cfg,
    inference_timesteps: defaultAdvancedSettings.steps,
    normalize: false,
    denoise: false,
  };
  const rawStatus = String(raw.status || "queued").toLowerCase();
  const status = rawStatus === "pending" ? "queued" : rawStatus === "completed" ? "done" : rawStatus === "failed" ? "error" : rawStatus;
  const audioUrl = typeof raw.audio_url === "string" ? raw.audio_url : "";
  const result = raw.result || (audioUrl ? {
    job_id: String(raw.id || ""),
    download_url: audioUrl,
    wav_url: audioUrl,
    mode: request.mode,
    voice: request.voice || null,
    credits_used: typeof raw.credits_used === "number" ? raw.credits_used : 0,
    credit_limit: 0,
    chunks: typeof raw.total_chunks === "number" ? raw.total_chunks : 0,
    duration_sec: 0,
    sample_rate: 0,
  } : null);
  return {
    id: String(raw.id || ""),
    status: (["queued", "running", "done", "error"].includes(status) ? status : "queued") as JobRecord["status"],
    request,
    created_at: timestampSeconds(raw.created_at),
    updated_at: timestampSeconds(raw.updated_at || raw.completed_at || raw.started_at || raw.created_at),
    label: raw.label ? String(raw.label) : request.output_name || request.user_name || "Narration",
    result,
    error: typeof raw.error === "string" ? raw.error : typeof raw.error_message === "string" ? raw.error_message : null,
  };
}

function loadAdvancedSettings(): AdvancedSettings {
  if (typeof window === "undefined") return defaultAdvancedSettings;
  try {
    const raw = window.localStorage.getItem(ADVANCED_STORAGE_KEY);
    if (!raw) return defaultAdvancedSettings;
    const parsed = JSON.parse(raw) as Partial<AdvancedSettings>;
    return {
      chunkSize: clampNumber(Number(parsed.chunkSize ?? defaultAdvancedSettings.chunkSize), 80, 2000),
      cfg: clampNumber(Number(parsed.cfg ?? defaultAdvancedSettings.cfg), 0.1, 10),
      steps: clampNumber(Number(parsed.steps ?? defaultAdvancedSettings.steps), 1, 100),
      outputFilename: String(parsed.outputFilename ?? ""),
      normalize: Boolean(parsed.normalize),
      denoise: Boolean(parsed.denoise),
    };
  } catch {
    return defaultAdvancedSettings;
  }
}

function playAlertSound(kind: "success" | "error") {
  if (typeof window === "undefined") return;
  const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);

  const frequencies = kind === "success" ? [660, 880, 1175] : [330, 220];
  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.12);
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.12);
    oscillator.stop(context.currentTime + index * 0.12 + 0.16);
  });

  window.setTimeout(() => void context.close(), 900);
}

export function StudioClient({ compact = false }: { compact?: boolean }) {
  const [text, setText] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_TEXT;
    return window.localStorage.getItem(TEXT_DRAFT_STORAGE_KEY) || DEFAULT_TEXT;
  });
  const [mode, setMode] = useState<StudioMode>("clone");
  const [voice, setVoice] = useState("Rithy-Male.mp3");
  const [appliedMode, setAppliedMode] = useState<StudioMode>("clone");
  const [appliedVoice, setAppliedVoice] = useState("Rithy-Male.mp3");
  const [readerName, setReaderName] = useState("Narration Studio");
  const [voiceStyle, setVoiceStyle] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_VOICE_STYLE;
    return window.localStorage.getItem(VOICE_STYLE_STORAGE_KEY) || DEFAULT_VOICE_STYLE;
  });
  const [appliedVoiceStyle, setAppliedVoiceStyle] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_VOICE_STYLE;
    return window.localStorage.getItem(VOICE_STYLE_STORAGE_KEY) || DEFAULT_VOICE_STYLE;
  });
  const [promptText, setPromptText] = useState("");
  const [advanced, setAdvanced] = useState<AdvancedSettings>(() => loadAdvancedSettings());
  const [voices, setVoices] = useState<string[]>([]);
  const [cloneMetaByUrl, setCloneMetaByUrl] = useState<Record<string, VoiceClone>>({});
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [job, setJob] = useState<JobRecord | null>(null);
  const [queue, setQueue] = useState<JobRecord[]>([]);
  const [voicePlaySignal, setVoicePlaySignal] = useState(0);
  const [openAudioId, setOpenAudioId] = useState<string | null>(null);
  const [audioPlaySignal, setAudioPlaySignal] = useState(0);
  const [voiceSearch, setVoiceSearch] = useState("");
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceSourceFilter, setVoiceSourceFilter] = useState<"standard" | "cloned">("standard");
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<"All" | "Male" | "Female" | "Neutral">("All");
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    return window.localStorage.getItem("narration_language") === "km" ? "km" : "en";
  });
  const [loading, setLoading] = useState(false);
  const selectedOutputName = advanced.outputFilename.trim() || safeOutputFilename(readerName);
  const t = studioText[language];

  useEffect(() => {
    api.voices().then((r) => {
      const nextVoices = Array.isArray(r.voices) ? r.voices : [];
      const requestedVoice = new URLSearchParams(window.location.search).get("voice");
      const initialVoice = requestedVoice && nextVoices.includes(requestedVoice) ? requestedVoice : nextVoices[0];
      setVoices(nextVoices);
      if (initialVoice) {
        setVoice(initialVoice);
        setAppliedVoice(initialVoice);
      }
    }).catch(() => toast.error("Backend voices failed to load."));
    api.visitor().then(setVisitor).catch(() => undefined);
    api.me().then(setUser).catch(() => undefined);
    api.userVoiceClones().then((data) => {
      const clones = Array.isArray(data.voice_clones) ? data.voice_clones : [];
      setCloneMetaByUrl(Object.fromEntries(clones.filter((clone) => clone.audio_url).map((clone) => [clone.audio_url as string, clone])));
    }).catch(() => undefined);
    api.jobs().then((data) => {
      const nextJobs = Array.isArray(data.jobs) ? data.jobs.map(normalizeJobRecord) : [];
      setQueue(nextJobs.slice(0, 8));
      const latestDone = nextJobs.find((item) => item.status === "done" && item.result);
      if (latestDone) {
        setJob(latestDone);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    function onLanguageChange(event: Event) {
      const next = (event as CustomEvent<Language>).detail;
      setLanguage(next === "km" ? "km" : "en");
    }
    window.addEventListener("narration-language-change", onLanguageChange);
    return () => window.removeEventListener("narration-language-change", onLanguageChange);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ADVANCED_STORAGE_KEY, JSON.stringify(advanced));
  }, [advanced]);

  useEffect(() => {
    window.localStorage.setItem(VOICE_STYLE_STORAGE_KEY, voiceStyle);
  }, [voiceStyle]);

  useEffect(() => {
    window.localStorage.setItem(TEXT_DRAFT_STORAGE_KEY, text);
  }, [text]);

  useEffect(() => {
    const activeJobs = queue.filter((item) => ["queued", "running"].includes(item.status));
    if (activeJobs.length === 0) return;
    const timer = window.setInterval(async () => {
      const nextJobs = await Promise.all(activeJobs.map((item) => api.job(item.id).then(normalizeJobRecord).catch(() => item)));
      setQueue((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        nextJobs.forEach((item) => byId.set(item.id, item));
        return Array.from(byId.values()).sort((a, b) => timestampSeconds(b.created_at) - timestampSeconds(a.created_at));
      });
      nextJobs.forEach((next) => {
        const previous = queue.find((item) => item.id === next.id);
        if (previous?.status !== "done" && next.status === "done") {
          setJob(next);
          playAlertSound("success");
          toast.success(`Job completed: ${next.label || "Narration"}`);
        }
        if (previous?.status !== "error" && next.status === "error") {
          playAlertSound("error");
          toast.error(next.error || "Job failed.");
        }
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [queue]);

  const payload = useMemo<GenerateRequest>(() => ({
    text,
    mode: appliedMode,
    voice: appliedMode === "design" ? null : appliedVoice,
    control: appliedVoiceStyle,
    prompt_text: promptText.trim() || null,
    user_name: readerName,
    output_name: selectedOutputName,
    max_chars: Math.min(user?.plan?.max_text_chars || 20000, Math.max(0, Number(user?.credits_total || 0) - Number(user?.credits_used || 0)) || user?.plan?.max_text_chars || 20000),
    cfg_value: advanced.cfg,
    inference_timesteps: advanced.steps,
    normalize: advanced.normalize,
    denoise: advanced.denoise,
  }), [advanced, appliedMode, appliedVoice, appliedVoiceStyle, promptText, readerName, selectedOutputName, text, user?.credits_total, user?.credits_used, user?.plan?.max_text_chars]);

  async function generate() {
    const planScriptLimit = user?.plan?.max_text_chars || 20000;
    const creditsRemaining = Math.max(0, Number(user?.credits_total || 0) - Number(user?.credits_used || 0));
    const scriptLimit = creditsRemaining > 0 ? Math.min(planScriptLimit, creditsRemaining) : planScriptLimit;
    if (scriptLimit > 0 && text.length > scriptLimit) {
      toast.error(`Script is ${text.length.toLocaleString()} characters. Your current limit is ${scriptLimit.toLocaleString()} based on plan and remaining credits.`);
      return;
    }
    setLoading(true);
    try {
      const queued = await api.createJob(payload);
      if (queued.job) {
        const nextJob = normalizeJobRecord(queued.job);
        setJob(nextJob);
        setQueue((current) => [nextJob, ...current.filter((item) => item.id !== nextJob.id)].slice(0, 12));
      }
      toast.success("Generation queued. Polling every 2 seconds.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  const activeCount = queue.filter((item) => ["queued", "running"].includes(item.status)).length;
  const planScriptLimit = user?.plan?.max_text_chars || 20000;
  const creditsRemaining = Math.max(0, Number(user?.credits_total || 0) - Number(user?.credits_used || 0));
  const scriptLimit = creditsRemaining > 0 ? Math.min(planScriptLimit, creditsRemaining) : planScriptLimit;
  const scriptOverLimit = scriptLimit > 0 && text.length > scriptLimit;
  const planRows = [
    ["Queue running", `${activeCount} / ${visitor?.queue_limit ?? 20}`],
    ["Script length", `${text.length.toLocaleString()} / ${scriptLimit.toLocaleString()}`],
    ["Credits remaining", creditsRemaining.toLocaleString()],
    ["Credits reset", user?.credits_reset_at ? new Date(user.credits_reset_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Setting up"],
  ] as const;
  const generatedJobs = queue.filter((item) => item.status === "done" && item.result);
  const getVoiceMeta = (value: string) => voiceMetaFromClone(value, cloneMetaByUrl[value]);
  const selectedVoiceMeta = getVoiceMeta(voice);
  const appliedVoiceMeta = getVoiceMeta(appliedVoice);
  const voicePreviewUrl = `${API_BASE}/voices/preview?voice=${encodeURIComponent(voice)}`;
  const hasVoiceChanges = voice !== appliedVoice || mode !== appliedMode || voiceStyle !== appliedVoiceStyle;
  const filteredVoices = voices.filter((item) => {
    const meta = getVoiceMeta(item);
    const query = voiceSearch.trim().toLowerCase();
    const sourceMatches = voiceSourceFilter === "cloned" ? isClonedVoice(item) : !isClonedVoice(item);
    const gender = voiceGenderLabel(meta.gender);
    const genderMatches = voiceGenderFilter === "All" || gender === voiceGenderFilter;
    const queryMatches = !query || `${meta.name} ${gender} ${meta.language} ${meta.filename}`.toLowerCase().includes(query);
    return sourceMatches && genderMatches && queryMatches;
  });
  const standardVoiceCount = voices.filter((item) => !isClonedVoice(item)).length;
  const clonedVoiceCount = voices.filter(isClonedVoice).length;
  const displayGender = (gender: string) => {
    const label = voiceGenderLabel(gender);
    if (label === "Male") return t.male;
    if (label === "Female") return t.female;
    return t.neutral;
  };

  function previewVoice(nextVoice = voice) {
    setVoice(nextVoice);
    setVoicePlaySignal((current) => current + 1);
  }

  function applyVoice() {
    setAppliedVoice(voice);
    setAppliedMode(mode);
    setAppliedVoiceStyle(voiceStyle);
    toast.success(`Applied voice: ${getVoiceMeta(voice).name}`);
  }

  function cancelVoiceChanges() {
    setVoice(appliedVoice);
    setMode(appliedMode);
    setVoiceStyle(appliedVoiceStyle);
  }

  async function removeQueuedJob(id: string) {
    try {
      await api.deleteJob(id);
      setQueue((current) => current.filter((item) => item.id !== id));
      if (job?.id === id) {
        setJob(null);
      }
      toast.success("Job removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove job.");
    }
  }

  async function refreshQueue() {
    try {
      const data = await api.jobs();
      const nextJobs = Array.isArray(data.jobs) ? data.jobs.map(normalizeJobRecord) : [];
      setQueue(nextJobs.slice(0, 12));
      toast.success("Queue refreshed.");
    } catch {
      toast.error("Could not refresh queue.");
    }
  }

  return (
    <div className="grid gap-4">
      {voiceModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="select-voice-title">
          <div className="max-h-[86vh] w-full max-w-xl overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-5">
              <div>
                <h2 id="select-voice-title" className="text-lg font-bold">{t.selectVoice}</h2>
                <p className="mt-1 text-sm text-neutral-500">{t.chooseVoice}</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
                onClick={() => setVoiceModalOpen(false)}
                aria-label="Close voice selector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b border-neutral-200 p-5">
              <div className="grid grid-cols-2 rounded-lg bg-neutral-100 p-1">
                {(["standard", "cloned"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setVoiceSourceFilter(item)}
                    className={`rounded-md px-3 py-2 text-sm font-bold transition ${voiceSourceFilter === item ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-950"}`}
                  >
                    {item === "standard" ? t.standard : t.cloned}
                  </button>
                ))}
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  aria-label={t.searchVoices}
                  className="pl-9"
                  value={voiceSearch}
                  onChange={(event) => setVoiceSearch(event.target.value)}
                  placeholder={t.searchVoices}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["All", "Male", "Female", "Neutral"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setVoiceGenderFilter(item)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${voiceGenderFilter === item ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-950"}`}
                  >
                    {item === "All" ? t.all : item === "Male" ? t.male : item === "Female" ? t.female : t.neutral}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[380px] overflow-y-auto p-2">
              {filteredVoices.map((item) => {
                const meta = getVoiceMeta(item);
                const selected = item === voice;
                return (
                  <div
                    key={item}
                    role="button"
                    tabIndex={0}
                    onClick={() => setVoice(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setVoice(item);
                      }
                    }}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition hover:border-neutral-300 hover:bg-neutral-50 ${selected ? "border-neutral-950 bg-neutral-950/[0.03]" : "border-transparent"}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300"}`}>
                        {selected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-neutral-950">{meta.name}</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                            {displayGender(meta.gender)}
                          </span>
                          {meta.language ? (
                            <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                              {meta.language}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        previewVoice(item);
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-950 transition hover:border-neutral-950"
                      aria-label={`Preview ${meta.name}`}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </div>
                );
              })}
              {filteredVoices.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 px-3 py-10 text-center text-sm text-neutral-500">{t.noVoices}</div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-4">
              <button
                type="button"
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700 hover:border-neutral-400"
                onClick={() => setVoiceModalOpen(false)}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800"
                onClick={() => setVoiceModalOpen(false)}
              >
                <Check className="h-4 w-4" />
                {t.selectedVoice}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{compact ? t.tryDemo : t.studio}</h1>
            <p className="text-sm text-neutral-500">{t.studioHint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!compact ? (
              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-800 hover:border-neutral-950"
              >
                {t.voiceLibrary}
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{standardVoiceCount + clonedVoiceCount}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            ) : null}
            <button className="btn" disabled={loading || !text.trim() || scriptOverLimit} onClick={generate}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t.generateVoice}
            </button>
          </div>
        </div>
        {!compact ? (
          <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <div className={`rounded-lg border p-5 ${hasVoiceChanges ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 bg-white"}`}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold">{selectedVoiceMeta.name}</h2>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200">{displayGender(selectedVoiceMeta.gender)}</span>
                    {voice === appliedVoice ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-2 py-1 text-xs font-semibold text-white">
                        <Check className="h-3 w-3" />
                        {t.applied}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{t.notApplied}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">{t.previewDuration} · {isClonedVoice(voice) ? t.clonedVoice : t.standardVoice}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-bold hover:border-neutral-950"
                    onClick={() => setVoiceModalOpen(true)}
                  >
                    {t.voiceLibrary}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800"
                    onClick={() => previewVoice()}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {t.play}
                  </button>
                </div>
              </div>
              <VoiceWaveformPlayer
                voiceName={selectedVoiceMeta.name}
                gender={selectedVoiceMeta.gender}
                previewUrl={voicePreviewUrl}
                downloadUrl={voicePreviewUrl}
                playSignal={voicePlaySignal}
                compact
              />
              <div className="mt-3 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600">
                {t.tableLink} <span className="font-semibold text-neutral-950">{appliedVoiceMeta.name}</span> {t.areHighlighted}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mode-select">{t.mode}</Label>
                  <select id="mode-select" className="field bg-white" value={mode} onChange={(event) => setMode(event.target.value as StudioMode)}>
                    <option value="clone">Clone</option>
                    <option value="design">Design</option>
                    <option value="ultimate">Ultimate</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voice-style">{t.voiceStyle}</Label>
                  <textarea
                    id="voice-style"
                    className="field min-h-28 bg-white"
                    value={voiceStyle}
                    onChange={(event) => setVoiceStyle(event.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!hasVoiceChanges}
                    onClick={cancelVoiceChanges}
                  >
                    <X className="h-4 w-4" />
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!hasVoiceChanges}
                    onClick={applyVoice}
                  >
                    <Check className="h-4 w-4" />
                    {t.applyVoice}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {!compact ? (
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-2">
              <Label htmlFor="example-select">Load text</Label>
              <select
                id="example-select"
                className="field"
                defaultValue=""
                onChange={(event) => {
                  const selected = examples.find((item) => item.label === event.target.value);
                  if (selected) {
                    setText(selected.text);
                    if ("style" in selected && selected.style) setVoiceStyle(selected.style);
                  }
                  event.target.value = "";
                }}
              >
                <option value="" disabled>Choose example</option>
                {examples.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reader-name">Reader name</Label>
              <Input id="reader-name" value={readerName} onChange={(event) => setReaderName(event.target.value)} />
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="script-text">Script</Label>
          <textarea
            id="script-text"
            className={`field min-h-96 resize-y leading-7 ${scriptOverLimit ? "border-red-300 focus:border-red-500" : ""}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {scriptOverLimit ? <p className="text-sm font-semibold text-red-700">Script exceeds your plan limit of {scriptLimit.toLocaleString()} characters.</p> : null}
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <tbody>
              {planRows.map(([label, value]) => (
                <tr key={label} className="border-b border-neutral-100 last:border-0">
                  <td className="bg-neutral-50 px-3 py-2 font-bold text-neutral-600">{label}</td>
                  <td className="px-3 py-2 font-semibold text-neutral-900">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {compact ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select
              className="field"
              value={voice}
              onChange={(e) => {
                setVoice(e.target.value);
                setAppliedVoice(e.target.value);
              }}
            >
              {voices.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select
              className="field"
              value={mode}
              onChange={(e) => {
                const nextMode = e.target.value as StudioMode;
                setMode(nextMode);
                setAppliedMode(nextMode);
              }}
            >
              <option value="clone">Clone</option>
              <option value="design">Design</option>
              <option value="ultimate">Ultimate</option>
            </select>
          </div>
        ) : null}
        <div className="mt-4">
          <Accordion title="Advanced generation controls">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chunk-size">Chunk size</Label>
                <Input
                  id="chunk-size"
                  type="number"
                  min={80}
                  max={2000}
                  value={advanced.chunkSize}
                  onChange={(event) => setAdvanced((current) => ({
                    ...current,
                    chunkSize: clampNumber(Number(event.target.value), 80, 2000),
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg">CFG</Label>
                <Input
                  id="cfg"
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={advanced.cfg}
                  onChange={(event) => setAdvanced((current) => ({
                    ...current,
                    cfg: clampNumber(Number(event.target.value), 0.1, 10),
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="steps">Steps</Label>
                <Input
                  id="steps"
                  type="number"
                  min={1}
                  max={100}
                  value={advanced.steps}
                  onChange={(event) => setAdvanced((current) => ({
                    ...current,
                    steps: clampNumber(Number(event.target.value), 1, 100),
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="output-filename">Output filename</Label>
                <Input
                  id="output-filename"
                  type="text"
                  placeholder="optional.wav"
                  value={advanced.outputFilename}
                  onChange={(event) => setAdvanced((current) => ({ ...current, outputFilename: event.target.value }))}
                />
                <p className="text-xs text-neutral-500">Using: {selectedOutputName}</p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-3">
                <div>
                  <Label htmlFor="normalize">Normalize</Label>
                  <p className="text-xs text-neutral-500">Maps to <code>normalize</code>.</p>
                </div>
                <Switch
                  id="normalize"
                  checked={advanced.normalize}
                  onCheckedChange={(checked) => setAdvanced((current) => ({ ...current, normalize: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-3">
                <div>
                  <Label htmlFor="denoise">Denoise</Label>
                  <p className="text-xs text-neutral-500">Maps to <code>denoise</code>.</p>
                </div>
                <Switch
                  id="denoise"
                  checked={advanced.denoise}
                  onCheckedChange={(checked) => setAdvanced((current) => ({ ...current, denoise: checked }))}
                />
              </div>
              {mode === "ultimate" ? (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="prompt-text">Prompt text</Label>
                  <Input
                    id="prompt-text"
                    value={promptText}
                    onChange={(event) => setPromptText(event.target.value)}
                    placeholder="Optional prompt text for ultimate mode"
                  />
                </div>
              ) : null}
            </div>
          </Accordion>
        </div>
      </section>
      {!compact ? (
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Generated Audio</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Applied voice: <span className="font-semibold text-neutral-950">{appliedVoiceMeta.name}</span>. Matching rows are highlighted.
              </p>
            </div>
            <button className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100" onClick={() => void refreshQueue()} aria-label="Refresh queue">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          {queue.some((item) => item.status !== "done") ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {queue.filter((item) => item.status !== "done").slice(0, 8).map((item) => (
                <div key={item.id} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${queueStatusClass(item.status)}`}>
                  {item.status === "running" || item.status === "queued" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>{item.label || item.request.user_name || "Narration"}</span>
                  <span className="opacity-70">{item.status}</span>
                  <button className="rounded-full p-0.5 hover:bg-white/60" onClick={() => void removeQueuedJob(item.id)} aria-label="Remove job">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Voice</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {generatedJobs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-neutral-500" colSpan={4}>No generated audio yet.</td>
                  </tr>
                ) : null}
                {generatedJobs.slice(0, 12).map((item) => {
                  const urls = resultAudioUrls(item.result);
                  const isOpen = openAudioId === item.id;
                  const name = item.label || item.request.output_name || item.request.user_name || "narration-studio.wav";
                  const voiceLabel = item.request.voice ? getVoiceMeta(item.request.voice).name : "Design voice";
                  const isAppliedVoiceRow = item.request.voice === appliedVoice;
                  return (
                    <Fragment key={item.id}>
                      <tr className={`border-t border-neutral-100 ${isAppliedVoiceRow ? "bg-neutral-950/[0.025]" : "bg-white"}`}>
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${isAppliedVoiceRow ? "bg-neutral-950" : "bg-neutral-300"}`} />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate font-semibold text-neutral-950">{voiceLabel}</span>
                                {isAppliedVoiceRow ? <span className="rounded-full bg-neutral-950 px-2 py-0.5 text-xs font-semibold text-white">Selected</span> : null}
                              </div>
                              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
                                <FileAudio className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{name}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{formatDuration(item.result?.duration_sec)}</td>
                        <td className="px-4 py-3 text-neutral-600">{new Date(timestampSeconds(item.created_at) * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 font-semibold hover:border-neutral-950"
                              onClick={() => {
                                setOpenAudioId((current) => (current === item.id ? null : item.id));
                                if (openAudioId !== item.id) setAudioPlaySignal((current) => current + 1);
                              }}
                            >
                              {isOpen ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                              {isOpen ? "Close" : "Play"}
                            </button>
                            <details className="group relative">
                              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-neutral-950 px-3 py-2 font-semibold text-white hover:bg-neutral-800">
                                <Download className="h-4 w-4" />
                                Download
                                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                              </summary>
                              <div className="absolute right-0 z-10 mt-2 w-32 overflow-hidden rounded-lg border border-neutral-200 bg-white p-1 text-left shadow-lg">
                                <a className="block rounded-md px-3 py-2 font-semibold text-neutral-700 hover:bg-neutral-100" href={urls.wav} target="_blank">WAV</a>
                                <a className="block rounded-md px-3 py-2 font-semibold text-neutral-700 hover:bg-neutral-100" href={urls.mp3 || urls.wav} target="_blank">MP3</a>
                              </div>
                            </details>
                            <button className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => void removeQueuedJob(item.id)} aria-label="Delete generated audio">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-t border-neutral-100 bg-neutral-50/60">
                          <td className="px-4 py-4" colSpan={4}>
                            <VoiceWaveformPlayer
                              voiceName={name}
                              gender={`${voiceLabel} · ${item.request.mode}`}
                              previewUrl={urls.wav}
                              downloadUrl={urls.wav}
                              playSignal={audioPlaySignal}
                              compact
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
