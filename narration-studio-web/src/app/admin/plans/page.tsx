"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import type { PricingPlan } from "@/lib/types";

function blankPlan(): Partial<PricingPlan> {
  return {
    name: "",
    slug: "",
    price_monthly: 0,
    credits: 0,
    api_requests_limit: 0,
    api_access_enabled: true,
    voice_clone_limit: 0,
    max_text_chars: 20000,
    is_active: true,
  };
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [draft, setDraft] = useState<Partial<PricingPlan>>(blankPlan());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.adminPlans();
      setPlans(data.plans);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updatePlan(id: number, patch: Partial<PricingPlan>) {
    setPlans((items) => items.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan)));
  }

  async function savePlan(plan: PricingPlan) {
    setSavingId(plan.id);
    try {
      await api.adminPatchPlan(plan.id, plan);
      toast.success("Plan updated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update plan.");
    } finally {
      setSavingId(null);
    }
  }

  async function createPlan() {
    setSavingId("new");
    try {
      await api.adminCreatePlan(draft);
      setDraft(blankPlan());
      toast.success("Plan created.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create plan.");
    } finally {
      setSavingId(null);
    }
  }

  async function deletePlan(plan: PricingPlan) {
    if (!window.confirm(`Deactivate ${plan.name}?`)) return;
    setSavingId(plan.id);
    try {
      await api.adminDeletePlan(plan.id);
      toast.success("Plan deactivated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not deactivate plan.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Plans</h1>
          <p className="mt-2 max-w-3xl text-neutral-600">Create, edit, deactivate, and tune dynamic pricing plans used by user assignment.</p>
        </div>
        <button className="btn secondary" onClick={() => void load()} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Refresh</button>
      </div>

      <div className="card mt-6 p-4">
        <h2 className="text-lg font-black">Create Plan</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input className="field" placeholder="Name" value={draft.name || ""} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <input className="field" placeholder="slug" value={draft.slug || ""} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
          <input className="field" type="number" placeholder="Monthly price" value={draft.price_monthly || 0} onChange={(event) => setDraft({ ...draft, price_monthly: Number(event.target.value) })} />
          <button className="btn" onClick={() => void createPlan()} disabled={savingId === "new"}>{savingId === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create</button>
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto p-4">
        <table className="w-full min-w-[1060px] text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs font-black uppercase text-neutral-500">
            <tr><th className="p-3">Name</th><th className="p-3">Slug</th><th className="p-3">Price</th><th className="p-3">Credits</th><th className="p-3">API Limit</th><th className="p-3">API</th><th className="p-3">Clone Limit</th><th className="p-3">Text Limit</th><th className="p-3">Active</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3"><input className="field w-36" value={plan.name} onChange={(event) => updatePlan(plan.id, { name: event.target.value })} /></td>
                <td className="p-3"><input className="field w-36" value={plan.slug} onChange={(event) => updatePlan(plan.id, { slug: event.target.value })} /></td>
                <td className="p-3"><input className="field w-24" type="number" value={plan.price_monthly} onChange={(event) => updatePlan(plan.id, { price_monthly: Number(event.target.value) })} /></td>
                <td className="p-3"><input className="field w-28" type="number" value={plan.credits} onChange={(event) => updatePlan(plan.id, { credits: Number(event.target.value) })} /></td>
                <td className="p-3"><input className="field w-28" type="number" value={plan.api_requests_limit} onChange={(event) => updatePlan(plan.id, { api_requests_limit: Number(event.target.value) })} /></td>
                <td className="p-3"><input type="checkbox" checked={plan.api_access_enabled} onChange={(event) => updatePlan(plan.id, { api_access_enabled: event.target.checked })} /></td>
                <td className="p-3"><input className="field w-24" type="number" value={plan.voice_clone_limit} onChange={(event) => updatePlan(plan.id, { voice_clone_limit: Number(event.target.value) })} /></td>
                <td className="p-3"><input className="field w-28" type="number" value={plan.max_text_chars || 0} onChange={(event) => updatePlan(plan.id, { max_text_chars: Number(event.target.value) })} /></td>
                <td className="p-3"><input type="checkbox" checked={plan.is_active} onChange={(event) => updatePlan(plan.id, { is_active: event.target.checked })} /></td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100" onClick={() => void savePlan(plan)} disabled={savingId === plan.id}>{savingId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}</button>
                    <button className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50" onClick={() => void deletePlan(plan)} disabled={savingId === plan.id}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
