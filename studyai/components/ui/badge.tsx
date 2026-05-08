import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-surface-alt text-text-muted",
      secondary: "bg-surface-alt text-text-muted",
      accent: "bg-accent-soft text-accent",
      success: "bg-accent-soft text-success",
      warning: "bg-accent-soft text-warning",
      danger: "bg-accent-soft text-danger",
      easy: "bg-accent-soft text-success",
      medium: "bg-accent-soft text-warning",
      hard: "bg-accent-soft text-danger",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
