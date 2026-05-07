import Link from "next/link";
import { ArrowRight, Building2, Check, HeartHandshake, ShieldCheck } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    features: [
      "5,000 credits/month",
      "5 voice clones",
      "Voice cloning from 10 seconds",
      "Standard voice library",
      "Speech to Text",
      "History",
      "API access",
      "500 API requests/month",
      "No credit card required",
    ],
  },
  {
    name: "Basic",
    price: "$2.99",
    period: "/month",
    features: [
      "30,000 credits/month",
      "10 voice clones",
      "Higher quality voice",
      "Commercial license",
      "Email support",
      "API access",
      "10,000 API requests/month",
    ],
  },
  {
    name: "Starter",
    price: "$6.99",
    period: "/month",
    features: [
      "70,000 credits/month",
      "20 voice clones",
      "Advanced voice control",
      "Priority processing",
      "API access",
      "50,000 API requests/month",
    ],
  },
  {
    name: "Studio",
    price: "$11.99",
    period: "/month",
    popular: true,
    features: [
      "150,000 credits/month",
      "Unlimited voice cloning",
      "API access",
      "Priority support",
      "150,000 API requests/month",
    ],
  },
  {
    name: "Studio Max",
    price: "$49.99",
    period: "/month",
    features: [
      "600,000 credits/month",
      "Maximum voice quality",
      "Unlimited voice cloning",
      "Fastest processing",
      "Full commercial license",
      "Dedicated support",
      "500,000 API requests/month",
    ],
  },
];

const policySections = [
  {
    title: "Refund Policy",
    items: [
      "We offer a full refund within 7 days of purchase if you are not satisfied.",
      "Refunds are only valid if usage is reasonable, with no abuse of API or credits.",
      "After heavy usage, refunds may not be granted.",
      "Contact support to request a refund.",
    ],
  },
  {
    title: "Voice Safety & Identity Verification",
    items: [
      "Users must verify their identity before cloning voices.",
      "Verification may require government ID, phone number, and email verification.",
      "You can only clone your own voice or voices you have permission to use.",
      "Impersonation, fraud, and deepfake misuse are strictly prohibited.",
      "Uploaded voice data is protected and is not shared publicly.",
      "Violations may result in account suspension or a permanent ban.",
    ],
  },
  {
    title: "Terms of Use",
    items: [
      "Use the platform responsibly.",
      "Do not misuse voice cloning for harmful purposes.",
      "Respect privacy and ownership of voices.",
      "Follow local laws and regulations.",
      "We reserve the right to suspend accounts that violate these terms.",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-black">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-950 text-white">N</span>
            Narration Studio
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-neutral-600 md:flex">
            <Link href="/">Home</Link>
            <Link href="/dashboard/studio">Studio</Link>
            <Link href="/docs/v1/generate-speech">API Docs</Link>
            <Link href="/changelog">Changelog</Link>
            <Link href="/login">Login</Link>
          </nav>
          <Link href="/register" className="rounded-full bg-neutral-950 px-5 py-2 text-sm font-bold text-white">
            Get Started Free
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-24">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-700">
          <HeartHandshake className="h-4 w-4" />
          30% of all revenue is donated to hospitals and social causes
        </div>
        <h1 className="text-5xl font-black tracking-tight sm:text-6xl">Simple, transparent pricing</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
          Choose the plan that fits your needs. Start free, upgrade anytime.
        </p>
        <Link href="/register" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-neutral-950 px-6 text-sm font-bold text-white transition hover:-translate-y-0.5">
          Get Started Free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                plan.popular ? "border-2 border-neutral-950 bg-neutral-950 text-white" : "border border-neutral-200 bg-neutral-50"
              }`}
            >
              {plan.popular ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-xs font-black uppercase tracking-widest text-neutral-950 shadow">
                  Most Popular
                </div>
              ) : null}
              <h2 className="text-2xl font-black uppercase tracking-tight">{plan.name}</h2>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className={plan.popular ? "pb-1 text-white/70" : "pb-1 text-neutral-500"}>{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.popular ? "bg-white/15" : "bg-white"}`}>
                      <Check className="h-3 w-3" />
                    </span>
                    <span className={plan.popular ? "text-white/90" : "text-neutral-700"}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-8 flex h-11 items-center justify-center rounded-xl text-sm font-bold transition ${
                  plan.popular ? "bg-white text-neutral-950 hover:bg-neutral-100" : "bg-neutral-950 text-white hover:bg-neutral-800"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[360px_1fr] lg:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <HeartHandshake className="h-8 w-8" />
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="text-3xl font-black">We give back</h2>
            <p className="mt-4 text-lg leading-8 text-neutral-600">
              Narration Studio donates 30% of all revenue to hospitals and social causes.
              Your subscription helps support healthcare and people in need.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7" />
          <h2 className="text-3xl font-black">Trust, safety, and terms</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {policySections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black">{section.title}</h3>
              <ul className="mt-5 space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-700">
                    <Check className="mt-1 h-4 w-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-neutral-950 px-4 py-20 text-white sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Building2 className="mx-auto mb-5 h-10 w-10" />
          <h2 className="text-4xl font-black tracking-tight">Start creating voice in seconds</h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-neutral-950">
              Get Started Free
            </Link>
            <Link href="/docs/v1/generate-speech" className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white">
              Contact Support
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-neutral-600 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Narration Studio. All rights reserved.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/pricing">Privacy Policy</Link>
            <Link href="/pricing">Terms</Link>
            <Link href="/dashboard/api">Contact</Link>
            <Link href="/docs/v1/generate-speech">API Docs</Link>
            <Link href="/changelog">Changelog</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
