"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-medium uppercase tracking-wide text-text-muted">Something went wrong</p>
        <h1 className="mt-4 text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] text-text">
          StudyAI hit an error.
        </h1>
        <p className="mt-4 text-base leading-[1.65] text-text-muted">
          Retry the view. If it happens again during the demo, return to the dashboard and continue from there.
        </p>
        <div className="mt-8 flex justify-center">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
