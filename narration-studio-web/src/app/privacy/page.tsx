import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 py-16">
      <Link href="/" className="text-sm font-bold text-neutral-500 hover:text-neutral-950">Narration Studio</Link>
      <h1 className="mt-6 text-4xl font-black">Privacy Policy</h1>
      <p className="mt-4 text-neutral-600">We protect uploaded voice data and account information. Voice references are used to provide requested generation features and are not shared publicly by default.</p>
    </main>
  );
}
