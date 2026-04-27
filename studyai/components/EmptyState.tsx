import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface-alt px-6 py-10 text-center",
        className
      )}
    >
      {icon ? <div className="text-text-muted">{icon}</div> : null}
      <div>
        <p className="font-medium text-text">{title}</p>
        <p className="mt-1 max-w-md text-sm text-text-muted">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
