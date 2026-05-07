"use client";

import * as React from "react";
import { motion } from "motion/react";

import { useReducedMotion } from "@/components/aceternity/use-reduced-motion";
import { cn } from "@/lib/utils";

export function MovingBorder({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <span className={cn("relative inline-flex overflow-hidden rounded-[10px] p-px", containerClassName)}>
      <span className="absolute inset-0 rounded-[10px] bg-[--color-border-strong]" aria-hidden />
      {reducedMotion ? null : (
        <motion.span
          aria-hidden
          className="absolute inset-[-40%] rounded-full bg-[conic-gradient(from_0deg,var(--color-border),var(--color-text),var(--color-border))] opacity-70"
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      )}
      <span className={cn("relative inline-flex rounded-[9px]", className)}>{children}</span>
    </span>
  );
}
