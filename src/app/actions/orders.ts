"use server";

import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBaseUrl } from "@/lib/base-url";
import { currentPrice } from "@/lib/pricing";
import { initializeTransaction } from "@/lib/paystack";

// The browser only says WHICH products and HOW MANY. Prices always come from
// the database, so nobody can pay less by editing the request.
export interface PlaceOrderLine {
  productId: string;
  quantity: number;
}

export interface PlaceOrderInput {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  deliveryLocation: string;
  notes?: string;
  lines: PlaceOrderLine[];
}

export interface PlaceOrderResult {
  ok: boolean;
  orderNumber?: string;
  /** Paystack's hosted checkout page — send the customer here to pay. */
  paymentUrl?: string;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function placeOrder(
  input: PlaceOrderInput
): Promise<PlaceOrderResult> {
  try {
    if (!input.lines?.length) {
      return { ok: false, error: "Your cart is empty." };
    }

    const name = input.name?.trim();
    const phone = input.phone?.trim();
    const whatsapp = input.whatsapp?.trim();
    const email = input.email?.trim().toLowerCase();
    const deliveryLocation = input.deliveryLocation?.trim();

    if (!name || !phone || !whatsapp || !deliveryLocation) {
      return { ok: false, error: "Please fill in all required fields." };
    }
    if (!email || !EMAIL_RE.test(email)) {
      return {
        ok: false,
        error: "Please enter a valid email address — Paystack sends your receipt there.",
      };
    }

    // Merge duplicate lines and validate quantities.
    const wanted = new Map<string, number>();
    for (const line of input.lines) {
      const qty = Number(line.quantity);
      if (!line.productId || !Number.isInteger(qty) || qty < 1 || qty > 50) {
        return { ok: false, error: "One of the quantities in your cart is invalid." };
      }
      wanted.set(line.productId, (wanted.get(line.productId) ?? 0) + qty);
    }

    const supabase = createAdminClient();

    // Re-price everything from the database.
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", [...wanted.keys()]);

    if (productsError || !products) {
      console.error("[products-lookup] failed:", productsError);
      return { ok: false, error: "Could not check your items. Please try again." };
    }

    const pricedLines: {
      productId: string;
      productName: string;
      quantity: number;
      regularPrice: number;
      finalPrice: number;
    }[] = [];

    for (const [productId, quantity] of wanted) {
      const product = products.find((p) => p.id === productId);
      if (
        !product ||
        product.status !== "published" ||
        product.stock_status === "out_of_stock"
      ) {
        return {
          ok: false,
          error: `${product?.name ?? "An item in your cart"} is no longer available. Please remove it and try again.`,
        };
      }
      pricedLines.push({
        productId,
        productName: product.name,
        quantity,
        regularPrice: product.regular_price,
        finalPrice: currentPrice(product),
      });
    }

    // Find or create the customer (two exact-match lookups — never build a
    // filter string out of what the customer typed).
    let customerId: string | null = null;

    for (const [column, value] of [
      ["phone", phone],
      ["email", email],
    ] as const) {
      const { data, error } = await supabase
        .from("customers")
        .select("id")
        .eq(column, value)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[customer-lookup] failed:", error);
        return { ok: false, error: "Could not check your customer details. Please try again." };
      }
      if (data) {
        customerId = data.id;
        break;
      }
    }

    if (!customerId) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({ name, phone, whatsapp, email, location: deliveryLocation })
        .select("id")
        .single();

      if (customerError || !customer) {
        console.error("[customer-insert] failed:", customerError);
        return { ok: false, error: "Could not save your details. Please try again." };
      }
      customerId = customer.id;
    }

    const subtotal = pricedLines.reduce((s, l) => s + l.regularPrice * l.quantity, 0);
    const total = pricedLines.reduce((s, l) => s + l.finalPrice * l.quantity, 0);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        delivery_location: deliveryLocation,
        notes: input.notes?.trim() || null,
        subtotal,
        discount_total: subtotal - total,
        estimated_total: total,
        status: "new",
        payment_status: "pending",
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("[order-insert] failed:", orderError);
      return { ok: false, error: "Could not create your order. Please try again." };
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      pricedLines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        product_name: l.productName,
        quantity: l.quantity,
        regular_price: l.regularPrice,
        discount_amount: (l.regularPrice - l.finalPrice) * l.quantity,
        final_price: l.finalPrice,
        subtotal: l.finalPrice * l.quantity,
      }))
    );

    if (itemsError) {
      console.error("[order-items-insert] failed:", itemsError);
      // Don't leave an empty order behind for staff to puzzle over.
      await supabase.from("orders").delete().eq("id", order.id);
      return { ok: false, error: "We could not save your order. Please try again." };
    }

    const paymentUrl = await startPayment({
      orderId: order.id,
      orderNumber: order.order_number,
      email,
      total,
    });

    return { ok: true, orderNumber: order.order_number, paymentUrl };
  } catch (error) {
    console.error("[place-order] unexpected error:", error);
    return {
      ok: false,
      error:
        "We could not start your payment. Please try again, or order via WhatsApp.",
    };
  }
}

/**
 * Used by the "Try payment again" button when a payment didn't go through.
 * Amount and email come from the saved order, never from the browser.
 */
export async function retryPayment(orderNumber: string): Promise<PlaceOrderResult> {
  try {
    const supabase = createAdminClient();

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, estimated_total, payment_status, customers(email)")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (!order) return { ok: false, error: "We couldn't find that order." };
    if (order.payment_status === "paid") {
      return { ok: true, orderNumber: order.order_number };
    }

    const email = (order.customers as unknown as { email: string | null } | null)?.email;
    if (!email) {
      return {
        ok: false,
        error: "We don't have an email for this order. Please contact us on WhatsApp.",
      };
    }

    const paymentUrl = await startPayment({
      orderId: order.id,
      orderNumber: order.order_number,
      email,
      total: Number(order.estimated_total),
    });

    return { ok: true, orderNumber: order.order_number, paymentUrl };
  } catch (error) {
    console.error("[retry-payment] unexpected error:", error);
    return { ok: false, error: "We could not restart your payment. Please try again." };
  }
}

async function startPayment(args: {
  orderId: string;
  orderNumber: string;
  email: string;
  total: number;
}): Promise<string> {
  // A fresh reference per attempt (Paystack rejects reused ones). The order
  // number is embedded so the webhook can always find the order again.
  const reference = `${args.orderNumber}-${randomBytes(4).toString("hex")}`;

  const supabase = createAdminClient();
  await supabase
    .from("orders")
    .update({ payment_reference: reference })
    .eq("id", args.orderId);

  const result = await initializeTransaction({
    email: args.email,
    amountPesewas: Math.round(args.total * 100),
    reference,
    callbackUrl: `${getBaseUrl()}/order-confirmation/${args.orderNumber}`,
    metadata: { order_number: args.orderNumber },
  });

  return result.authorization_url;
}
