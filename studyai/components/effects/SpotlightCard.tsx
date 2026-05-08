"use client";

import * as React from "react";

import { useReducedMotion } from "@/components/aceternity/use-reduced-motion";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className,
  disableMotion,
}: React.HTMLAttributes<HTMLDivElement> & { disableMotion?: boolean }) {
  const reducedMotion = useReducedMotion();
  const staticMode = disableMotion || reducedMotion;
  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x: 50, y: 50 });

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (staticMode || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      className={cn("relative overflow-hidden rounded-xl border border-border bg-surface", className)}
    >
      {!staticMode ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at ${position.x}% ${position.y}%, var(--color-accent-soft), transparent 38%)`,
          }}
        />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}
