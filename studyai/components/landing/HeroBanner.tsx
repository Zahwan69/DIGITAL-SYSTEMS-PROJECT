import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

function OrbitalRings() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-36 -left-40 h-[620px] w-[620px] opacity-70 md:-bottom-48 md:-left-52 md:h-[820px] md:w-[820px]"
    >
      <div className="absolute inset-0 rounded-full border border-neutral-950/10" />
      <div className="absolute inset-[12%] rounded-full border border-neutral-950/10" />
      <div className="absolute inset-[24%] rounded-full border border-neutral-950/15" />
      <div className="absolute left-[54%] top-[18%] h-2 w-2 rounded-full bg-neutral-950/25" />
      <div className="absolute left-[72%] top-[49%] h-px w-24 rotate-[-18deg] bg-neutral-950/15" />
      <div className="absolute left-[44%] top-[63%] h-14 w-14 rounded-full border border-neutral-950/10" />
    </div>
  );
}

function TextHoverBrand() {
  return (
    <div className="inline-flex select-none text-[clamp(64px,15vw,190px)] font-semibold leading-[0.78] tracking-[-0.055em] text-neutral-950">
      {"StudyAI".split("").map((letter, index) => (
        <span key={`${letter}-${index}`}>
          {letter}
        </span>
      ))}
    </div>
  );
}

export function HeroBanner() {
  return (
    <section id="home-hero-banner" className="relative min-h-screen overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_28%,#ffffff,transparent_34%)]" aria-hidden />
      <div className="absolute inset-y-10 right-0 hidden w-[62%] lg:block" aria-hidden>
        <Image
          src="/images/landing/hero-studyai-workflow.png"
          alt=""
          fill
          priority
          sizes="62vw"
          className="object-cover object-center opacity-70 [mask-image:linear-gradient(to_left,black_58%,transparent_100%)]"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/25" aria-hidden />
      <OrbitalRings />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-6 pb-24 pt-40 md:pb-32">
        <div className="max-w-5xl">
          <TextHoverBrand />
          <p className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-600">Past-paper practice</p>
          <h1 className="mt-5 max-w-4xl text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] text-neutral-950 md:text-[72px]">
            Practice past papers with smarter feedback
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-[1.65] text-neutral-700 md:text-lg">
            StudyAI turns question papers and mark schemes into exam-style practice, then helps you understand what you
            missed before exams.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="border-white/25 bg-neutral-950 text-white hover:border-white/40 hover:bg-neutral-800 hover:ring-neutral-950"
            >
              <Link href="/auth/signup">Start Practising</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-neutral-950/30 bg-transparent text-neutral-950 hover:bg-neutral-950/5 hover:border-neutral-950 hover:ring-neutral-950"
            >
              <Link href="/how-it-works">See How It Works</Link>
            </Button>
          </div>
        </div>
      </div>
      <div id="hero-card-sentinel" className="pointer-events-none absolute bottom-0 h-0 w-full" aria-hidden />
    </section>
  );
}
