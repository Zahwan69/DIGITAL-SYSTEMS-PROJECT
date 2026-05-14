import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ThemedLandingImage } from "./ThemedLandingImage";

type LandingCTAProps = {
  className?: string;
};

export function LandingCTA({ className }: LandingCTAProps) {
  return (
    <section className={cn("mx-auto max-w-7xl px-6 py-28 text-center", className)}>
      <ThemedLandingImage
        src="/images/landing/signup-cta.png"
        darkSrc="/images/landing/signup-cta.png"
        width={1792}
        height={1024}
        className="mx-auto aspect-[2/1] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface-alt"
      />
      <p className="mt-12 text-sm font-medium uppercase tracking-wide text-text-muted">
        Ready to practise
      </p>
      <h2 className="mx-auto mt-4 max-w-4xl text-[40px] font-semibold leading-[1.06] tracking-[-0.025em] text-text md:text-[72px]">
        Start your first QP/MS practice session.
      </h2>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-[1.65] text-text-muted md:text-lg">
        Create an account, upload a question paper with its mark scheme, and use feedback to make the next attempt
        sharper.
      </p>
      <div className="mt-8 flex justify-center">
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-neutral-950/30 bg-transparent text-neutral-950 hover:bg-neutral-950/5 hover:border-neutral-950 hover:ring-neutral-950 dark:border-white/30 dark:text-white dark:hover:bg-white/5 dark:hover:border-white dark:hover:ring-white"
        >
          <Link href="/auth/signup">Get started free</Link>
        </Button>
      </div>
    </section>
  );
}
