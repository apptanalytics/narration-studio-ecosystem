import Link from "next/link";

export default function VoiceSafetyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 py-16">
      <Link href="/" className="text-sm font-bold text-neutral-500 hover:text-neutral-950">Narration Studio</Link>
      <h1 className="mt-6 text-4xl font-black">Voice Safety Policy</h1>
      <div className="mt-4 space-y-4 text-neutral-600">
        <p>Only clone your own voice or voices you have permission to use.</p>
        <p>Impersonation, fraud, deepfake misuse, and privacy violations are prohibited and may result in account suspension or a permanent ban.</p>
      </div>
    </main>
  );
}
