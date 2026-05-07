import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-surface-alt px-4 py-10">
          <p className="text-sm text-text-muted">Loading...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
