"use client";

import { Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { EmptyState } from "@/components/states/EmptyState";
import { PageError } from "@/components/states/PageError";
import { NotificationsSkeleton } from "@/components/skeletons/NotificationsSkeleton";
import { useClearNotificationsMutation, useDeleteNotificationMutation, useMarkNotificationsReadMutation, useNotificationsQuery } from "@/store/api/notificationsApi";

export default function NotificationsPage() {
  const query = useNotificationsQuery();
  const [markRead] = useMarkNotificationsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [clearNotifications] = useClearNotificationsMutation();
  const notifications = query.data?.notifications ?? [];

  async function run(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      toast.success(label);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Notification action failed.");
    }
  }

  if (query.isLoading) return <NotificationsSkeleton />;

  return (
    <Shell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">Notifications</h1>
          <p className="mt-2 text-neutral-600">Review account, billing, API, and generation updates.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-bold" onClick={() => void run("Notifications marked read.", () => markRead().unwrap())} disabled={!notifications.length}>Mark read</button>
          <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700" onClick={() => void run("Notifications cleared.", () => clearNotifications().unwrap())} disabled={!notifications.length}>Clear all</button>
        </div>
      </div>
      <div className="mt-6">
        {query.isError ? <PageError message="Could not load notifications." onRetry={query.refetch} /> : null}
        {!query.isError && notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" message="New account and API events will appear here." /> : null}
        {!query.isError && notifications.length ? (
          <div className="card divide-y divide-neutral-100">
            {notifications.map((item) => (
              <div key={item.id} className="flex gap-4 p-4">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${item.is_read || item.read_at ? "bg-neutral-300" : "bg-neutral-950"}`} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-black">{item.title}</h2>
                  <p className="mt-1 text-sm text-neutral-600">{item.message}</p>
                </div>
                <button className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:border-red-200 hover:text-red-700" onClick={() => void run("Notification deleted.", () => deleteNotification(String(item.id)).unwrap())} aria-label="Delete notification">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
