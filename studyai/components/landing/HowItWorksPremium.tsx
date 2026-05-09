import Link from "next/link";

import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "Upload QP and MS",
    description: "Start with a question paper PDF and add the matching mark scheme in the same upload flow.",
  },
  {
    number: "02",
    title: "Write your answer",
    description: "Answer naturally, just like you would in an exam or revision session.",
  },
  {
    number: "03",
    title: "Get instant feedback",
    description: "StudyAI reviews your answer, highlights strengths, and explains what can be improved.",
  },
  {
    number: "04",
    title: "Improve and repeat",
    description: "Use the feedback to practise again, build confidence, and track your progress over time.",
  },
];

function StaticRings() {
  return (
    <div className="pointer-events-none absolute -left-48 top-28 h-[620px] w-[620px] md:-left-72 md:h-[860px] md:w-[860px]" aria-hidden>
      <div className="absolute inset-0 rounded-full border border-text/15 dark:border-white/15" />
      <div className="absolute inset-[10%] rounded-full border border-text/10 dark:border-white/10" />
      <div className="absolute inset-[22%] rounded-full border border-text/15 dark:border-white/15" />
      <div className="absolute left-[58%] top-[19%] h-2 w-2 rounded-full bg-text/30 dark:bg-white/30" />
      <div className="absolute left-[68%] top-[46%] h-px w-32 rotate-[-18deg] bg-text/15 dark:bg-white/15" />
      <div className="absolute left-[42%] top-[62%] h-16 w-16 rounded-full border border-text/10 dark:border-white/10" />
    </div>
  );
}

function StepCard({
  step,
}: {
  step: (typeof steps)[number];
}) {
  return (
    <article
      className="group rounded-2xl border border-border bg-surface/80 p-6 backdrop-blur transition-colors hover:border-border-strong hover:bg-surface md:p-7"
    >
      <p className="text-sm font-medium uppercase tracking-wide text-text-muted">{step.number}</p>
      <h3 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text md:text-[34px]">
        {step.title}
      </h3>
      <p className="mt-4 text-base leading-[1.65] text-text-muted">{step.description}</p>
    </article>
  );
}

export function HowItWorksPremium() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-bg py-28 md:py-36">
      <StaticRings />
      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:h-fit">
          <p className="text-sm font-medium uppercase tracking-wide text-text-muted">How StudyAI works</p>
          <h1 className="mt-5 max-w-xl text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] text-text md:text-[72px]">
            From practice to progress in four simple steps
          </h1>
          <p className="mt-6 max-w-md text-base leading-[1.65] text-text-muted md:text-lg">
            StudyAI helps you work through past-paper questions, receive clear feedback, and improve step by step.
          </p>
          <div className="mt-8">
            <Button asChild>
              <Link href="/auth/signup">Start Practising</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          {steps.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
