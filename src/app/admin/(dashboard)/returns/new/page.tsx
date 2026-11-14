import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";
import { ReturnForm, type RecentSale } from "@/components/admin/return-form";

export const dynamic = "force-dynamic";

export default async function NewReturnPage({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");

  const supabase = createClient();
  const { data } = await supabase
    .from("orders")
    .select("order_number, estimated_total, created_at, channel")
    .eq("payment_status", "paid")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(8);

  const recent: RecentSale[] = (data ?? []).map((o) => ({
    orderNumber: o.order_number,
    total: Number(o.estimated_total),
    createdAt: o.created_at,
    channel: o.channel,
  }));

  return (
    <div className="max-w-2xl">
      <Link href="/admin/returns" className="text-sm text-taupe hover:text-rose">
        Back to Returns
      </Link>
      <p className="eyebrow mt-4">Refunds</p>
      <h1 className="font-serif text-2xl text-brown">New return</h1>
      <p className="mt-1 text-sm text-taupe">
        Find the original sale by its receipt number, choose what is coming back, and record the
        refund. It is saved under your name.
      </p>

      <div className="mt-6">
        <ReturnForm staffName={staff.name} recent={recent} initialOrder={searchParams.order ?? ""} />
      </div>
    </div>
  );
}
