"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Code2,
  CreditCard,
  History,
  Languages,
  LogOut,
  Mic2,
  Moon,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  User,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageSkeleton } from "@/components/PageSkeleton";
import type { Visitor } from "@/lib/types";
import type { NotificationRecord } from "@/lib/types";
import { useAppSelector } from "@/store/hooks";
import { useLogoutMutation, useMeQuery } from "@/store/api/authApi";
import { useClearNotificationsMutation, useDeleteNotificationMutation, useMarkNotificationsReadMutation, useNotificationsQuery } from "@/store/api/notificationsApi";

const links = [
  ["/dashboard/studio", "Studio", Mic2],
  ["/dashboard/history", "History", History],
  ["/dashboard/voice-cloning", "Voice Cloning", Sparkles],
  ["/dashboard/voice-clones", "Voice Clones", UserRound],
  ["/dashboard/usage", "Usage", BarChart3],
  ["/dashboard/api", "API", Code2],
  ["/dashboard/billing", "Billing", CreditCard],
  ["/notifications", "Notifications", Bell],
  ["/dashboard/settings", "Settings", Settings],
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const { isLoading: authLoading, isError: authError } = useMeQuery();
  const [logoutMutation] = useLogoutMutation();
  const notificationsQuery = useNotificationsQuery(undefined, { skip: !user });
  const [markNotificationsRead] = useMarkNotificationsReadMutation();
  const [deleteNotificationMutation] = useDeleteNotificationMutation();
  const [clearNotificationsMutation] = useClearNotificationsMutation();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const unread = notifications.filter((item) => !item.is_read && !item.read_at).length;
  const [language, setLanguage] = useState<"en" | "km">(() => {
    if (typeof window === "undefined") return "en";
    return window.localStorage.getItem("narration_language") === "km" ? "km" : "en";
  });
  const { resolvedTheme, setTheme } = useTheme();
  const isAdmin = user?.role === "admin" || visitor?.admin_allowed;
  const isUltimate = isAdmin || visitor?.ultimate_clone_allowed;
  const creditsUsed = visitor?.generation_used ?? 0;
  const creditsTotal = visitor?.generation_limit ?? 5;
  const creditsPercent = useMemo(() => Math.min(100, Math.round((creditsUsed / Math.max(creditsTotal, 1)) * 100)), [creditsTotal, creditsUsed]);

  useEffect(() => {
    let active = true;
    if (!authLoading && authError) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    if (user) api.visitor().then((data) => active && setVisitor(data)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [authError, authLoading, pathname, router, user]);

  useEffect(() => {
    if (notificationsQuery.data?.notifications) {
      setNotifications(notificationsQuery.data.notifications.map(normalizeNotification));
    }
  }, [notificationsQuery.data]);

  async function logout() {
    try {
      await logoutMutation().unwrap();
      toast.success("Logged out.");
    } catch {
      toast.error("Logout failed.");
    } finally {
      router.replace("/login");
    }
  }

  function toggleLanguage() {
    setLanguage((current) => {
      const next = current === "en" ? "km" : "en";
      window.localStorage.setItem("narration_language", next);
      window.dispatchEvent(new CustomEvent("narration-language-change", { detail: next }));
      return next;
    });
  }

  async function markRead() {
    await markNotificationsRead().unwrap();
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() })));
  }

  async function clearOne(id: string) {
    await deleteNotificationMutation(id).unwrap();
    setNotifications((current) => current.filter((item) => String(item.id) !== String(id)));
  }

  async function clearAll() {
    await clearNotificationsMutation().unwrap();
    setNotifications([]);
  }

  if (authLoading && !user) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-neutral-200 bg-white p-4 md:block">
        <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-bold">
          <Mic2 className="h-5 w-5" />
          Narration Studio
        </Link>
        <nav className="space-y-1">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                pathname === href ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {user?.role === "admin" ? (
            <Link
              href="/admin/api-access"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          ) : null}
        </nav>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur">
          <nav className="flex gap-2 overflow-x-auto md:hidden">
            {links.slice(0, 5).map(([href, label]) => (
              <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-2 py-1 text-sm font-semibold text-neutral-700">
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-100"
            >
              <Languages className="h-4 w-4" />
              {language === "en" ? "English" : "ខ្មែរ"}
            </button>
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="rounded-xl border border-neutral-200 bg-white p-2 hover:bg-neutral-100"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((current) => !current)}
                className="relative rounded-xl border border-neutral-200 bg-white p-2 hover:bg-neutral-100"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unread ? <span className="absolute -right-1 -top-1 rounded-full bg-neutral-950 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span> : null}
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-bold">Notifications</p>
                    <div className="flex items-center gap-2">
                      <button className="text-xs font-bold text-neutral-500 hover:text-neutral-950" onClick={() => void markRead()} disabled={notifications.length === 0}>Mark read</button>
                      <button className="text-xs font-bold text-red-600 hover:text-red-700 disabled:text-neutral-300" onClick={() => void clearAll()} disabled={notifications.length === 0}>Clear all</button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? <p className="p-3 text-sm text-neutral-500">No notifications.</p> : null}
                    {notifications.slice(0, 10).map((item) => (
                      <div key={item.id} className={`flex gap-2 rounded-xl p-3 ${item.is_read || item.read_at ? "" : "bg-neutral-100"}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold">{item.title}</p>
                          <p className="mt-1 text-xs text-neutral-600">{item.message}</p>
                        </div>
                        <button
                          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => void clearOne(item.id)}
                          aria-label="Clear notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2 py-1.5 hover:bg-neutral-100"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-neutral-950 text-white">
                  {user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : <User className="h-4 w-4" />}
                </span>
                <span className="hidden max-w-36 truncate text-sm font-semibold sm:block">{user?.name || user?.full_name || user?.email}</span>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl">
                  <div className="border-b border-neutral-200 pb-3">
                    <p className="truncate font-bold">{user?.name || user?.full_name || "Narration user"}</p>
                    <p className="truncate text-sm text-neutral-500">{user?.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <p className="inline-flex rounded-full bg-neutral-100 px-2 py-1 text-xs font-bold text-neutral-700">Ready</p>
                      {isAdmin ? <p className="inline-flex rounded-full bg-neutral-950 px-2 py-1 text-xs font-bold text-white">Admin</p> : null}
                      {isUltimate ? <p className="inline-flex rounded-full bg-neutral-100 px-2 py-1 text-xs font-bold text-neutral-700">Ultimate</p> : null}
                    </div>
                  </div>
                  <div className="py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">Credits Used</span>
                      <span className="text-neutral-500">{creditsUsed} / {isUltimate ? "Unlimited" : creditsTotal}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-neutral-950" style={{ width: `${isUltimate ? 100 : creditsPercent}%` }} />
                    </div>
                    <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
                      <WalletCards className="h-4 w-4" />
                      Plan: {isUltimate ? "Ultimate admin unlimited" : `${creditsTotal} generations`}
                    </p>
                  </div>
                  <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-neutral-100" onClick={() => setMenuOpen(false)}>
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  {user?.role === "admin" ? (
                    <Link href="/admin/api-access" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-neutral-100" onClick={() => setMenuOpen(false)}>
                      <Shield className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  ) : null}
                  <button type="button" onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function normalizeNotification(item: NotificationRecord): NotificationRecord {
  return { ...item, is_read: Boolean(item.is_read || item.read_at) };
}
