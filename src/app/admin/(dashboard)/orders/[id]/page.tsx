import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCedis } from "@/lib/pricing";
import { waLink } from "@/lib/whatsapp";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import type { OrderStatus } from "@/types/database";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, customers(name, phone, whatsapp, email, location)")
    .eq("id", params.id)
    .maybeSingle();

  if (!order) notFound();

  const isWalkIn = order.channel === "walk_in";
  let soldBy: string | null = null;
  if (order.sold_by) {
    const { data: seller } = await supabase
      .from("users")
      .select("name")
      .eq("id", order.sold_by)
      .maybeSingle();
    soldBy = seller?.name ?? null;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", params.id);

  const { data: returnsRaw } = await supabase
    .from("returns")
    .select("id, return_number, refund_total, refund_method, reason, created_at, users(name)")
    .eq("order_id", params.id)
    .order("created_at", { ascending: false });
  const returns = returnsRaw as unknown as
    | {
        id: string;
        return_number: string;
        refund_total: number;
        refund_method: string;
        reason: string;
        created_at: string;
        users: { name: string } | null;
      }[]
    | null;
  const returnIds = (returns ?? []).map((r) => r.id);
  const { data: returnItems } = returnIds.length
    ? await supabase
        .from("return_items")
        .select("return_id, product_name, quantity, restocked")
        .in("return_id", returnIds)
    : { data: [] as { return_id: string; product_name: string; quantity: number; restocked: boolean }[] };
  const canReturn = order.payment_status === "paid" && order.status !== "cancelled";

  const customer = order.customers as {
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    location: string | null;
  } | null;

  const whatsappMessage = `Hello ${customer?.name ?? ""}, this is Becca Nena Beauty Studio regarding your order #${order.order_number}. We are contacting you to confirm your order, payment and delivery details.`;

  return (
    <div className="max-w-3xl">
      <div>
  <Link
    href="/admin/orders"
    className="inline-flex items-center text-sm text-taupe transition-colors hover:text-rose"
  >
    Back to Orders
  </Link>

  <div className="mt-4 flex items-center justify-between">
    <div>
      <p className="eyebrow">Order</p>
      <h1 className="font-serif text-2xl text-brown">
        #{order.order_number}
      </h1>
    </div>

    <div className="text-right">
      <p className="text-sm text-taupe">
        {new Date(order.created_at).toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-brown">
        {order.payment_status === "paid"
          ? `Paid${order.payment_channel === "mobile_money" ? " · Mobile Money" : order.payment_channel === "card" ? " · Card" : ""}${order.paid_at ? ` · ${new Date(order.paid_at).toLocaleString()}` : ""}`
          : "Awaiting payment"}
      </p>
      {canReturn && (
        <Link
          href={`/admin/returns/new?order=${order.order_number}`}
          className="mt-2 inline-block text-xs text-brown underline decoration-rose/60 underline-offset-4 hover:text-rose"
        >
          Process a return
        </Link>
      )}
      {isWalkIn && (
        <p className="mt-1 text-xs text-taupe">
          In-store sale{order.payment_method ? ` · ${order.payment_method.replace(/_/g, " ")}` : ""}
          {soldBy ? ` · sold by ${soldBy}` : ""}
        </p>
      )}
    </div>
  </div>
</div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-md border border-rose/20 bg-white p-5">
          <p className="text-sm font-medium text-brown">Customer</p>
          <p className="mt-2 text-sm text-brown">{customer?.name}</p>
          <p className="text-sm text-taupe">{customer?.phone}</p>
          {customer?.email && <p className="text-sm text-taupe">{customer.email}</p>}
          <p className="mt-2 text-sm text-brown">{order.delivery_location}</p>
          {order.notes && <p className="mt-2 text-sm text-taupe">Notes: {order.notes}</p>}

          <div className="mt-4 flex gap-3">
            {(!isWalkIn || customer?.phone) && (
            <a
              href={waLink(whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-rose px-4 py-2 text-xs font-medium text-cream hover:bg-brown"
            >
              WhatsApp customer
            </a>
            )}
            {customer?.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="rounded-full border border-brown px-4 py-2 text-xs font-medium text-brown hover:border-rose hover:text-rose"
              >
                Call customer
              </a>
            )}
          </div>
        </div>

        {!isWalkIn && (
          <div className="rounded-md border border-rose/20 bg-white p-5">
            <OrderStatusControl orderId={order.id} currentStatus={order.status as OrderStatus} />
          </div>
        )}
      </div>

      <div className="mt-6 rounded-md border border-rose/20 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-rose/10 text-xs uppercase text-taupe">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose/10">
            {items?.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-brown">{item.product_name}</td>
                <td className="px-4 py-3 text-brown">{item.quantity}</td>
                <td className="px-4 py-3 text-brown">{formatCedis(item.final_price)}</td>
                <td className="px-4 py-3 text-brown">{formatCedis(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs space-y-1 p-5 text-sm">
          <div className="flex justify-between text-taupe">
            <span>Subtotal</span>
            <span>{formatCedis(order.subtotal)}</span>
          </div>
          {order.discount_total > 0 && (
            <div className="flex justify-between text-rose">
              <span>Discount</span>
              <span>−{formatCedis(order.discount_total)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-rose/20 pt-2 text-base font-medium text-brown">
            <span>Estimated total</span>
            <span>{formatCedis(order.estimated_total)}</span>
          </div>
        </div>
      </div>

      {(returns ?? []).length > 0 && (
        <div className="mt-6 rounded-md border border-rose/20 bg-white p-5">
          <p className="text-sm font-medium text-brown">Returns on this sale</p>
          <ul className="mt-3 divide-y divide-rose/10">
            {(returns ?? []).map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-brown">
                    {r.return_number} · refunded {formatCedis(Number(r.refund_total))}
                    <span className="ml-1 text-xs font-normal capitalize text-taupe">
                      ({r.refund_method.replace(/_/g, " ")})
                    </span>
                  </span>
                  <span className="text-xs text-taupe">
                    {new Date(r.created_at).toLocaleString()} · {r.users?.name ?? "Unknown"}
                  </span>
                </div>
                <p className="text-xs text-taupe">{r.reason}</p>
                <ul className="mt-1 text-xs text-brown">
                  {(returnItems ?? [])
                    .filter((i) => i.return_id === r.id)
                    .map((i, n) => (
                      <li key={n}>
                        {i.quantity} x {i.product_name}
                        {i.restocked ? "" : " (not put back in stock)"}
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
