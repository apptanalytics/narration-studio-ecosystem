"use client";

import { PageError } from "@/components/states/PageError";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <PageError title="Admin page failed to load" message={error.message} onRetry={reset} />;
}
