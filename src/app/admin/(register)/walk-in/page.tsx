import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import { loadRegister } from "@/app/actions/admin/walk-in";
import { PosRegister } from "@/components/admin/pos/pos-register";

export const dynamic = "force-dynamic";

export default async function WalkInSalePage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");

  const register = await loadRegister();

  return (
    <PosRegister
      staffName={staff.name}
      role={staff.role}
      products={register.products}
      categories={register.categories}
      loadError={register.ok ? undefined : register.error}
    />
  );
}
