import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import { NewOrderAlerts } from "@/components/admin/new-order-alerts";

export const metadata: Metadata = {
  title: "Point of sale",
  robots: { index: false, follow: false },
};

// The till: full screen, no admin sidebar. Its own top bar has the menu
// back to the rest of the admin.
export default async function RegisterLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");

  return (
    <>
      {children}
      <NewOrderAlerts />
    </>
  );
}
