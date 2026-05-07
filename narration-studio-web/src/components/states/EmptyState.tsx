import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon = Inbox, title, message, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center shadow-sm dark:bg-neutral-900">
      <Icon className="mx-auto h-8 w-8 text-neutral-400" />
      <h2 className="mt-4 text-lg font-black text-neutral-950">{title}</h2>
      {message ? <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">{message}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
