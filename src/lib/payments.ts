import { createAdminClient } from "@/lib/supabase/admin";
import type { PaystackTransaction } from "@/lib/paystack";

/**
 * Marks an order as paid after Paystack confirms a successful charge.
 * Safe to call more than once (webhook + confirmation page both call it):
 * only the first call flips the order and sends the staff notification.
 *
 * References look like "BN-1047-a1b2c3d4", so the order is found from the
 * reference itself. That keeps a late payment from an earlier attempt valid
 * even if the customer has since retried with a new reference.
 */
export async function markOrderPaid(
  tx: Pick<PaystackTransaction, "reference" | "amount" | "currency" | "channel">
): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createAdminClient();

  const match = /^(BN-\d+)-[A-Za-z0-9]+$/.exec(tx.reference);
  if (!match) return { ok: false, reason: "bad_reference" };

  const { data: order } = await supabase
    .from("orders")
    .select("id, estimated_total, payment_status")
    .eq("order_number", match[1])
    .maybeSingle();

  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.payment_status === "paid") return { ok: true };

  // Never trust the amount that was *sent*; confirm what was actually paid.
  const expectedPesewas = Math.round(Number(order.estimated_total) * 100);
  if (tx.currency !== "GHS" || tx.amount < expectedPesewas) {
    console.error("[payments] amount mismatch", {
      reference: tx.reference,
      expectedPesewas,
      paid: tx.amount,
      currency: tx.currency,
    });
    return { ok: false, reason: "amount_mismatch" };
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      payment_reference: tx.reference,
      payment_channel: tx.channel,
      paid_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .neq("payment_status", "paid")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[payments] failed to mark order paid:", error);
    return { ok: false, reason: "update_failed" };
  }

  // `updated` is null if another request got there first — don't double-notify.
  if (updated) {
    await notifyStaffOfPaidOrder(order.id).catch((e) =>
      console.error("[payments] staff notification failed:", e)
    );
  }

  return { ok: true };
}

async function notifyStaffOfPaidOrder(orderId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!apiKey || !to) {
    throw new Error("RESEND_API_KEY or ORDER_NOTIFICATION_EMAIL is missing");
  }

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "order_number, estimated_total, delivery_location, notes, payment_channel, customers(name, phone, whatsapp, email)"
    )
    .eq("id", orderId)
    .single();

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name, quantity, subtotal")
    .eq("order_id", orderId);

  if (!order) throw new Error("Order not found for notification");

  const customer = order.customers as unknown as {
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
  } | null;

  const from =
    process.env.RESEND_FROM_EMAIL || "Becca Nena <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `PAID: Becca Nena Order #${order.order_number}`,
      text: [
        `Payment received (${order.payment_channel === "mobile_money" ? "Mobile Money" : "Card"})`,
        "",
        `Customer: ${customer?.name ?? ""}`,
        `Phone: ${customer?.phone ?? ""}`,
        `WhatsApp: ${customer?.whatsapp ?? ""}`,
        `Email: ${customer?.email ?? ""}`,
        `Delivery location: ${order.delivery_location}`,
        order.notes ? `Notes: ${order.notes}` : "",
        "",
        "Items:",
        ...(items ?? []).map(
          (i) => `${i.quantity} x ${i.product_name} — GH₵${i.subtotal}`
        ),
        "",
        `Total paid: GH₵${order.estimated_total}`,
      ]
        .filter((line, idx, arr) => line !== "" || arr[idx - 1] !== "")
        .join("\n"),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend responded ${response.status}: ${body}`);
  }
}
