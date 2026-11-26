import type { Metadata, Viewport } from "next";
import { SITE, isLive, siteUrl } from "@/lib/site";
import localFont from "next/font/local";
import "./globals.css";

// Fonts are stored in the project (src/app/fonts) rather than downloaded from
// Google Fonts during each build, so a hiccup at Google can't break a deploy.

// Editorial display face — warm, high-contrast, a deliberate step away from
// the Playfair-Display-on-every-beauty-site default.
const fraunces = localFont({
  variable: "--font-editorial",
  display: "swap",
  src: [
    { path: "./fonts/fraunces-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/fraunces-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/fraunces-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/fraunces-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/fraunces-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/fraunces-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
});

// Body / UI face — quiet and legible so it never competes with fraunces.
const workSans = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "./fonts/work-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/work-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/work-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE.name} | ${SITE.seoTitle}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_GH",
    title: `${SITE.name} | ${SITE.seoTitle}`,
    description: SITE.description,
    url: "/",
    images: [{ url: SITE.ogImagePath, width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} | ${SITE.seoTitle}`,
    description: SITE.description,
    images: [SITE.ogImagePath],
  },
  // Kept out of search engines while the site is on its test address.
  robots: isLive() ? { index: true, follow: true } : { index: false, follow: false },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#F8F4EF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GH" className={`${fraunces.variable} ${workSans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">{children}</body>
    </html>
  );
}
