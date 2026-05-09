"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type CarouselSlide = {
  title: string;
  button: string;
  src: string;
};

export default function Carousel({ slides }: { slides: CarouselSlide[] }) {
  const [active, setActive] = useState(0);
  const activeSlide = slides[active];

  function go(direction: -1 | 1) {
    setActive((current) => (current + direction + slides.length) % slides.length);
  }

  if (!activeSlide) return null;

  return (
    <div className="relative mx-auto min-h-[520px] w-full max-w-6xl overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div key={activeSlide.src} className="absolute inset-0">
        <Image
          src={activeSlide.src}
          alt=""
          aria-hidden="true"
          fill
          sizes="(min-width: 1024px) 1152px, 100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 bg-white/15" />
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-white/95 via-white/65 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white/95 to-transparent" />

      <div className="relative flex min-h-[520px] flex-col justify-between p-6 md:p-8">
        <div className="max-w-md">
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-600">
            Step {active + 1} of {slides.length}
          </p>
          <h3 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-neutral-950 md:text-[48px]">
            {activeSlide.title}
          </h3>
          <p className="mt-5 max-w-sm text-base leading-[1.65] text-neutral-700">
            {activeSlide.button}
          </p>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-neutral-200 bg-white/90 text-neutral-950 shadow-sm transition-colors hover:border-neutral-300 hover:bg-white"
            aria-label="Previous slide"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-neutral-200 bg-white/90 text-neutral-950 shadow-sm transition-colors hover:border-neutral-300 hover:bg-white"
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
                  index === active ? "w-7 bg-neutral-950" : "w-1.5 bg-neutral-400"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
