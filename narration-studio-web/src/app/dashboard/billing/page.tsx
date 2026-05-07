import { Check } from "lucide-react";
import { Shell } from "@/components/Shell";

const plans = [
  ["Free", "$0", "No credit card required", "5,000 credits / month", ["5 voice clones", "Voice cloning from 10 seconds", "Standard voice library", "Speech to Text", "History", "API access", "500 API requests/month"]],
  ["Basic", "$2.99", "For light personal use", "30,000 credits / month", ["10 voice clones", "Higher quality voice", "Commercial license", "Email support", "API access", "10,000 API requests/month"]],
  ["Starter", "$6.99", "For creators and side projects", "70,000 credits / month", ["20 voice clones", "Advanced voice control", "Priority processing", "API access", "50,000 API requests/month"]],
  ["Studio", "$11.99", "For growing teams", "150,000 credits / month", ["Unlimited voice cloning", "API access", "Priority support", "150,000 API requests/month"]],
  ["Studio Max", "$49.99", "For high-volume apps", "600,000 credits / month", ["Maximum voice quality", "Unlimited voice cloning", "Fastest processing", "Full commercial license", "Dedicated support", "500,000 API requests/month"]],
] as const;

const rows = [
  ["Monthly credits", "5,000", "30,000", "70,000", "150,000", "600,000"],
  ["Voice clones", "5", "10", "20", "Unlimited", "Unlimited"],
  ["API requests/month", "500", "10,000", "50,000", "150,000", "500,000"],
  ["Commercial use", "-", "Yes", "Yes", "Yes", "Full"],
  ["API access", "Yes", "Yes", "Yes", "Yes", "Yes"],
  ["Support", "Community", "Email", "Priority", "Priority", "Dedicated"],
] as const;

export default function BillingPage() {
  return (
    <Shell>
      <div className="mb-10 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-widest text-neutral-500">Billing</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Simple, transparent pricing</h1>
        <p className="mt-4 text-lg text-neutral-600">
          This page carries the full pricing experience. The home page stays focused on the product story.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        {plans.map(([name, price, description, credits, features]) => {
          const featured = name === "Studio";
          return (
            <div key={name} className={`relative flex flex-col rounded-2xl p-6 shadow-lg ${featured ? "border-2 border-neutral-950 bg-neutral-950 text-white xl:-my-4" : "border border-neutral-200 bg-white"}`}>
              {featured ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-bold tracking-widest text-neutral-950 uppercase shadow">
                  Most Popular
                </div>
              ) : null}
              <h2 className="text-2xl font-bold">{name}</h2>
              <p className={featured ? "mt-2 text-sm text-white/70" : "mt-2 text-sm text-neutral-500"}>{description}</p>
              <p className="mt-6 text-4xl font-black">{price}</p>
              <p className={featured ? "mt-3 text-white/80" : "mt-3 text-neutral-600"}>{credits}</p>
              <button className={`mt-6 h-11 rounded-xl text-sm font-bold ${featured ? "bg-white text-neutral-950" : "border border-neutral-200 hover:bg-neutral-100"}`}>
                {name === "Free" ? "Current plan" : "Upgrade"}
              </button>
              <ul className="mt-6 space-y-3 text-sm">
                {features.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${featured ? "bg-white/20" : "bg-neutral-100"}`}>
                      <Check className="h-3 w-3" />
                    </span>
                    <span className={featured ? "text-white/90" : "text-neutral-600"}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="card mt-12 overflow-x-auto p-5">
        <h2 className="mb-5 text-2xl font-black">Compare plans</h2>
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="py-3 pr-6 text-left text-neutral-500">Feature</th>
              {plans.map(([name]) => <th key={name} className="px-4 py-3 text-center">{name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([feature, ...values]) => (
              <tr key={feature} className="border-b border-neutral-100 last:border-0">
                <td className="py-3 pr-6 font-semibold text-neutral-600">{feature}</td>
                {values.map((value, index) => (
                  <td key={`${feature}-${index}`} className="px-4 py-3 text-center font-medium">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
