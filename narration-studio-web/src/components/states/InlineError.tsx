import { AlertCircle } from "lucide-react";

export function InlineError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-red-600">
      <AlertCircle className="h-4 w-4" />
      {message}
    </p>
  );
}
