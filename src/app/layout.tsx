import type { Metadata } from "next";
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
  title: "Becca Nena Beauty Studio",
  description: "Premium cosmetics, curated for you. Shop the edit @the.bnb.studio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${workSans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">{children}</body>
    </html>
  );
}
