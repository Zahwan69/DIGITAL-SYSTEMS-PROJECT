"use client";

import * as React from "react";
import { motion, useScroll, useTransform } from "motion/react";

import { useReducedMotion } from "@/components/aceternity/use-reduced-motion";
import { cn } from "@/lib/utils";

export function TracingBeam({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start center", "end center"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="absolute bottom-0 left-4 top-0 hidden w-px bg-border md:block" aria-hidden>
        {reducedMotion ? (
          <div className="h-full w-px bg-text" />
        ) : (
          <motion.div className="origin-top bg-text" style={{ scaleY, height: "100%" }} />
        )}
      </div>
      <div className="md:pl-14">{children}</div>
    </div>
  );
}
