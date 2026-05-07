"use client";

import { AlertCircle, Download, Loader2, Pause, Play, Volume2 } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type VoiceState = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export type VoiceWaveformPlayerProps = {
  voiceName: string;
  gender: string;
  previewUrl: string;
  downloadUrl?: string;
  playSignal?: number;
  compact?: boolean;
};

const bars = [74, 28, 64, 90, 42, 72, 34, 82, 96, 50, 68, 38, 86, 56, 78, 44, 70, 92, 58, 32, 84, 48, 76, 40, 62, 36, 88, 54];

export function VoiceWaveformPlayer({ voiceName, gender, previewUrl, downloadUrl, playSignal = 0, compact = false }: VoiceWaveformPlayerProps) {
  const playerId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlaySignalRef = useRef(playSignal);
  const [state, setState] = useState<VoiceState>("idle");

  useEffect(() => {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio(previewUrl);
    audio.preload = "metadata";
    audioRef.current = audio;
    setState("idle");

    const onWaiting = () => setState("loading");
    const onPlaying = () => setState("playing");
    const onPause = () => {
      if (!audio.ended) {
        setState("paused");
      }
    };
    const onEnded = () => {
      audio.currentTime = 0;
      setState("ended");
    };
    const onError = () => setState("error");
    const onStop = (event: Event) => {
      const detail = (event as CustomEvent<{ exceptId?: string }>).detail;
      if (detail?.exceptId === playerId) return;
      audio.pause();
      audio.currentTime = 0;
      setState("idle");
    };

    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    window.addEventListener("narration-audio-stop", onStop);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      window.removeEventListener("narration-audio-stop", onStop);
    };
  }, [playerId, previewUrl]);

  const playCurrentPreview = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || state === "loading" || state === "error") return;
    window.dispatchEvent(new CustomEvent("narration-audio-stop", { detail: { exceptId: playerId } }));
    setState("loading");
    try {
      if (state === "ended") {
        audio.currentTime = 0;
      }
      await audio.play();
    } catch {
      setState("error");
    }
  }, [playerId, state]);

  useEffect(() => {
    if (playSignal === lastPlaySignalRef.current) return;
    lastPlaySignalRef.current = playSignal;
    void playCurrentPreview();
  }, [playCurrentPreview, playSignal]);

  const statusText = useMemo(() => {
    if (state === "loading") return "Loading voice preview...";
    if (state === "playing") return "Playing preview...";
    if (state === "paused") return "Paused - click play to resume.";
    if (state === "ended") return "Preview ended. Click to replay.";
    if (state === "error") return "Preview unavailable.";
    return "Click the waveform or any voice card to play.";
  }, [state]);

  async function toggle() {
    if (state === "playing") {
      audioRef.current?.pause();
      return;
    }
    await playCurrentPreview();
  }

  const Icon = state === "loading" ? Loader2 : state === "playing" ? Pause : state === "error" ? AlertCircle : Play;

  return (
    <div className={`relative rounded-2xl border border-neutral-200 bg-white shadow-sm ${compact ? "p-3" : "p-6 shadow-2xl sm:p-8"}`}>
      <div className={`${compact ? "mb-3" : "mb-8"} flex items-center justify-between gap-4`}>
        <div className="flex min-w-0 items-center gap-4">
          <div className={`${compact ? "h-10 w-10" : "h-12 w-12"} flex shrink-0 items-center justify-center rounded-full bg-neutral-100`}>
            <Volume2 className={compact ? "h-5 w-5" : "h-6 w-6"} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{voiceName}</h3>
            <p className="truncate text-sm text-neutral-500">{gender}</p>
          </div>
        </div>
        <a
          className={`rounded-full p-2 text-neutral-500 hover:bg-neutral-100 ${downloadUrl ? "" : "pointer-events-none opacity-40"}`}
          href={downloadUrl || "#"}
          target="_blank"
          aria-label="Download"
        >
          <Download className="h-5 w-5" />
        </a>
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={state === "loading" || state === "error"}
        className={`group relative ${compact ? "mb-3 h-16" : "mb-8 h-32"} flex w-full cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 p-4 disabled:cursor-not-allowed`}
      >
        {bars.map((height, index) => (
          <span
            key={index}
            className={`w-1.5 rounded-full bg-neutral-400 transition group-hover:bg-neutral-950 ${
              state === "playing" ? "wave-bar-playing opacity-100" : "opacity-60"
            }`}
            style={{
              height: `${height}%`,
              animationDelay: `${index * 0.045}s`,
              animationDuration: `${0.6 + (index % 7) * 0.1}s`,
            }}
          />
        ))}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className={`${compact ? "h-10 w-10" : "h-14 w-14"} flex items-center justify-center rounded-full bg-neutral-950 text-white shadow-lg`}>
            <Icon className={`${compact ? "h-5 w-5" : "h-6 w-6"} ${state === "loading" ? "animate-spin" : ""} ${state === "playing" ? "" : "ml-0.5"} ${state === "playing" ? "" : "fill-current"}`} />
          </span>
        </span>
      </button>

      <p className={`rounded-lg p-3 font-mono text-sm ${state === "error" ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-500"}`}>
        {statusText}
      </p>
    </div>
  );
}
