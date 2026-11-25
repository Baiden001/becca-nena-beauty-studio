import Link from "next/link";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const methodLabel = (m: string) => m.replace(/_/g, " ");

export default async function ReturnsPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");

  const supabase = createClient();
  const { data: raw } = await supabase
    .from("returns")
    .select(
      "id, return_number, refund_total, refund_method, reason, created_at, order_id, orders(order_number), users(name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const returns = raw as unknown as
    | {
        id: string;
        return_number: string;
        refund_total: number;
        refund_method: string;
        reason: string;
        created_at: string;
        order_id: string;
        orders: { order_number: string } | null;
        users: { name: string } | null;
      }[]
    | null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Refunds</p>
          <h1 className="font-serif text-2xl text-brown">Returns</h1>
        </div>
        <Link
          href="/admin/returns/new"
          className="rounded-full bg-rose px-4 py-2 text-sm font-medium text-cream hover:bg-brown"
        >
          New return
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border border-rose/20 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-rose/10 text-xs uppercase text-taupe">
            <tr>
              <th className="px-4 py-3">Return</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Sale</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Refunded</th>
              <th className="px-4 py-3">By</th>
            </tr>
          </thead>
          <tbody>
            {(returns ?? []).map((r) => (
              <tr key={r.id} className="border-b border-rose/10 last:border-0">
                <td className="px-4 py-3 font-medium text-brown">{r.return_number}</td>
                <td className="px-4 py-3 text-taupe">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${r.order_id}`}
                    className="text-brown underline decoration-rose/50 underline-offset-4 hover:text-rose"
                  >
                    #{r.orders?.order_number ?? "sale"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-brown">{r.reason}</td>
                <td className="px-4 py-3 text-brown">
                  {formatCedis(Number(r.refund_total))}
                  <span className="block text-xs capitalize text-taupe">
                    {methodLabel(r.refund_method)}
                  </span>
                </td>
                <td className="px-4 py-3 text-taupe">{r.users?.name ?? "Unknown"}</td>
              </tr>
            ))}
            {(returns ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-taupe">
                  No returns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
