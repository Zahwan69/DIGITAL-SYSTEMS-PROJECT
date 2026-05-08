import Link from "next/link";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 md:p-8">
      <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-[1.65] text-text-muted">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <LandingHeader />
      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="space-y-20">
          <header className="pt-16 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-text-muted">About</p>
            <h1 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-text md:text-[48px]">
              Why StudyAI exists.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-[1.65] text-text-muted">
              A final-year project about making past-paper practice easier to understand and easier to repeat.
            </p>
          </header>

          <Section title="Why this exists">
            <p>
              Cambridge past papers are free, and that matters. A student can download years of questions without paying
              for a textbook or a private platform. The harder part is knowing what to do after answering. A mark scheme
              helps, but it often assumes the student already understands the method.
            </p>
            <p>
              The structured feedback that turns practice into improvement is usually locked behind expensive tutors.
              StudyAI tries to put that second voice in everyone&apos;s pocket. It gives students a way to practise,
              compare, correct, and try again without waiting for someone else to mark every answer.
            </p>
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Our mission">
              <p>
                The mission is examiner-quality feedback on past-paper practice, free, for every Cambridge student. That
                means clear marks, plain feedback, and model answers that help students understand the next step instead
                of only seeing whether they were right or wrong.
              </p>
            </Section>

            <Section title="Our vision">
              <p>
                The vision is to close the gap between students who have tutors and students who do not. Good feedback
                should not depend only on family income, school resources, or whether a teacher has time to mark one more
                practice answer after class.
              </p>
            </Section>
          </div>

          <Section title="Who built it">
            <p>
              UWE Bristol BSc final-year project.
              <br />
              UFCFXK-30-3, Digital Systems Project, 2025-2026. This is a degree artefact built in public, not a venture
              product.
            </p>
          </Section>

          <section className="rounded-2xl border border-border bg-surface-alt p-6 md:p-8">
            <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">Where it is going</h2>
            <ul className="list-disc space-y-3 pl-5">
              <li>Spaced repetition, so students return to weak topics at the right time.</li>
              <li>Parent dashboards, so progress can be seen without reading every answer.</li>
              <li>Timed exam-style mode, so practice can feel closer to the real paper.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">Try the demo path.</h2>
            <p className="mt-4 text-base leading-[1.65] text-text-muted">
              Start with an account, or read the walkthrough first if you want to see the flow before signing up.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/auth/signup">Get started free</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/how-it-works">How it works</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
      <LandingFooter />
    </main>
  );
}
