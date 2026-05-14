"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type ButtonState = "idle" | "loading" | "success";

type StatefulButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onClick?: () => Promise<unknown> | unknown;
};

export function Button({ children, className, disabled, onClick, ...props }: StatefulButtonProps) {
  const [state, setState] = React.useState<ButtonState>("idle");

  async function handleClick() {
    if (!onClick || state === "loading") return;
    const result = onClick();
    if (!result || typeof (result as Promise<unknown>).then !== "function") return;

    try {
      setState("loading");
      await result;
      setState("success");
      window.setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || state === "loading"}
      onClick={() => void handleClick()}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-text-on-accent bg-accent px-5 text-sm font-medium text-text-on-accent transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-accent-hover hover:ring-2 hover:ring-text-on-accent hover:ring-offset-1 hover:ring-offset-bg hover:shadow-[0_8px_22px_rgba(10,10,10,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:shadow-[0_8px_22px_rgba(0,0,0,0.4)]",
        className
      )}
      {...props}
    >
      {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {state === "success" ? <Check className="h-4 w-4" aria-hidden /> : null}
      <span>{state === "success" ? "Done" : children}</span>
    </button>
  );
}
