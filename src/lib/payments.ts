import { createAdminClient } from "@/lib/supabase/admin";
import { getBaseUrl } from "@/lib/base-url";
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

// Ghana numbers are usually saved as 024xxxxxxx. WhatsApp links need 233xxxxxxxxx.
function whatsappDigits(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return `233${digits.slice(1)}`;
  return digits;
}

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const cedis = (n: number) =>
  `GH\u20B5${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Emails everyone on ORDER_NOTIFICATION_EMAIL (one address, or several
 * separated by commas) the moment an online order is paid, with the customer's
 * contact details and a link straight to the order in the admin.
 */

/** Sends the store's walk-in sale email after the database transaction commits.
 * Email failure is handled by the caller and must never roll back a saved sale.
 */
export async function notifyStaffOfWalkInSale(orderId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = (process.env.ORDER_NOTIFICATION_EMAIL ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  if (!apiKey || recipients.length === 0) throw new Error("RESEND_API_KEY or ORDER_NOTIFICATION_EMAIL is missing");

  const supabase = createAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("order_number, estimated_total, payment_method, created_at, sold_by, customers(name, phone, whatsapp, email)")
    .eq("id", orderId)
    .single();
  if (orderError || !order) throw new Error("Walk-in order not found for notification");

  const [{ data: items }, { data: seller }, { data: payParts }] = await Promise.all([
    supabase.from("order_items").select("product_name, quantity, subtotal").eq("order_id", orderId),
    order.sold_by ? supabase.from("users").select("name, email").eq("id", order.sold_by).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("order_payments").select("method, amount").eq("order_id", orderId).order("created_at"),
  ]);
  const customer = order.customers as unknown as { name: string; phone: string | null; whatsapp: string | null; email: string | null } | null;
  const methodName = (m: string | null | undefined) =>
    ({ cash: "Cash", mobile_money: "Mobile Money", card: "Card", pos_terminal: "POS Terminal", bank_transfer: "Bank Transfer" } as Record<string, string>)[m ?? ""] ?? "Not specified";
  // A split payment lists every part, e.g. "Mobile Money GH₵100 + Cash GH₵140".
  const method =
    payParts && payParts.length > 1
      ? payParts.map((p) => `${methodName(p.method)} ${cedis(Number(p.amount))}`).join(" + ")
      : methodName(payParts?.[0]?.method ?? order.payment_method);
  const total = cedis(Number(order.estimated_total));
  const itemLines = (items ?? []).map((i) => `${i.quantity} x ${i.product_name} (${cedis(Number(i.subtotal))})`);
  const text = [
    `NEW WALK-IN SALE #${order.order_number}: ${total}`,
    `Date: ${new Date(order.created_at).toLocaleString("en-GH")}`,
    `Sold by: ${seller?.name ?? "Staff"}${seller?.email ? ` (${seller.email})` : ""}`,
    `Customer: ${customer?.name ?? "Walk-in customer"}`,
    `Phone: ${customer?.phone ?? ""}`,
    `WhatsApp: ${customer?.whatsapp ?? ""}`,
    `Payment: ${method}`,
    "", "Items:", ...itemLines, "", `Total: ${total}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#2b2320"><p style="font-size:12px;letter-spacing:.12em;color:#8a7a72">NEW WALK-IN SALE</p><h2>#${escapeHtml(order.order_number)} · ${escapeHtml(total)}</h2><p><b>Sold by:</b> ${escapeHtml(seller?.name ?? "Staff")}${seller?.email ? ` (${escapeHtml(seller.email)})` : ""}</p><p><b>Customer:</b> ${escapeHtml(customer?.name ?? "Walk-in customer")}</p><p><b>Phone:</b> ${escapeHtml(customer?.phone ?? "")}</p><p><b>Payment:</b> ${escapeHtml(method)}</p><p><b>Date:</b> ${escapeHtml(new Date(order.created_at).toLocaleString("en-GH"))}</p><h3>Items</h3><ul>${itemLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul><h3>Total: ${escapeHtml(total)}</h3></div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Becca Nena <onboarding@resend.dev>",
      to: recipients,
      subject: `New walk-in sale #${order.order_number}: ${total}`,
      text, html,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend responded ${response.status}: ${body}`);
  }
}

async function notifyStaffOfPaidOrder(orderId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = (process.env.ORDER_NOTIFICATION_EMAIL ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean);

  if (!apiKey || recipients.length === 0) {
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

  // Link to the order in the admin (needs the site address; skipped if unknown).
  let siteUrl = "";
  try {
    siteUrl = getBaseUrl();
  } catch {
    siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  }
  const adminLink = siteUrl ? `${siteUrl}/admin/orders/${orderId}` : "";

  const method = order.payment_channel === "mobile_money" ? "Mobile Money" : order.payment_channel === "card" ? "Card" : "Online";
  const wa = whatsappDigits(customer?.whatsapp ?? customer?.phone ?? null);
  const total = cedis(order.estimated_total);

  const itemLines = (items ?? []).map((i) => `${i.quantity} x ${i.product_name}  (${cedis(i.subtotal)})`);

  const text = [
    `NEW PAID ORDER #${order.order_number}: ${total} (${method})`,
    "",
    `Customer: ${customer?.name ?? ""}`,
    `Phone: ${customer?.phone ?? ""}`,
    `WhatsApp: ${customer?.whatsapp ?? ""}${wa ? `  https://wa.me/${wa}` : ""}`,
    customer?.email ? `Email: ${customer.email}` : "",
    `Delivery location: ${order.delivery_location}`,
    order.notes ? `Notes: ${order.notes}` : "",
    "",
    "Items:",
    ...itemLines,
    "",
    `Total paid: ${total}`,
    adminLink ? `\nOpen the order: ${adminLink}` : "",
  ]
    .filter((line, idx, arr) => line !== "" || arr[idx - 1] !== "")
    .join("\n");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#2b2320">
  <p style="font-size:12px;letter-spacing:.12em;color:#8a7a72;margin:0">NEW PAID ORDER</p>
  <h2 style="margin:4px 0 2px">#${escapeHtml(order.order_number)} &middot; ${escapeHtml(total)}</h2>
  <p style="margin:0 0 16px;color:#8a7a72">Paid by ${escapeHtml(method)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:3px 0;color:#8a7a72">Customer</td><td>${escapeHtml(customer?.name ?? "")}</td></tr>
    <tr><td style="padding:3px 0;color:#8a7a72">Phone</td><td>${customer?.phone ? `<a href="tel:${escapeHtml(customer.phone)}">${escapeHtml(customer.phone)}</a>` : ""}</td></tr>
    <tr><td style="padding:3px 0;color:#8a7a72">WhatsApp</td><td>${wa ? `<a href="https://wa.me/${wa}">${escapeHtml(customer?.whatsapp ?? customer?.phone ?? "")}</a>` : escapeHtml(customer?.whatsapp ?? "")}</td></tr>
    <tr><td style="padding:3px 0;color:#8a7a72">Deliver to</td><td>${escapeHtml(order.delivery_location)}</td></tr>
    ${order.notes ? `<tr><td style="padding:3px 0;color:#8a7a72">Notes</td><td>${escapeHtml(order.notes)}</td></tr>` : ""}
  </table>
  <p style="margin:18px 0 6px;font-weight:bold">Items</p>
  <ul style="padding-left:18px;margin:0;font-size:14px">${itemLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
  ${adminLink ? `<p style="margin:22px 0 0"><a href="${escapeHtml(adminLink)}" style="background:#b08d86;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px">Open the order</a></p>` : ""}
</div>`;

  const from = process.env.RESEND_FROM_EMAIL || "Becca Nena <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: `New paid order #${order.order_number}: ${total} (${method})`,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend responded ${response.status}: ${body}`);
  }
}
