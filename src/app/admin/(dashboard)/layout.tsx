import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import { AdminNav } from "@/components/admin/admin-nav";
import { NewOrderAlerts } from "@/components/admin/new-order-alerts";

// The app manifest and install support live in the parent admin layout.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();

  if (!staff) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-cream">
      <AdminNav staffName={staff.name} role={staff.role} />
      <div className="flex-1 overflow-x-hidden px-8 py-8">{children}</div>
      <NewOrderAlerts />
    </div>
  );
}
