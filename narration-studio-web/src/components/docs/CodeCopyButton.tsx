"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="absolute right-3 top-3 rounded-lg border border-white/10 bg-white/10 p-2 text-white hover:bg-white/20"
      aria-label="Copy code"
      onClick={() => {
        void navigator.clipboard.writeText(code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
