"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  variant?: "default" | "icon";
  className?: string;
  onSignedOut?: () => void;
};

export function SignOutButton({ variant = "default", className, onSignedOut }: SignOutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    onSignedOut?.();
    router.push("/");
    router.refresh();
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        suppressHydrationWarning
        aria-label="Sign out"
        disabled={loading}
        onClick={() => void signOut()}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-alt hover:text-text disabled:opacity-50",
          className
        )}
      >
        <LogOut className="h-5 w-5" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      suppressHydrationWarning
      disabled={loading}
      onClick={() => void signOut()}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-alt disabled:opacity-50",
        className
      )}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
