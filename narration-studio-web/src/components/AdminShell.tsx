"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  CreditCard,
  Gauge,
  LayoutDashboard,
  KeyRound,
  Lock,
  Mic2,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useAppSelector } from "@/store/hooks";
import { useMeQuery } from "@/store/api/authApi";

const links = [
  ["/admin", "Overview", Gauge],
  ["/admin/users", "Users", Users],
  ["/admin/plans", "Plans", CreditCard],
  ["/admin/verifications", "Verifications", ShieldCheck],
  ["/admin/roles", "Roles", ShieldCheck],
  ["/admin/voices", "Voices", Mic2],
  ["/admin/voice-clones", "Voice Clones", Sparkles],
  ["/admin/credits", "Credits", WalletCards],
  ["/admin/purchases", "Purchases", CreditCard],
  ["/admin/api-access", "API Access", Shield],
  ["/admin/security", "Security", Lock],
  ["/admin/settings", "Settings", Settings],
  ["/admin/audit-logs", "Audit Logs", Activity],
  ["/admin/api-keys", "API Keys", KeyRound],
  ["/admin/api-logs", "API Logs", BarChart3],
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const { isLoading, isError } = useMeQuery();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (isError) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user) {
      if (!["admin", "super_admin"].includes(user.role || "")) {
        setDenied(true);
        return;
      }
      setDenied(false);
    }
  }, [isError, isLoading, pathname, router, user]);

  if (isLoading && !user) return <PageSkeleton variant="admin" />;

  if (denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
        <div className="card max-w-md p-6 text-center">
          <Shield className="mx-auto h-10 w-10 text-neutral-400" />
          <h1 className="mt-4 text-2xl font-black">Access Denied</h1>
          <p className="mt-2 text-sm text-neutral-600">Your account is logged in, but it does not have an admin role.</p>
          <Link href="/dashboard/studio" className="btn mt-5">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <aside className="fixed inset-y-0 hidden w-64 border-r border-neutral-200 bg-white p-4 md:block">
        <Link href="/admin" className="mb-8 flex items-center gap-2 text-lg font-black"><Shield className="h-5 w-5" /> Admin</Link>
        <Link href="/dashboard/studio" className="mb-4 flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-100">
          <LayoutDashboard className="h-4 w-4" />
          User Dashboard
        </Link>
        <nav className="space-y-1 overflow-y-auto">
          {links.map(([href, label, Icon]) => (
            <Link key={href} href={href} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${pathname === href || (href !== "/admin" && pathname.startsWith(href)) ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto md:hidden">{links.slice(0, 8).map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap text-sm font-bold">{label}</Link>)}</div>
          <Link href="/dashboard/studio" className="ml-auto mr-4 hidden rounded-xl border border-neutral-200 px-3 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-100 sm:block">
            User Dashboard
          </Link>
          <p className="text-sm font-bold">{user?.email} <span className="text-neutral-400">({user?.role})</span></p>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
