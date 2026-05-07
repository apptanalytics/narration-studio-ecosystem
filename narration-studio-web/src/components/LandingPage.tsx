"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Code2,
  History,
  Loader2,
  Menu,
  Mic,
  Mic2,
  Moon,
  Play,
  Settings,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { api, API_BASE, backendUrl } from "@/lib/api";
import { AudioStatePlayer as AudioWaveformPlayer } from "@/components/AudioStatePlayer";
import type { AuthUser, GenerateRequest, GenerateResult, Visitor } from "@/lib/types";

const featureCards = [
  [Zap, "Instant Generation", "Generate speech in milliseconds with optimized inference."],
  [History, "Async Job Queue", "Process long audio jobs in background with queue + retry."],
  [Sparkles, "Voice Cloning", "Create custom voices with identity verification and control."],
  [Code2, "Developer API", "REST + OpenAI-compatible endpoints with API keys."],
  [BarChart3, "Usage & Billing", "Track credits, limits, plans, and API usage in real time."],
  [Settings, "Admin Control", "Full control over users, credits, plans, and access."],
] as const;

const docsHomeHref = "/docs/v1/introduction";
const apiDocsHref = "/docs/v1/generate-speech";

const publicVoiceCatalog = [
  "Arun-Male.mp3",
  "Bora-Male.mp3",
  "Chanda-Male.mp3",
  "Maly-Female.mp3",
  "Neary-Female.mp3",
  "Oudom-Male.mp3",
  "Phanin-Female.mp3",
  "Rithy-Male.mp3",
  "Setha-Male.mp3",
  "Theary-Female.mp3",
] as const;

const fallbackVoices = [...publicVoiceCatalog];
const publicVoiceFiles = new Map(
  publicVoiceCatalog.flatMap((voice) => {
    const label = voice.replace(/\.(mp3|wav|ogg|m4a|webm)$/i, "").replace(/[-_]/g, " ");
    return [
      [voice.toLowerCase(), voice],
      [label.toLowerCase(), voice],
    ];
  }),
);

type LandingVoice = string | {
  audio_url?: unknown;
  category?: unknown;
  filename?: unknown;
  id?: unknown;
  is_public?: unknown;
  name?: unknown;
  owner_id?: unknown;
  source?: unknown;
  type?: unknown;
  user_id?: unknown;
};

