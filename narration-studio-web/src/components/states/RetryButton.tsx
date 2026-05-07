"use client";

import { RefreshCw } from "lucide-react";

type RetryButtonProps = {
  onRetry: () => void;
  label?: string;
  disabled?: boolean;
};

export function RetryButton({ onRetry, label = "Retry", disabled = false }: RetryButtonProps) {
  return (
    <button className="btn" onClick={onRetry} disabled={disabled}>
      <RefreshCw className="h-4 w-4" />
      {label}
    </button>
  );
}
