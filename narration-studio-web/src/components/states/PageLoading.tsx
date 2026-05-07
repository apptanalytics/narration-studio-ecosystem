import { Loader2 } from "lucide-react";

export function PageLoading({ title = "Loading", message = "Preparing this page." }: { title?: string; message?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6 dark:bg-neutral-950">
      <div className="card max-w-sm p-6 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-neutral-500" />
        <h1 className="mt-4 text-lg font-black text-neutral-950">{title}</h1>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
      </div>
    </main>
  );
}
