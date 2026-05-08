import * as React from "react";

import { cn } from "@/lib/utils";

export function CardHoverEffect({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface transition-colors hover:border-border-strong hover:bg-surface-alt", className)}>
      {children}
    </div>
  );
}
