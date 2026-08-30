"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";

export default function AcceptInvitePage() {
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // The invite link's token is in the URL hash. Supabase's browser
    // client parses that automatically on load and establishes a session
    // — we just need to confirm it landed before showing the form.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError("Could not set your password. Please try again.");
      return;
    }

    // Hard navigation — consistent with the login page, and avoids any
    // stale client-router cache for /admin.
    window.location.href = "/admin";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>
        <p className="eyebrow mt-4 text-center">Becca Nena</p>
        <h1 className="mt-1 text-center font-serif text-2xl text-brown">Set your password</h1>

        {checking && (
          <p className="mt-8 text-center text-sm text-taupe">Checking your invite link…</p>
        )}

        {!checking && !validSession && (
          <div className="mt-8 text-center">
            <p className="text-sm text-red-600">
              This invite link is invalid or has expired.
            </p>
            <p className="mt-2 text-sm text-taupe">
              Ask an admin to send you a new invite from Team &amp; Access.
            </p>
          </div>
        )}

        {!checking && validSession && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="password" className="field-label">New password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="field-label">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                required
                placeholder="Re-enter your password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field-input mt-1.5"
              />
            </div>

            {error && <p className="field-error">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-rose px-6 py-2.5 text-sm font-medium text-cream shadow-sm transition-colors hover:bg-brown disabled:opacity-60"
            >
              {submitting ? "Setting password…" : "Set password & continue"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
