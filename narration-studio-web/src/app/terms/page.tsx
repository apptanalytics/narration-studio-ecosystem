import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 py-16">
      <Link href="/" className="text-sm font-bold text-neutral-500 hover:text-neutral-950">Narration Studio</Link>
      <h1 className="mt-6 text-4xl font-black">Terms</h1>
      <p className="mt-4 text-neutral-600">Use Narration Studio responsibly, respect voice ownership, follow local laws, and do not misuse voice cloning for fraud, impersonation, harassment, or harmful content.</p>
    </main>
  );
}
