"use client";

import { useState } from "react";
import { signInStaff } from "@/app/actions/admin/auth";
import { Logo } from "@/components/logo";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const result = await signInStaff(
      String(form.get("email") || ""),
      String(form.get("password") || "")
    );

    // On success, do a hard browser navigation rather than router.push —
    // Next's client-side router can serve a stale, cached (pre-login)
    // version of /admin, which was causing a loop back to this page even
    // though sign-in succeeded. A full page load has no such cache.
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error || "Something went wrong.");
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>
        <p className="eyebrow mt-4 text-center">Becca Nena</p>
        <h1 className="mt-1 text-center font-serif text-2xl text-brown">Staff sign in</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="field-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@beccanena.com"
              autoComplete="email"
              className="field-input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="password" className="field-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Enter your password"
              autoComplete="current-password"
              className="field-input mt-1.5"
            />
          </div>

          {error && <p className="field-error">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-rose px-6 py-2.5 text-sm font-medium text-cream shadow-sm transition-colors hover:bg-brown disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-taupe">
          Accounts are created by an existing admin<code>users</code> table.
        </p>
      </div>
    </main>
  );
}
