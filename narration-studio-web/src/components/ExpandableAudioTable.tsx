"use client";

import { Download, Loader2, Pause, Pencil, Play, Trash2, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

type AudioState = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export type ExpandableAudioRow = {
  id: string;
  voice: string;
  source: string;
  duration: string;
  created: string;
  audioUrl?: string;
  onEdit?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
};

type ExpandableAudioTableProps = {
  rows: ExpandableAudioRow[];
  emptyMessage: string;
};

const bars = [70, 34, 82, 46, 92, 40, 76, 54, 88, 36, 66, 96, 48, 80, 42, 72, 58, 86, 50, 74, 38, 90, 44, 68];

export function ExpandableAudioTable({ rows, emptyMessage }: ExpandableAudioTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [state, setState] = useState<AudioState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const expanded = rows.find((row) => row.id === expandedId);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  function closeExpanded() {
    audioRef.current?.pause();
    audioRef.current = null;
    setState("idle");
    setExpandedId(null);
  }

  async function startAudio(audio: HTMLAudioElement) {
    setState("loading");
    audio.onplaying = () => setState("playing");
    audio.onpause = () => {
      if (!audio.ended) setState("paused");
    };
    audio.onended = () => {
      audio.currentTime = 0;
      setState("ended");
    };
    audio.onerror = () => setState("error");
    try {
      await audio.play();
    } catch {
      setState("error");
    }
  }

  function expandRow(row: ExpandableAudioRow, shouldPlay = false) {
    if (expandedId === row.id && !shouldPlay) {
      closeExpanded();
      return;
    }
    audioRef.current?.pause();
    audioRef.current = row.audioUrl ? new Audio(row.audioUrl) : null;
    setExpandedId(row.id);
    setState("idle");
    if (shouldPlay && audioRef.current) {
      void startAudio(audioRef.current);
    }
  }

  async function playExpanded() {
    if (!expanded?.audioUrl) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(expanded.audioUrl);
      audioRef.current = audio;
    }
    if (state === "playing") {
      audio.pause();
      setState("paused");
      return;
    }
    await startAudio(audio);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3">Voice</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-neutral-500" colSpan={4}>{emptyMessage}</td>
            </tr>
          ) : null}
          {rows.map((row) => {
            const isExpanded = expandedId === row.id;
            return (
              <Fragment key={row.id}>
                <tr
                  className={`cursor-pointer border-t border-neutral-100 transition hover:bg-neutral-50 ${isExpanded ? "bg-neutral-950/[0.025]" : "bg-white"}`}
                  onClick={() => expandRow(row)}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-neutral-950">{row.voice}</div>
                    <div className="text-xs text-neutral-500">{row.source}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{row.duration}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.created}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-950"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!isExpanded) expandRow(row, true);
                          else void playExpanded();
                        }}
                        aria-label={`Play ${row.voice}`}
                      >
                        {isExpanded && state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : isExpanded && state === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                      </button>
                      <a
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-950 ${row.audioUrl ? "" : "pointer-events-none opacity-40"}`}
                        href={row.audioUrl || "#"}
                        target="_blank"
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Download ${row.voice}`}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {row.onEdit ? (
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={row.editDisabled}
                          onClick={(event) => {
                            event.stopPropagation();
                            void row.onEdit?.();
                          }}
                          aria-label={`Edit ${row.voice}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                      {row.onDelete ? (
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={row.deleteDisabled}
                          onClick={(event) => {
                            event.stopPropagation();
                            void row.onDelete?.();
                          }}
                          aria-label={`Delete ${row.voice}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr className="border-t border-neutral-100 bg-neutral-50/80">
                    <td className="px-4 py-4" colSpan={4}>
                      <div className="audio-expanded rounded-xl border border-neutral-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-bold text-neutral-950">{row.voice} <span className="text-neutral-500">(Selected)</span></h3>
                            <p className="mt-1 text-sm text-neutral-500">{row.source}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-sm font-bold text-white hover:bg-neutral-800" onClick={() => void playExpanded()}>
                              {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                              {state === "playing" ? "Pause" : "Play"}
                            </button>
                            <a className={`inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-bold hover:border-neutral-950 ${row.audioUrl ? "" : "pointer-events-none opacity-40"}`} href={row.audioUrl || "#"} target="_blank">
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-bold hover:border-neutral-950" onClick={closeExpanded}>
                              <X className="h-4 w-4" />
                              Close
                            </button>
                          </div>
                        </div>
                        <button type="button" className="mt-4 flex h-20 w-full items-center justify-center gap-1 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 p-4" onClick={() => void playExpanded()}>
                          {bars.map((height, index) => (
                            <span
                              key={index}
                              className={`w-1.5 rounded-full bg-neutral-400 transition ${state === "playing" ? "wave-bar-playing opacity-100" : "opacity-60"}`}
                              style={{
                                height: `${height}%`,
                                animationDelay: `${index * 0.045}s`,
                                animationDuration: `${0.6 + (index % 7) * 0.1}s`,
                              }}
                            />
                          ))}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
