"use client";

import { PageError } from "@/components/states/PageError";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <PageError title="Pricing failed to load" message={error.message} onRetry={reset} />;
}
