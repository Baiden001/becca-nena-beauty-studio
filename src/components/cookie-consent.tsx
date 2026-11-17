"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CONSENT_CHANGED,
  HAS_TRACKERS,
  OPEN_CONSENT,
  clearTrackerCookies,
  readConsent,
  saveConsent,
  type Consent,
} from "@/lib/consent";

/**
 * The cookie banner. It only appears when optional tools (analytics or
 * advertising) are configured and the visitor has not chosen yet. "Essential
 * only" is as easy to click as "Accept all".
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [customise, setCustomise] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!HAS_TRACKERS) return;

    const existing = readConsent();
    if (!existing) setOpen(true);
    else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }

    const reopen = () => {
      const current = readConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setCustomise(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT, reopen);
  }, []);

  if (!HAS_TRACKERS || !open) return null;

  function choose(choice: { analytics: boolean; marketing: boolean }) {
    const before: Consent | null = readConsent();
    saveConsent(choice);
    setOpen(false);
    setCustomise(false);

    // Withdrawing a choice that was already in use: clear the cookies and
    // reload so the tool stops running.
    const withdrew =
      (before?.analytics && !choice.analytics) || (before?.marketing && !choice.marketing);
    if (withdrew) {
      clearTrackerCookies();
      window.location.reload();
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-lg border border-rose/30 bg-white p-5 shadow-xl sm:inset-x-auto sm:left-4 sm:mx-0"
    >
      <p className="text-sm font-medium text-brown">Your cookie choices</p>
      <p className="mt-2 text-xs leading-relaxed text-taupe">
        We use essential storage to run the shop, such as remembering your cart. With your
        permission we would also use analytics to see how the site is used and marketing cookies
        to show relevant ads. See our{" "}
        <Link
          href="/policies/cookie-policy"
          className="text-brown underline decoration-rose/60 underline-offset-4 hover:text-rose"
        >
          Cookie policy
        </Link>
        .
      </p>

      {customise && (
        <div className="mt-4 space-y-3 text-sm text-brown">
          <label className="flex items-start gap-3 opacity-70">
            <input type="checkbox" checked disabled className="mt-1" />
            <span>
              Essential
              <span className="block text-xs text-taupe">Always on. Needed for the cart and checkout.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="mt-1"
            />
            <span>
              Analytics
              <span className="block text-xs text-taupe">Helps us see which pages are used so we can improve them.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-1"
            />
            <span>
              Marketing
              <span className="block text-xs text-taupe">Lets us measure our ads and show you relevant ones.</span>
            </span>
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {customise ? (
          <button
            type="button"
            onClick={() => choose({ analytics, marketing })}
            className="rounded-full bg-brown px-5 py-2 text-xs font-medium text-cream hover:bg-rose"
          >
            Save choices
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => choose({ analytics: true, marketing: true })}
              className="rounded-full bg-brown px-5 py-2 text-xs font-medium text-cream hover:bg-rose"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => choose({ analytics: false, marketing: false })}
              className="rounded-full bg-brown px-5 py-2 text-xs font-medium text-cream hover:bg-rose"
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => setCustomise(true)}
              className="rounded-full border border-brown/40 px-5 py-2 text-xs font-medium text-brown hover:border-rose hover:text-rose"
            >
              Choose
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** A footer item that re-opens the cookie choices. Shows nothing when no optional tools are configured. */
export function CookieSettingsItem() {
  if (!HAS_TRACKERS) return null;
  return (
    <li>
      <span aria-hidden="true">· </span>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT))}
        className="hover:text-rose"
      >
        Cookie settings
      </button>
    </li>
  );
}

// Kept so other components can listen for changes without importing the banner.
export { CONSENT_CHANGED };
