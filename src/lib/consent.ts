// Cookie consent. The shop only uses the small storage it needs to work (such
// as the cart) unless analytics or advertising tools are switched on, and
// those never load until the visitor agrees.
//
// To switch tools on, set these in Vercel and redeploy:
//   NEXT_PUBLIC_GA_ID          e.g. G-XXXXXXXXXX      (Google Analytics 4)
//   NEXT_PUBLIC_META_PIXEL_ID  e.g. 1234567890123456  (Meta / Facebook Pixel)
// With neither set, no banner is shown because there is nothing to agree to.

export interface Consent {
  analytics: boolean;
  marketing: boolean;
  at: number;
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
/** True once at least one optional tool is configured. */
export const HAS_TRACKERS = Boolean(GA_ID || META_PIXEL_ID);

const KEY = "bn-consent-v1";
export const CONSENT_CHANGED = "bn-consent-changed";
export const OPEN_CONSENT = "bn-open-consent";

export function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }) {
  const consent: Consent = { ...choice, at: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(consent));
  } catch {
    // storage blocked: the choice only lasts for this visit
  }
  window.dispatchEvent(new Event(CONSENT_CHANGED));
  return consent;
}

/** Re-opens the cookie choices (used by the footer link). */
export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT));
}

/** Best-effort removal of tracker cookies when someone withdraws consent. */
export function clearTrackerCookies() {
  const host = window.location.hostname;
  const parts = host.split(".");
  const domains = [host, `.${host}`, parts.length > 2 ? `.${parts.slice(-2).join(".")}` : ""];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (name.startsWith("_ga") || name === "_fbp" || name === "_fbc") {
      for (const domain of domains) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}`;
      }
    }
  }
}
