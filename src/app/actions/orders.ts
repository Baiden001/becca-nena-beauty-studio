"use server";

import { createAdminClient } from "@/lib/supabase/admin";

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

export async function placeOrder(
  input: PlaceOrderInput
): Promise<PlaceOrderResult> {
  try {
    if (!input.lines.length) {
      return { ok: false, error: "Your cart is empty." };
    }

    if (
      !input.name ||
      !input.phone ||
      !input.whatsapp ||
      !input.deliveryLocation
    ) {
      return { ok: false, error: "Please fill in all required fields." };
    }

    const supabase = createAdminClient();

    let customerId: string | null = null;

    const filters = [
      input.phone ? `phone.eq.${input.phone}` : null,
      input.email ? `email.eq.${input.email}` : null,
    ].filter((value): value is string => Boolean(value));

    let existing: { id: string } | null = null;

    if (filters.length > 0) {
      const { data, error: customerLookupError } = await supabase
        .from("customers")
        .select("id")
        .or(filters.join(","))
        .limit(1)
        .maybeSingle();

      if (customerLookupError) {
        console.error(
          "[customer-lookup] failed:",
          customerLookupError
        );

        return {
          ok: false,
          error: "Could not check your customer details. Please try again.",
        };
      }

      existing = data;
    }

    if (existing) {
      customerId = existing.id;
    } else {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: input.name,
          phone: input.phone,
          whatsapp: input.whatsapp,
          email: input.email ?? null,
          location: input.deliveryLocation,
        })
        .select("id")
        .single();

      if (customerError || !customer) {
        console.error(
          "[customer-insert] failed:",
          customerError
        );

        return {
          ok: false,
          error: "Could not save your details. Please try again.",
        };
      }

      customerId = customer.id;
    }

    const subtotal = input.lines.reduce(
      (sum, line) => sum + line.regularPrice * line.quantity,
      0
    );

    const total = input.lines.reduce(
      (sum, line) => sum + line.currentPrice * line.quantity,
      0
    );

    const discountTotal = subtotal - total;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        delivery_location: input.deliveryLocation,
        notes: input.notes ?? null,
        subtotal,
        discount_total: discountTotal,
        estimated_total: total,
        status: "new",
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("[order-insert] failed:", orderError);

      return {
        ok: false,
        error: "Could not create your order. Please try again.",
      };
    }

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(
        input.lines.map((line) => ({
          order_id: order.id,
          product_id: line.productId,
          product_name: line.productName,
          quantity: line.quantity,
          regular_price: line.regularPrice,
          discount_amount:
            (line.regularPrice - line.currentPrice) * line.quantity,
          final_price: line.currentPrice,
          subtotal: line.currentPrice * line.quantity,
        }))
      );

    if (itemsError) {
      console.error("[order-items-insert] failed:", itemsError);

      return {
        ok: false,
        error:
          "Your order was started but items failed to save. Please contact us on WhatsApp.",
      };
    }

    await notifyBoss(order.order_number, input, total).catch((error) => {
      console.error(
        "[order-notification] failed to send:",
        error
      );
    });

    return {
      ok: true,
      orderNumber: order.order_number,
    };
  } catch (error) {
    console.error("[place-order] unexpected error:", error);

    return {
      ok: false,
      error: "We could not complete your order. Please try again.",
    };
  }
}

async function notifyBoss(
  orderNumber: string,
  input: PlaceOrderInput,
  total: number
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFICATION_EMAIL;

  if (!apiKey || !to) {
    throw new Error(
      "RESEND_API_KEY or ORDER_NOTIFICATION_EMAIL is missing"
    );
  }

  const from =
    process.env.RESEND_FROM_EMAIL ||
    "Becca Nena <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `New Becca Nena Order #${orderNumber}`,
      text: [
        `Customer: ${input.name}`,
        `Phone: ${input.phone}`,
        `WhatsApp: ${input.whatsapp}`,
        `Delivery location: ${input.deliveryLocation}`,
        "",
        "Items:",
        ...input.lines.map(
          (line) =>
            `${line.quantity} x ${line.productName} — GH₵${
              line.currentPrice * line.quantity
            }`
        ),
        "",
        `Estimated total: GH₵${total}`,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new Error(
      `Resend responded ${response.status}: ${body}`
    );
  }
}