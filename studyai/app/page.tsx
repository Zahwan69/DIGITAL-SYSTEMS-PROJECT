import Image from "next/image";
import Link from "next/link";
import { BarChart3, FileUp, SearchCheck } from "lucide-react";

import { FloatingNavbar } from "@/components/aceternity/floating-navbar";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

const features = [
  {
    title: "Upload any past paper",
    body: "Drop in Cambridge-style PDFs and keep every attempt organised in one calm workspace.",
    image: "/images/landing/feature-upload.png",
    Icon: FileUp,
  },
  {
    title: "AI grades like an examiner",
    body: "Get structured feedback, marks, and next-step guidance without leaving the paper flow.",
    image: "/images/landing/feature-grading.png",
    Icon: SearchCheck,
  },
  {
    title: "Track topics + streaks",
    body: "See weak topics, recent effort, XP, and class progress build up over time.",
    image: "/images/landing/feature-progress.png",
    Icon: BarChart3,
  },
];

const steps = [
  "Choose a paper or upload your own.",
  "Answer questions with text and diagrams.",
  "Review marks, hints, and model answers.",
  "Teachers see class-level trends and support needs.",
];

function DecorativeImage({
  src,
  width,
  height,
  className,
  priority,
}: {
  src: string;
  width: number;
  height: number;
  className: string;
  priority?: boolean;
}) {
  return (
    <div className={className}>
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
        priority={priority}
        className="h-full w-full object-cover opacity-70"
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-bg text-text">
      <FloatingNavbar />

      <section className="mx-auto flex min-h-[100svh] max-w-7xl flex-col items-center justify-center px-6 pb-24 pt-36 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-text-muted">AI past-paper practice</p>
        <h1 className="mt-8 max-w-4xl text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] text-text md:text-[72px]">
          Study smarter.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-[1.65] text-text-muted md:text-lg">
          Past-paper practice, examiner-style feedback, and teacher insight in one monochrome workspace.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/auth/signup">Get started free</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </div>
        <DecorativeImage
          src="/images/landing/hero.png"
          width={1200}
          height={800}
          priority
          className="mt-20 aspect-[3/2] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface-alt"
        />
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-28">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map(({ title, body, image, Icon }) => (
            <article key={title} className="rounded-xl border border-border bg-surface p-4">
              <DecorativeImage
                src={image}
                width={480}
                height={360}
                className="aspect-[4/3] overflow-hidden rounded-xl bg-surface-alt"
              />
              <Icon className="mt-6 h-6 w-6 text-text" strokeWidth={1.5} aria-hidden />
              <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">{title}</h2>
              <p className="mt-3 text-base leading-[1.65] text-text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-28">
        <p className="text-sm font-medium uppercase tracking-wide text-text-muted">How it works</p>
        <div className="mt-12 space-y-12">
          {steps.map((step, index) => (
            <div key={step} className="grid items-center gap-8 md:grid-cols-2">
              <div className={index % 2 === 1 ? "md:order-2" : undefined}>
                <p className="text-sm font-medium uppercase tracking-wide text-text-muted">Step {index + 1}</p>
                <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-text md:text-[48px]">
                  {step}
                </h2>
              </div>
              <div className="aspect-[16/10] rounded-2xl border border-border bg-surface-alt" />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-28 text-center">
        <DecorativeImage
          src="/images/landing/closing.png"
          width={1200}
          height={600}
          className="mx-auto aspect-[2/1] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface-alt"
        />
        <h2 className="mt-14 text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] text-text md:text-[72px]">
          Start your first paper.
        </h2>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg">
            <Link href="/auth/signup">Get started free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-bg">
        <div className="mx-auto grid min-h-[240px] max-w-7xl gap-10 px-6 py-12 md:grid-cols-3">
          {[
            ["Product", "Features", "How it works", "Get started"],
            ["Resources", "Dashboard", "Upload", "Search"],
            ["Legal", "Privacy", "Terms", "Local demo"],
          ].map(([heading, ...links]) => (
            <div key={heading}>
              <p className="text-sm font-medium uppercase tracking-wide text-text-muted">{heading}</p>
              <ul className="mt-5 space-y-3 text-sm text-text-muted">
                {links.map((link) => (
                  <li key={link}>
                    <span className="transition-colors hover:text-text">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="overflow-x-hidden px-6">
          <p className="h-[0.72em] overflow-hidden text-[clamp(96px,18vw,240px)] font-semibold leading-[0.85] tracking-[-0.04em] text-text">
            {BRAND_NAME}
          </p>
          <p className="py-4 text-center text-xs text-text-muted">© {new Date().getFullYear()} {BRAND_NAME}</p>
        </div>
      </footer>
    </main>
  );
}
