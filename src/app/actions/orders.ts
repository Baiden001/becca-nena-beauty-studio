"use server";

import { createClient } from "@/lib/supabase/server";

export interface PlaceOrderLine {
  productId: string;
  productName: string;
  quantity: number;
  regularPrice: number;
  currentPrice: number;
}

export interface PlaceOrderInput {
  name: string;
  phone: string;
  whatsapp: string;
  email?: string;
  deliveryLocation: string;
  notes?: string;
  lines: PlaceOrderLine[];
}

export interface PlaceOrderResult {
  ok: boolean;
  orderNumber?: string;
  error?: string;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!input.lines.length) {
    return { ok: false, error: "Your cart is empty." };
  }
  if (!input.name || !input.phone || !input.whatsapp || !input.deliveryLocation) {
    return { ok: false, error: "Please fill in all required fields." };
  }

  const supabase = createClient();

  // Reuse an existing customer record if we recognise the phone or email,
  // per the PRD's "identify repeat customers" requirement.
  let customerId: string | null = null;
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .or(
      [
        input.phone ? `phone.eq.${input.phone}` : null,
        input.email ? `email.eq.${input.email}` : null,
      ]
        .filter(Boolean)
        .join(",")
    )
    .limit(1)
    .maybeSingle();

  if (existing) {
    customerId = existing.id;
  } else {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: input.name,
        phone: input.phone,
        whatsapp: input.whatsapp,
        email: input.email || null,
        location: input.deliveryLocation,
      })
      .select("id")
      .single();

    if (customerError || !customer) {
      return { ok: false, error: "Could not save your details. Please try again." };
    }
    customerId = customer.id;
  }

  const subtotal = input.lines.reduce((s, l) => s + l.regularPrice * l.quantity, 0);
  const total = input.lines.reduce((s, l) => s + l.currentPrice * l.quantity, 0);
  const discountTotal = subtotal - total;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      delivery_location: input.deliveryLocation,
      notes: input.notes || null,
      subtotal,
      discount_total: discountTotal,
      estimated_total: total,
      status: "new",
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    return { ok: false, error: "Could not create your order. Please try again." };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    input.lines.map((l) => ({
      order_id: order.id,
      product_id: l.productId,
      product_name: l.productName,
      quantity: l.quantity,
      regular_price: l.regularPrice,
      discount_amount: (l.regularPrice - l.currentPrice) * l.quantity,
      final_price: l.currentPrice,
      subtotal: l.currentPrice * l.quantity,
    }))
  );

  if (itemsError) {
    return { ok: false, error: "Your order was started but items failed to save. Please contact us on WhatsApp." };
  }

  await notifyBoss(order.order_number, input, total).catch(() => {
    // Notification failure should never block the customer's confirmation.
  });

  return { ok: true, orderNumber: order.order_number };
}

async function notifyBoss(
  orderNumber: string,
  input: PlaceOrderInput,
  total: number
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!apiKey || !to) return; // Not configured yet — safe no-op.

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "orders@beccanena.com",
      to,
      subject: `New Becca Nena Order #${orderNumber}`,
      text: [
        `Customer: ${input.name}`,
        `Phone: ${input.phone}`,
        `WhatsApp: ${input.whatsapp}`,
        `Delivery location: ${input.deliveryLocation}`,
        "",
        "Items:",
        ...input.lines.map((l) => `  ${l.quantity} x ${l.productName} — GH₵${l.currentPrice * l.quantity}`),
        "",
        `Estimated total: GH₵${total}`,
      ].join("\n"),
    }),
  });
}
