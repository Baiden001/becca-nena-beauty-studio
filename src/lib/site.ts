// Facts about the shop that search engines and sharing previews need.
// Change them here and every page, the sitemap and the structured data follow.

export const SITE = {
  name: "Becca Nena Beauty Studio",
  shortName: "Becca Nena",
  tagline: "Premium skincare and body care, curated for you",
  /** What the home page is called in Google results: say what and where. */
  seoTitle: "Skincare & Body Care Shop in East Legon, Accra",
  description:
    "Shop original skincare, body care and fragrance in Ghana: Tree Hut, eos, Saltair, Bath & Body Works and more. Visit our studio in East Legon, Accra, or order online and pay with Mobile Money or card.",
  phone: "+233 24 701 8569",
  instagram: "https://instagram.com/the.bnb.studio",
  /** Street address for local search. Leave a field empty to leave it out. */
  address: {
    streetAddress: "Boundary Rd",
    addressLocality: "East Legon, Accra",
    addressRegion: "Greater Accra",
    addressCountry: "GH",
  },
  /**
   * Opening hours for Google, e.g. ["Mo-Fr 09:00-19:00", "Sa 10:00-18:00"].
   * Leave empty until the real hours are confirmed: wrong hours are worse
   * than none.
   */
  openingHours: [] as string[],
  /** Google Maps link to the studio (from "Share" on Google Maps). Optional. */
  mapUrl: "",
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
