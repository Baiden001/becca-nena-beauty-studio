import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCedis } from "@/lib/pricing";
import type { OrderStatus } from "@/types/database";

const STATUSES: OrderStatus[] = [
  "new",
  "contacted",
  "confirmed",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  let query = supabase
    .from("orders")
    .select("id, order_number, status, payment_status, channel, payment_method, estimated_total, delivery_location, created_at, customers(name, phone)")
    .order("created_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status as OrderStatus);
  }

  const { data: ordersRaw } = await query;
  const orders = ordersRaw as unknown as
    | {
        id: string;
        order_number: string;
        status: string;
        payment_status: "pending" | "paid" | "failed";
        channel: "online" | "walk_in";
        payment_method: string | null;
        estimated_total: number;
        created_at: string;
        customers: { name: string; phone: string | null } | null;
      }[]
    | null;

  return (
    <div>
      <h1 className="font-serif text-2xl text-brown">Orders</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill href="/admin/orders" active={!searchParams.status}>All</StatusPill>
        {STATUSES.map((s) => (
          <StatusPill key={s} href={`/admin/orders?status=${s}`} active={searchParams.status === s}>
            {s.replace(/_/g, " ")}
          </StatusPill>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border border-rose/20 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-rose/10 text-xs uppercase text-taupe">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose/10">
            {orders?.length ? (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-rose-light/10">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="text-brown hover:text-rose">
                      #{o.order_number}
                    </Link>
                    {o.channel === "walk_in" && (
                      <div className="text-xs text-taupe">In store</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brown">
                    {o.customers?.name}
                    <div className="text-xs text-taupe">{o.customers?.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-brown">{formatCedis(o.estimated_total)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs ${
                        o.payment_status === "paid"
                          ? "bg-sage/40 text-brown"
                          : "bg-rose-light/50 text-taupe"
                      }`}
                    >
                      {o.payment_status === "paid"
                        ? o.channel === "walk_in" && o.payment_method
                          ? `Paid · ${o.payment_method.replace(/_/g, " ")}`
                          : "Paid"
                        : "Awaiting payment"}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-brown">{o.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-taupe">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-taupe">
                  No orders match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
        active ? "border-rose bg-rose text-cream" : "border-taupe/30 text-brown hover:border-rose"
      }`}
    >
      {children}
    </Link>
  );
}
