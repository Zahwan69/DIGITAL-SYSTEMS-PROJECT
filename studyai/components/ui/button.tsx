"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Shared visual language for every Button across the app, matching the
  // aceternity stateful-button look: pill-rounded, thin border, smooth
  // easing, visible ring on hover. No green — colors come from the accent
  // token.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          // Inner border stays subtle; the OUTER ring uses page text colour so
          // hovering shows: button → bg-coloured gap → contrast ring (black
          // in light mode, white in dark mode).
          "border border-text-on-accent/25 bg-accent text-text-on-accent hover:bg-accent-hover hover:border-text-on-accent/40 hover:ring-2 hover:ring-text hover:ring-offset-1 hover:ring-offset-bg hover:shadow-[0_8px_22px_rgba(10,10,10,0.18)] dark:hover:shadow-[0_8px_22px_rgba(0,0,0,0.4)]",
        default:
          "border border-text-on-accent/25 bg-accent text-text-on-accent hover:bg-accent-hover hover:border-text-on-accent/40 hover:ring-2 hover:ring-text hover:ring-offset-1 hover:ring-offset-bg hover:shadow-[0_8px_22px_rgba(10,10,10,0.18)] dark:hover:shadow-[0_8px_22px_rgba(0,0,0,0.4)]",
        secondary:
          "border border-border/60 bg-surface-alt text-text hover:bg-accent-soft hover:border-text hover:ring-2 hover:ring-text hover:ring-offset-1 hover:ring-offset-bg",
        outline:
          "border border-border/60 bg-surface text-text hover:bg-surface-alt hover:border-text hover:ring-2 hover:ring-text hover:ring-offset-1 hover:ring-offset-bg",
        ghost: "text-text hover:bg-surface-alt",
        destructive:
          "border border-text-on-accent/25 bg-danger text-text-on-accent hover:opacity-90 hover:border-text-on-accent hover:ring-2 hover:ring-danger hover:ring-offset-1 hover:ring-offset-bg hover:shadow-[0_8px_22px_rgba(180,40,40,0.18)]",
        link: "text-text underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3",
        default: "h-10 px-4",
        lg: "h-11 px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
