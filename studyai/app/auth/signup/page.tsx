"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { Input } from "@/components/ui/input";
import { BRAND_NAME } from "@/lib/brand";
import { supabase } from "@/lib/supabase";

function mapSignupError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit")) {
    return "Too many signup attempts right now. Please wait a few minutes and try again.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "This email is already registered. Try logging in instead.";
  }
  return message;
}

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (signUpError) {
      setError(mapSignupError(signUpError.message));
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setSuccessMessage("Signup successful. Please check your email to confirm your account.");
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-alt px-4 py-10">
      <SpotlightCard className="w-full max-w-[400px] p-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">Create account</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Join {BRAND_NAME}. Practise with feedback as a student, or run classes and assignments as a teacher.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-success">
            {successMessage}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-text" htmlFor="username">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
            />
          </div>

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-text underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </SpotlightCard>
    </main>
  );
}
