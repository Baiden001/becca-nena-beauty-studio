import type { Metadata, Viewport } from "next";
import { SITE, isLive, siteUrl } from "@/lib/site";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";

// Editorial display face — warm, high-contrast, a deliberate step away from
// the Playfair-Display-on-every-beauty-site default.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-editorial",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

// Body / UI face — quiet and legible so it never competes with fraunces.
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
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
