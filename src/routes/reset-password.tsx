import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HeartPulse } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password | CarePulse" },
      { name: "description", content: "Set a new password for your CarePulse staff account." },
      { property: "og:title", content: "Reset password | CarePulse" },
      { property: "og:description", content: "Set a new password for your CarePulse staff account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    if (window.location.hash.includes("type=recovery")) setReady(true);
    supabase.auth.getSession().then(({ data: s }) => { if (s.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) return setError("We couldn't update your password. Request a new reset link and try again.");
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="size-5" aria-hidden="true" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight">Set a new password</h1>
        </div>
        {ready ? (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium">New password</label>
              <Input id="new-password" type="password" autoComplete="new-password" required value={password}
                onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
              <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm}
                onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={saving}>
              {saving ? "Saving…" : "Save new password"}
            </Button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            Open this page from the reset link in your email. Links expire, so request a new one if needed.
          </p>
        )}
        <Link to="/" className="mt-6 block text-center text-sm font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
