import Link from "next/link";

import { HowItWorksPremium } from "@/components/landing/HowItWorksPremium";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { VideoSlot } from "@/components/landing/VideoSlot";
import { Button } from "@/components/ui/button";

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <LandingHeader />
      <div className="pt-20">
        <HowItWorksPremium />

        <section className="mx-auto max-w-3xl px-6 py-24">
          <div className="space-y-16">
            <VideoSlot
              title="Step-by-step guide slot"
              caption="A future guide video can show the full path: choose a paper, answer naturally, read feedback, and repeat with a clearer plan."
            />

            <section className="rounded-2xl border border-border bg-surface p-6 md:p-8">
              <p className="text-sm font-medium uppercase tracking-wide text-text-muted">What to expect</p>
              <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">
                Feedback is a study aid.
              </h2>
              <p className="mt-4 text-base leading-[1.65] text-text-muted">
                StudyAI can help you spot missed points and practise more deliberately, but it is not a real examiner,
                a tutor, or an official mark scheme. Use it to revise, compare, and improve, then check important work
                with a teacher when you can.
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6 md:p-8">
              <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">
                Start with one question.
              </h2>
              <p className="mt-4 text-base leading-[1.65] text-text-muted">
                Create an account, find a paper, and try one answer. That is enough to see how the feedback loop feels.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/auth/signup">Get started free</Link>
                </Button>
              </div>
            </section>
          </div>
        </section>
      </div>
      <LandingFooter />
    </main>
  );
}
