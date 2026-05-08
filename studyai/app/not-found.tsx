import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-medium uppercase tracking-wide text-text-muted">404</p>
        <h1 className="mt-4 text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] text-text">
          Page not found.
        </h1>
        <p className="mt-4 text-base leading-[1.65] text-text-muted">
          The page is not available in this local demo path.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
