// Facts about the shop that search engines and sharing previews need.
// Change them here and every page, the sitemap and the structured data follow.

export const SITE = {
  name: "Becca Nena Beauty Studio",
  shortName: "Becca Nena",
  tagline: "Premium skincare and body care, curated for you",
  description:
    "Premium skincare and body care, curated for you. Pay securely with Mobile Money or card. Becca Nena Beauty Studio, East Legon, Accra.",
  phone: "+233 24 701 8569",
  instagram: "https://instagram.com/the.bnb.studio",
  /** Street address for local search. Leave a field empty to leave it out. */
  address: {
    streetAddress: "Boundary Rd",
    addressLocality: "East Legon, Accra",
    addressRegion: "Greater Accra",
    addressCountry: "GH",
  },
  logoPath: "/images/logo.png",
  ogImagePath: "/images/og-default.jpg",
} as const;

/** The public address of the site, with no trailing slash. */
export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/**
 * Whether search engines should be allowed to list the site. While the site
 * lives on a *.vercel.app test address it is kept out of Google so the test
 * copy never competes with the real domain. It switches on by itself once
 * NEXT_PUBLIC_SITE_URL is the real domain. Set NEXT_PUBLIC_ALLOW_INDEXING to
 * "true" or "false" to force it either way.
 */
export function isLive(): boolean {
  const forced = process.env.NEXT_PUBLIC_ALLOW_INDEXING;
  if (forced === "true") return true;
  if (forced === "false") return false;
  const url = siteUrl();
  return !url.includes("vercel.app") && !url.includes("localhost");
}

export const absoluteUrl = (path: string) =>
  `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
