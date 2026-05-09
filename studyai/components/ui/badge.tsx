import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-surface-alt text-text-muted",
      secondary: "bg-surface-alt text-text-muted",
      accent: "bg-surface-alt text-text",
      success: "bg-surface-alt text-success",
      warning: "bg-surface-alt text-text",
      danger: "bg-surface-alt text-danger",
      easy: "bg-surface-alt text-text",
      medium: "bg-surface-alt text-text-muted",
      hard: "bg-surface-alt text-text",
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
