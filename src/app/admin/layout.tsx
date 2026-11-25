import type { Metadata, Viewport } from "next";
import { PosAppSetup } from "@/components/admin/pos-app-setup";

// Makes the whole admin installable as an app ("Install" / "Add to Home
// Screen"), opening straight on the till. Lives at this level so the login
// screen is installable too, not only pages behind sign-in.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: "/pos.webmanifest",
  appleWebApp: { capable: true, title: "BN POS", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#302827",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PosAppSetup />
      {children}
    </>
  );
}
