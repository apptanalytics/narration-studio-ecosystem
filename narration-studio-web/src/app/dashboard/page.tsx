import Link from "next/link";
import { Shell } from "@/components/Shell";

const cards = [
  ["/dashboard/studio", "Studio", "Generate sync audio or queue long jobs."],
  ["/dashboard/history", "History", "Play, download, and delete jobs."],
  ["/dashboard/voice-cloning", "Voice Cloning", "Upload a permitted voice sample."],
  ["/dashboard/voice-clones", "Voice Clones", "Manage uploaded voice references."],
  ["/dashboard/usage", "Usage", "Review credits, requests, and storage."],
  ["/dashboard/api", "API", "Manage API key workflow."],
  ["/dashboard/billing", "Billing", "Review plans and usage."],
  ["/dashboard/settings", "Settings", "Account and preferences."],
];

export default function Dashboard() {
  return (
    <Shell>
      <h1 className="text-3xl font-black">Dashboard</h1>
      <p className="mt-2 text-neutral-600">Choose a workspace area.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {cards.map(([href, title, text]) => (
          <Link key={href} href={href} className="card p-5 transition hover:-translate-y-0.5">
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-2 text-neutral-600">{text}</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
