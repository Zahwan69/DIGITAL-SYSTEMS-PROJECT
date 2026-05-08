"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { useReducedMotion } from "@/components/aceternity/use-reduced-motion";
import { cn } from "@/lib/utils";

export type CarouselSlide = {
  title: string;
  button: string;
  src: string;
};

export default function Carousel({ slides }: { slides: CarouselSlide[] }) {
  const [active, setActive] = useState(0);
  const reducedMotion = useReducedMotion();
  const activeSlide = slides[active];

  function go(direction: -1 | 1) {
    setActive((current) => (current + direction + slides.length) % slides.length);
  }

  if (!activeSlide) return null;

  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="grid min-h-[520px] md:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-between p-6 md:p-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-text-muted">
              Step {active + 1} of {slides.length}
            </p>
            <motion.h3
              key={activeSlide.title}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-text md:text-[48px]"
            >
              {activeSlide.title}
            </motion.h3>
            <p className="mt-5 max-w-sm text-base leading-[1.65] text-text-muted">
              {activeSlide.button}
            </p>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-surface text-text transition-colors hover:border-border-strong hover:bg-surface-alt"
              aria-label="Previous slide"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-surface text-text transition-colors hover:border-border-strong hover:bg-surface-alt"
              aria-label="Next slide"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <div className="ml-2 flex gap-1.5">
              {slides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  aria-label={`Go to ${slide.title}`}
                  onClick={() => setActive(index)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === active ? "w-7 bg-text" : "w-1.5 bg-border-strong"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="relative min-h-[320px] overflow-hidden bg-surface-alt md:min-h-full">
          <motion.div
            key={activeSlide.src}
            initial={reducedMotion ? false : { opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={activeSlide.src}
              alt=""
              aria-hidden="true"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover opacity-80 dark:opacity-90 dark:mix-blend-screen"
            />
          </motion.div>
          <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-surface),transparent_42%)] md:bg-[linear-gradient(to_right,var(--color-surface),transparent_38%)]" />
        </div>
      </div>
    </div>
  );
}
