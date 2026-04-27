import Link from "next/link";
import { BarChart3, GraduationCap, MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-16 text-center">
      <div className="max-w-2xl space-y-8">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-10 w-10 text-accent" aria-hidden />
            <span className="font-serif text-4xl font-semibold tracking-tight text-text sm:text-5xl">
              {BRAND_NAME}
            </span>
          </div>
          <p className="text-sm font-medium uppercase tracking-wide text-text-muted">
            Teaching &amp; study assistant
          </p>
        </div>

        <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-text sm:text-4xl">
          Feedback for students. Insight for teachers. One shared workspace.
        </h1>

        <p className="text-base leading-relaxed text-text-muted sm:text-lg">
          {BRAND_NAME} helps learners practise past papers with structured AI marking while giving educators
          classes, assignments, and performance context — so both roles stay aligned without running two
          separate products.
        </p>

        <div className="grid gap-4 pt-2 sm:grid-cols-3">
          {[
            {
              Icon: MessagesSquare,
              title: "For students",
              body: "Work through papers, submit answers, and get scored feedback and model answers.",
            },
            {
              Icon: BarChart3,
              title: "For teachers",
              body: "Create classes, set assignments, invite learners, and see how attempts are trending.",
            },
            {
              Icon: GraduationCap,
              title: "Shared classroom",
              body: "Past papers, join codes, and progress live in the same shell — role-aware, not split apps.",
            },
          ].map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-surface p-5 text-left shadow-none"
            >
              <Icon className="h-6 w-6 text-accent" aria-hidden />
              <h2 className="mt-3 font-serif text-base font-semibold text-text">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/auth/signup">Get started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-8">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
