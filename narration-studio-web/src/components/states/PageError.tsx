"use client";

import { AlertTriangle } from "lucide-react";
import { RetryButton } from "@/components/states/RetryButton";

type PageErrorProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function PageError({ title = "Could not load this page", message = "Try again or refresh the page.", onRetry }: PageErrorProps) {
  return (
    <div className="card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-black text-neutral-950">{title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{message}</p>
          </div>
        </div>
        {onRetry ? <RetryButton onRetry={onRetry} /> : null}
      </div>
    </div>
  );
}
