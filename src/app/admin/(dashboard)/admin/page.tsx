import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import { WalkInSale } from "@/components/admin/walk-in-sale";

export const dynamic = "force-dynamic";

export default async function WalkInSalePage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");

  return (
    <div className="max-w-3xl">
      <p className="eyebrow">In store</p>
      <h1 className="font-serif text-2xl text-brown">Walk-in sale</h1>
      <p className="mt-1 text-sm text-taupe">
        Scan or search each product, choose how the customer paid, and record the sale. Stock
        goes down straight away and the sale is saved under your name.
      </p>

      <div className="mt-6">
        <WalkInSale staffName={staff.name} />
      </div>
    </div>
  );
}
