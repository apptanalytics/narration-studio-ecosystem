"use client";

import { AlertCircle, Download, Loader2, Pause, Play } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

type AudioState = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

type AudioStatePlayerProps = {
  src: string;
  title: string;
  compact?: boolean;
  downloadable?: boolean;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
};

const bars = [74, 28, 64, 90, 42, 72, 34, 82, 96, 50, 68, 38, 86, 56, 78, 44, 70, 92, 58, 32, 84, 48, 76, 40, 62, 36, 88, 54];

function stopAllAudio(exceptId?: string) {
  window.dispatchEvent(new CustomEvent("narration-audio-stop", { detail: { exceptId } }));
}

export function AudioStatePlayer({ src, title, compact = false, downloadable = false, onEnded, onPlay, onPause }: AudioStatePlayerProps) {
  const id = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>("idle");

  useEffect(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    const audio = new Audio(src);
    audio.preload = "metadata";
    audioRef.current = audio;
    setState("idle");

    const onWaiting = () => setState("loading");
    const onPlaying = () => {
      setState("playing");
      onPlay?.();
    };
    const onPauseEvent = () => {
      if (!audio.ended) {
        setState("paused");
        onPause?.();
      }
    };
    const onEndedEvent = () => {
      audio.currentTime = 0;
      setState("ended");
      onEnded?.();
    };
    const onError = () => setState("error");
    const onStop = (event: Event) => {
      const detail = (event as CustomEvent<{ exceptId?: string }>).detail;
      if (detail?.exceptId === id) return;
      audio.pause();
      audio.currentTime = 0;
      setState("idle");
    };

    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPauseEvent);
    audio.addEventListener("ended", onEndedEvent);
    audio.addEventListener("error", onError);
    window.addEventListener("narration-audio-stop", onStop);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPauseEvent);
      audio.removeEventListener("ended", onEndedEvent);
      audio.removeEventListener("error", onError);
      window.removeEventListener("narration-audio-stop", onStop);
    };
  }, [id, onEnded, onPause, onPlay, src]);

  const helper = useMemo(() => {
    if (state === "loading") return "Loading preview...";
    if (state === "playing") return "Playing...";
    if (state === "paused") return "Paused. Click to continue.";
    if (state === "ended") return "Ended. Click to replay.";
    if (state === "error") return "Preview unavailable.";
    return "Click play to preview.";
  }, [state]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio || state === "loading" || state === "error") return;
    if (state === "playing") {
      audio.pause();
      return;
    }
    stopAllAudio(id);
    setState("loading");
    try {
      await audio.play();
    } catch {
      setState("error");
    }
  }

  const Icon = state === "loading" ? Loader2 : state === "playing" ? Pause : state === "error" ? AlertCircle : Play;

  return (
    <div className={compact ? "w-full max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-white p-3" : "w-full max-w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className={`text-xs ${state === "error" ? "text-red-600" : "text-neutral-500"}`}>{helper}</p>
        </div>
        {downloadable ? (
          <a href={src} target="_blank" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Download audio">
            <Download className="h-4 w-4" />
          </a>
        ) : null}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={state === "loading" || state === "error"}
        className="group flex h-20 w-full max-w-full items-center gap-3 overflow-hidden rounded-xl bg-neutral-100 p-3 disabled:cursor-not-allowed"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white">
          <Icon className={`h-5 w-5 ${state === "loading" ? "animate-spin" : ""} ${state === "playing" ? "" : "fill-current"}`} />
        </span>
        <span className="flex h-full min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden">
          {bars.map((height, index) => (
            <span
              key={index}
              className={`w-1 rounded-full bg-neutral-500 transition ${state === "playing" ? "animate-waveform opacity-100" : "opacity-60"}`}
              style={{
                height: `${height}%`,
                animationDelay: `${index * 0.04}s`,
                animationDuration: `${0.6 + (index % 7) * 0.1}s`,
              }}
            />
          ))}
        </span>
      </button>
    </div>
  );
}

export { stopAllAudio };
