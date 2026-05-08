"use client";

import Link from "next/link";

import { useReducedMotion } from "@/components/aceternity/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function OrbitalRings() {
  const reducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-36 -left-40 h-[620px] w-[620px] opacity-70 md:-bottom-48 md:-left-52 md:h-[820px] md:w-[820px]"
    >
      <div
        className={cn(
          "absolute inset-0 rounded-full border border-text/10 dark:border-white/10",
          !reducedMotion && "animate-[spin_46s_linear_infinite]"
        )}
      />
      <div
        className={cn(
          "absolute inset-[12%] rounded-full border border-text/10 dark:border-white/10",
          !reducedMotion && "animate-[spin_58s_linear_infinite_reverse]"
        )}
      />
      <div
        className={cn(
          "absolute inset-[24%] rounded-full border border-text/15 dark:border-white/15",
          !reducedMotion && "animate-[studyai-float_12s_ease-in-out_infinite]"
        )}
      />
      <div className="absolute left-[54%] top-[18%] h-2 w-2 rounded-full bg-text/25 dark:bg-white/30" />
      <div className="absolute left-[72%] top-[49%] h-px w-24 rotate-[-18deg] bg-text/15 dark:bg-white/15" />
      <div className="absolute left-[44%] top-[63%] h-14 w-14 rounded-full border border-text/10 dark:border-white/10" />
    </div>
  );
}

function TextHoverBrand() {
  return (
    <div className="group inline-flex select-none text-[clamp(64px,15vw,190px)] font-semibold leading-[0.78] tracking-[-0.055em] text-text">
      {"StudyAI".split("").map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className="transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:text-text-muted"
          style={{ transitionDelay: `${index * 24}ms` }}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

export function HeroBanner() {
  return (
    <section id="home-hero-banner" className="relative min-h-screen overflow-hidden bg-surface-alt dark:bg-surface">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_28%,var(--color-surface),transparent_34%)]" aria-hidden />
      <OrbitalRings />
      <div className="absolute right-8 top-32 hidden w-60 rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur md:block" aria-hidden>
        <div className="h-2 w-24 rounded-full bg-border" />
        <div className="mt-4 space-y-2">
          <div className="h-px w-full bg-border" />
          <div className="h-px w-5/6 bg-border" />
          <div className="h-px w-3/5 bg-border" />
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full border border-border-strong" />
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-6 pb-24 pt-40 md:pb-32">
        <div className="max-w-5xl">
          <TextHoverBrand />
          <p className="mt-8 text-sm font-medium uppercase tracking-wide text-text-muted">Past-paper practice</p>
          <h1 className="mt-5 max-w-4xl text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] text-text md:text-[72px]">
            Practice past papers with smarter feedback
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-[1.65] text-text-muted md:text-lg">
            StudyAI helps you answer real exam-style questions, understand what you missed, and improve step by step
            before exams.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/auth/signup">Start Practising</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/how-it-works">See How It Works</Link>
            </Button>
          </div>
        </div>
      </div>
      <div id="hero-card-sentinel" className="pointer-events-none absolute bottom-0 h-0 w-full" aria-hidden />
    </section>
  );
}
