import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import { AdminNav } from "@/components/admin/admin-nav";
import { NewOrderAlerts } from "@/components/admin/new-order-alerts";
import { CustomerScreenHost } from "@/components/admin/customer-screen-host";

// Makes the admin installable as an app ("Add to Home Screen" / "Install"),
// opening straight on the walk-in sale screen.
export const metadata: Metadata = {
  manifest: "/pos.webmanifest",
  appleWebApp: { capable: true, title: "BN POS", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();

  if (!staff) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-cream">
      <AdminNav staffName={staff.name} role={staff.role} />
      <div className="flex-1 overflow-x-hidden px-8 py-8">{children}</div>
      <NewOrderAlerts />
      <CustomerScreenHost />
    </div>
  );
}