function cleanVoiceFile(value: string) {
  return value.trim().split(/[?#]/)[0].split("/").pop() || "";
}

function normalizePublicVoice(voice: LandingVoice) {
  // Public landing page must never expose private user voice clones.
  if (typeof voice === "string") {
    const lower = voice.toLowerCase();
    if (lower.includes("uploads/") || lower.includes("voice-clones/")) return null;
    return publicVoiceFiles.get(cleanVoiceFile(voice).toLowerCase()) ?? null;
  }

  if (!voice || typeof voice !== "object") return null;
  const type = String(voice.type ?? "").toLowerCase();
  const category = String(voice.category ?? "").toLowerCase();
  const source = String(voice.source ?? "").toLowerCase();
  const audioUrl = String(voice.audio_url ?? "").toLowerCase();
  if (type === "clone" || category === "clone" || source === "clone" || source === "upload") return null;
  if (audioUrl.includes("uploads/") || audioUrl.includes("voice-clones/")) return null;
  if (voice.owner_id != null || voice.user_id != null || voice.is_public === false) return null;

  const candidate = [voice.filename, voice.name, voice.id, voice.audio_url].find((value) => typeof value === "string");
  if (!candidate) return null;
  return publicVoiceFiles.get(cleanVoiceFile(candidate).toLowerCase()) ?? null;
}

function publicVoicesFromResponse(values: unknown[]) {
  const seen = new Set<string>();
  const filtered: string[] = [];
  for (const value of values) {
    const voice = normalizePublicVoice(value as LandingVoice);
    if (voice && !seen.has(voice)) {
      filtered.push(voice);
      seen.add(voice);
    }
  }
  return filtered.length ? filtered : [...fallbackVoices];
}

function voiceMeta(voice: string) {
  const filename = cleanVoiceFile(voice);
  const name = (publicVoiceFiles.get(filename.toLowerCase()) ?? filename)
    .replace(/\.(mp3|wav|ogg|m4a|webm)$/i, "")
    .replace(/[-_]/g, " ");
  const gender = /female/i.test(filename) ? "Female" : /male/i.test(filename) ? "Male" : "Voice";
  const source = "Standard";
  return { filename, name, gender, source };
}

export function LandingPage() {
  const [voices, setVoices] = useState<string[]>([...fallbackVoices]);
  const [selectedVoice, setSelectedVoice] = useState("Rithy-Male.mp3");
  const [text, setText] = useState("សូមស្វាគមន៍មកកាន់ Narration Studio។ សូមរីករាយជាមួយសំឡេង AI។");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const selected = useMemo(() => voiceMeta(selectedVoice), [selectedVoice]);
  const publicVoices = useMemo(() => {
    return publicVoicesFromResponse(voices).sort((first, second) => voiceMeta(first).name.localeCompare(voiceMeta(second).name));
  }, [voices]);
  const resultUrl = backendUrl(result?.download_url);
  const selectedPreviewUrl = `${API_BASE}/voices/preview?voice=${encodeURIComponent(selectedVoice)}`;
  const trimmedText = text.trim();
  const remainingDemos = visitor?.generation_remaining;
  const generateDisabled = loading || !trimmedText || text.length > 100 || (typeof remainingDemos === "number" && remainingDemos <= 0);

  useEffect(() => {
    api.publicVoices()
      .then((data) => {
        const nextVoices = publicVoicesFromResponse(Array.isArray(data.voices) ? data.voices : []);
        if (nextVoices.length) {
          setVoices(nextVoices);
          setSelectedVoice(nextVoices.includes("Rithy-Male.mp3") ? "Rithy-Male.mp3" : nextVoices[0]);
        }
      })
      .catch(() => toast.error("Could not load backend voices."));
    api.me().then(setUser).catch(() => setUser(null));
    refreshVisitor();
  }, []);

  async function refreshVisitor() {
    try {
      setVisitor(await api.visitor());
    } catch {
      setVisitor(null);
    }
  }

  function selectVoice(voice: string) {
    setSelectedVoice(voice);
  }

  async function generateDemo() {
    if (!trimmedText) {
      toast.error("Enter text first.");
      return;
    }
    if (text.length > 100) {
      toast.error("Homepage demo is limited to 100 characters.");
      return;
    }
    if (typeof remainingDemos === "number" && remainingDemos <= 0) {
      toast.error("Demo limit reached. Sign up to continue.");
      return;
    }
    setLoading(true);
    setResult(null);
    const payload: GenerateRequest = {
      text: trimmedText.slice(0, 100),
      mode: "clone",
      voice: selectedVoice,
      control: "warm, calm, clear pronunciation",
      prompt_text: null,
      user_name: "Homepage Demo",
      output_name: "homepage-demo.wav",
      max_chars: 100,
      cfg_value: 2,
      inference_timesteps: 10,
      normalize: false,
      denoise: false,
    };
    try {
      const output = await api.generate(payload);
      setResult(output);
      toast.success("Demo audio generated.");
      await refreshVisitor();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed.");
      await refreshVisitor();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950">
      <header className="fixed top-0 z-50 w-full border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="flex w-full items-center justify-between px-4 py-3 lg:px-6">
          <Link href="/" className="group flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-950 text-white transition-transform group-hover:scale-105 dark:bg-white dark:text-neutral-950">
              <Mic2 className="h-4 w-4" />
            </span>
            <span className="text-lg font-black tracking-tight">Narration Studio</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <a className="text-sm font-bold text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white" href="#features">Features</a>
            <a className="text-sm font-bold text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white" href="#demo">Demo</a>
            <Link className="text-sm font-bold text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white" href="/pricing">Pricing</Link>
            <Link className="text-sm font-bold text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white" href={apiDocsHref}>API</Link>
            <Link className="text-sm font-bold text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white" href={docsHomeHref}>Docs</Link>
            <Link className="text-sm font-bold text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white" href="/changelog">Changelog</Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <button className="rounded-lg border border-neutral-200 bg-white p-2 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900" aria-label="Toggle dark mode" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <Link className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-bold hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900" href={user.role === "admin" || user.role === "super_admin" ? "/admin" : "/dashboard/studio"}>
                {user.role === "admin" || user.role === "super_admin" ? "Admin" : "Dashboard"}
              </Link>
            ) : (
              <Link className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-bold hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900" href="/login">Log In</Link>
            )}
            <Link className="rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm dark:bg-white dark:text-neutral-950" href={user ? "/dashboard/studio" : "/register"}>
              {user ? "Open Studio" : "Try for Free"}
            </Link>
          </div>
          <button
            className="rounded-lg p-2 hover:bg-neutral-100 md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen ? (
          <div className="border-t border-neutral-200 bg-white px-4 py-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
            <nav className="grid gap-2">
              <a className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900" href="#features" onClick={() => setMenuOpen(false)}>Features</a>
              <a className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900" href="#demo" onClick={() => setMenuOpen(false)}>Demo</a>
              <Link className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900" href="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900" href={apiDocsHref} onClick={() => setMenuOpen(false)}>API</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900" href={docsHomeHref} onClick={() => setMenuOpen(false)}>Docs</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900" href="/changelog" onClick={() => setMenuOpen(false)}>Changelog</Link>
              {user ? (
                <Link
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                  href={user.role === "admin" || user.role === "super_admin" ? "/admin" : "/dashboard/studio"}
                  onClick={() => setMenuOpen(false)}
                >
                  {user.role === "admin" || user.role === "super_admin" ? "Admin" : "Dashboard"}
                </Link>
              ) : (
                <Link className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100" href="/login" onClick={() => setMenuOpen(false)}>Log In</Link>
              )}
              <Link
                className="mt-1 rounded-xl bg-neutral-950 px-3 py-2 text-center text-sm font-bold text-white"
                href={user ? "/dashboard/studio" : "/register"}
                onClick={() => setMenuOpen(false)}
              >
                {user ? "Open Studio" : "Try for Free"}
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <section className="relative border-b border-neutral-200 bg-white pt-28 pb-16 dark:border-neutral-800 dark:bg-neutral-950 lg:pt-36 lg:pb-20">
        <div className="grid w-full gap-8 px-4 lg:grid-cols-[minmax(0,1fr)_minmax(620px,720px)] lg:px-6">
          <div className="flex max-w-4xl flex-col justify-center space-y-7">
            <p className="w-fit rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
              Narration Studio API and voice platform
            </p>
            <h1 className="max-w-4xl text-5xl leading-[0.95] font-black tracking-tight sm:text-6xl md:text-7xl">
              Create Human Voice Narration
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-xl">
              Generate speech, test API requests, manage keys, and ship voice features from one clean workspace.
            </p>
            <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row">
              <a className="btn h-12 w-full px-6 text-base sm:w-auto" href="#demo">
                Try voices now
              </a>
              <Link className="rounded-lg border border-neutral-200 bg-white px-6 py-3 text-center text-base font-bold hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900 sm:w-auto" href={apiDocsHref}>
                API docs
              </Link>
            </div>
          </div>

          <div id="demo" className="min-w-0 w-full max-w-[720px] scroll-mt-28">
            <div className="w-full max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-neutral-300" />
                  <span className="h-3 w-3 rounded-full bg-neutral-300" />
                  <span className="h-3 w-3 rounded-full bg-neutral-300" />
                </div>
                <div className="font-mono text-xs text-neutral-500">live playground</div>
                <div className="w-12" />
              </div>
              <div className="grid min-h-[430px] grid-cols-1 divide-y divide-neutral-200 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] md:divide-x md:divide-y-0">
                <div className="min-w-0 max-w-full overflow-hidden p-6 text-left">
                  <div className="flex h-full min-w-0 flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <label className="text-sm font-semibold">Input Text</label>
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-neutral-400" />
                      <span className={`font-mono text-xs ${text.length > 100 ? "text-red-600" : "text-neutral-500"}`}>{text.length}/100</span>
                    </div>
                  </div>
                  <textarea
                    className="min-h-52 w-full max-w-full flex-1 resize-none bg-transparent p-0 font-mono text-base leading-relaxed text-neutral-600 outline-none"
                    value={text}
                    maxLength={100}
                    onChange={(event) => setText(event.target.value)}
                  />
                  <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3 text-sm">
                    <p className="min-w-0 font-medium text-neutral-600">Selected voice: <span className="text-neutral-950">{selected.name}</span></p>
                    <p className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-600">
                      5 free demos per IP{typeof remainingDemos === "number" ? ` · ${remainingDemos} remaining` : ""}
                    </p>
                  </div>
                  {typeof remainingDemos === "number" && remainingDemos <= 0 ? (
                    <p className="mt-3 rounded-xl border border-neutral-200 bg-neutral-100 p-3 text-sm font-medium text-neutral-700">
                      Demo limit reached. Sign up to continue.
                    </p>
                  ) : null}
                  <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <select className="field min-w-0 max-w-full" value={selectedVoice} onChange={(event) => setSelectedVoice(event.target.value)}>
                      {publicVoices.map((voice) => <option key={voice} value={voice}>{voiceMeta(voice).name}</option>)}
                    </select>
                    <button className="btn h-11 rounded-xl disabled:cursor-not-allowed disabled:opacity-50" onClick={generateDemo} disabled={generateDisabled}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {loading ? "Generating..." : "Generate"}
                    </button>
                  </div>
                  </div>
                </div>
                <div className="flex min-w-0 max-w-full flex-col justify-center overflow-hidden bg-neutral-50 p-5">
                  <div className="w-full max-w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md">
                    <div className="mb-4 flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100">
                        <Mic2 className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold">{selected.name}</h2>
                        <p className="truncate text-sm text-neutral-500">{selected.gender} · {selected.source}</p>
                      </div>
                    </div>
                    <AudioWaveformPlayer src={selectedPreviewUrl} title="preview" compact downloadable />
                    {resultUrl ? (
                      <div className="mt-4 min-w-0 max-w-full overflow-hidden border-t border-neutral-200 pt-4">
                        <AudioWaveformPlayer src={resultUrl} title="Generated audio" compact downloadable />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-neutral-200 bg-white py-20 dark:border-neutral-800 dark:bg-neutral-950 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-4 text-xs font-black uppercase tracking-widest text-neutral-500">Platform features</p>
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
              Build production-grade audio systems
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400 sm:text-lg">
              Everything you need for narration, APIs, voice cloning, and scalable audio workflows.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(([Icon, title, copy]) => (
              <Link key={title} href={title === "Developer API" ? apiDocsHref : "/dashboard"} className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-950 transition group-hover:bg-neutral-950 group-hover:text-white dark:bg-neutral-900 dark:text-neutral-100 dark:group-hover:bg-white dark:group-hover:text-neutral-950">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{copy}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-neutral-100 py-24 dark:border-neutral-800 dark:bg-neutral-900 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-8">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Preview natural voices</h2>
              <p className="max-w-lg text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
                Try public Narration Studio voices before opening the studio.
              </p>
              <div className="grid max-h-[520px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {publicVoices.map((voice) => {
                  const meta = voiceMeta(voice);
                  return (
                    <button
                      key={voice}
                      onClick={() => selectVoice(voice)}
                      className={`group flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-neutral-300 hover:shadow-md dark:bg-neutral-950 dark:hover:border-neutral-700 sm:p-4 ${
                        voice === selectedVoice ? "border-neutral-950 dark:border-white" : "border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full group-hover:bg-neutral-950 group-hover:text-white ${
                        voice === selectedVoice ? "bg-neutral-950 text-white" : "bg-neutral-100"
                      }`}>
                        <Play className="ml-0.5 h-4 w-4 fill-current" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{meta.name}</span>
                        <span className="block truncate text-xs text-neutral-500">{meta.gender} · {meta.source}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-neutral-950/10 opacity-30 blur-3xl dark:bg-white/10" />
              <div className="relative rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 sm:p-8">
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100">
                    <Mic2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{selected.name}</h3>
                    <p className="truncate text-sm text-neutral-500">{selected.gender} · {selected.source}</p>
                  </div>
                </div>
                <AudioWaveformPlayer src={selectedPreviewUrl} title="preview" downloadable />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="mb-8 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Ready to build the future of audio experiences?
          </h2>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link className="btn h-14 rounded-full px-8 text-lg shadow-xl transition hover:scale-105" href="/dashboard">
              Start Building Now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="btn secondary h-14 rounded-full bg-white px-8 text-lg" href="/pricing">View Pricing</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2">
              <div className="mb-6 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-950 text-white">
                  <Mic2 className="h-4 w-4" />
                </span>
                <span className="text-xl font-bold tracking-tight">Narration Studio</span>
              </div>
              <p className="mb-6 max-w-xs text-sm leading-relaxed text-neutral-600">
                The complete platform for building high-quality audio applications.
              </p>
            </div>
            {[
              ["Product", "Features", "Pricing", "Enterprise", "Changelog"],
              ["Resources", "Documentation", "API Reference", "Community", "Help Center"],
              ["Company", "About", "Blog", "Careers", "Legal"],
            ].map(([title, ...items]) => (
              <div key={title}>
                <h4 className="mb-4 text-sm font-semibold">{title}</h4>
                <ul className="space-y-3 text-sm text-neutral-600">
                  {items.map((item) => <li key={item}><Link className="hover:text-neutral-950 dark:hover:text-white" href={item === "Changelog" ? "/changelog" : item === "Pricing" ? "/pricing" : item === "Documentation" ? docsHomeHref : item === "API Reference" ? apiDocsHref : "/dashboard"}>{item}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-8 md:flex-row">
            <p className="text-sm text-neutral-500">© 2026 Narration Studio. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-neutral-500">
              <Link className="hover:text-neutral-950 dark:hover:text-white" href="/privacy">Privacy Policy</Link>
              <Link className="hover:text-neutral-950 dark:hover:text-white" href="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
