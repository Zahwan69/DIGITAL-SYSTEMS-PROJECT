"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { MovingBorder } from "@/components/aceternity/moving-border";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-full w-full items-center justify-center rounded-[9px] text-sm font-medium transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border border-border-strong bg-accent text-text-on-accent hover:bg-accent-hover",
        default: "border border-border-strong bg-accent text-text-on-accent hover:bg-accent-hover",
        secondary: "border border-border bg-surface-alt text-text hover:bg-accent-soft",
        outline: "border border-border-strong bg-surface text-text hover:bg-surface-alt",
        ghost: "border border-border bg-surface text-text hover:bg-surface-alt",
        destructive: "bg-danger text-text-on-accent hover:opacity-90",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "px-3",
        default: "px-4",
        lg: "px-6",
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
    const actualVariant = variant ?? "primary";
    const heightClass = size === "sm" ? "h-8" : size === "lg" ? "h-11" : "h-10";
    const content = (
      <Comp ref={ref} className={cn(buttonVariants({ variant: actualVariant, size, className }))} {...props} />
    );

    if (actualVariant === "primary" || actualVariant === "default") {
      return (
        <MovingBorder containerClassName={cn(heightClass, props.disabled && "opacity-50")} className="h-full">
          {content}
        </MovingBorder>
      );
    }

    return (
      <span className={cn("inline-flex rounded-[10px]", heightClass, props.disabled && "opacity-50")}>
        {content}
      </span>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
