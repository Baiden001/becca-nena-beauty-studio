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

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", params.id);

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
            <a
              href={waLink(whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-rose px-4 py-2 text-xs font-medium text-cream hover:bg-brown"
            >
              WhatsApp customer
            </a>
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

        <div className="rounded-md border border-rose/20 bg-white p-5">
          <OrderStatusControl orderId={order.id} currentStatus={order.status as OrderStatus} />
        </div>
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
    </div>
  );
}
