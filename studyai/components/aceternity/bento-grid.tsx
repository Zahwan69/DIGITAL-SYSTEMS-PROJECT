import * as React from "react";

import { cn } from "@/lib/utils";

export function BentoGrid({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4 md:grid-cols-3", className)}>{children}</div>;
}

export function BentoGridItem({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong", className)}>
      {children}
    </div>
  );
}
