import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, HeartPulse, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Staff sign in | CarePulse" },
      { name: "description", content: "Secure sign-in for CarePulse community clinic staff." },
      { property: "og:title", content: "Staff sign in | CarePulse" },
      { property: "og:description", content: "Secure sign-in for CarePulse community clinic staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) {
      setError("We couldn't send the reset email right now. Please try again shortly.");
      return;
    }
    setResetSent(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);
    if (signInError) {
      setError("We couldn't sign you in with those details. Check them and try again.");
      return;
    }

    await navigate({ to: "/dashboard" });
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col">
        <header className="flex items-center gap-3" aria-label="CarePulse">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="size-5" aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">CarePulse</span>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <section className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Community care, connected</p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Good to see you.
              <span className="mt-2 block text-primary">Let’s care together.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
              Sign in to your clinic workspace and pick up where your team left off.
            </p>
            <div className="mt-10 inline-flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
              <ShieldCheck className="size-5 text-care-teal" aria-hidden="true" />
              Sign-in is available to existing clinic staff accounts.
            </div>
          </section>

          <section className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Staff sign in</h2>
              <p className="mt-2 text-sm text-muted-foreground">Use the email and password for your clinic account.</p>
            </div>

            {resetMode ? (
              <div className="mt-8 space-y-5">
                {resetSent ? (
                  <p role="status" className="rounded-lg border border-border bg-muted p-4 text-sm">
                    If an account exists for that email, a reset link is on its way. Check your inbox.
                  </p>
                ) : (
                  <form className="space-y-5" onSubmit={handleReset}>
                    <p className="text-sm text-muted-foreground">Enter your account email and we'll send you a secure reset link.</p>
                    <div className="space-y-2">
                      <label htmlFor="reset-email" className="text-sm font-medium">Email address</label>
                      <Input id="reset-email" type="email" autoComplete="username" required value={email}
                        onChange={(event) => setEmail(event.target.value)} placeholder="you@yourclinic.com" />
                    </div>
                    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="h-11 w-full" disabled={submitting}>
                      {submitting ? "Sending…" : "Send reset link"}
                    </Button>
                  </form>
                )}
                <button type="button" className="w-full text-center text-sm font-medium text-primary hover:underline"
                  onClick={() => { setResetMode(false); setResetSent(false); setError(""); }}>
                  Back to sign in
                </button>
              </div>
            ) : (
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email address</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@yourclinic.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <button type="button" className="text-sm font-medium text-primary hover:underline"
                    onClick={() => { setResetMode(true); setError(""); }}>
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="h-11 w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
                {!submitting && <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
            </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Need access? Contact your clinic administrator.
            </p>
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-border pt-5 text-xs text-muted-foreground">
          <span>CarePulse · Community clinic workspace</span>
        </footer>
      </div>
    </main>
  );
}