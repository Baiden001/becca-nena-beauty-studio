"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import type { PaymentMethod } from "@/types/database";

const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "mobile_money",
  "card",
  "pos_terminal",
  "bank_transfer",
];

export interface ReturnableItem {
  orderItemId: string;
  name: string;
  soldQuantity: number;
  returnedQuantity: number;
  unitPrice: number;
}

export interface ReturnableSale {
  orderId: string;
  orderNumber: string;
  channel: "online" | "walk_in";
  paymentMethod: PaymentMethod | null;
  createdAt: string;
  customerName: string | null;
  total: number;
  items: ReturnableItem[];
}

/** Finds a sale by its receipt number ("BN-1052", "#1052" or just "1052"). */
export async function findSaleForReturn(
  input: string
): Promise<{ ok: boolean; sale?: ReturnableSale; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };

  let number = input.trim().toUpperCase().replace(/^#/, "");
  if (!number) return { ok: false, error: "Enter the receipt number." };
  if (/^\d+$/.test(number)) number = `BN-${number}`;

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, channel, payment_method, estimated_total, created_at, customers(name)"
    )
    .eq("order_number", number)
    .maybeSingle();

  if (!order) return { ok: false, error: `No sale found with number ${number}.` };
  if (order.payment_status !== "paid" || order.status === "cancelled") {
    return { ok: false, error: "Only paid sales can be returned." };
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_name, quantity, final_price")
    .eq("order_id", order.id);

  const { data: earlier } = await supabase
    .from("returns")
    .select("id")
    .eq("order_id", order.id);

  const returnedByItem = new Map<string, number>();
  if (earlier?.length) {
    const { data: returned } = await supabase
      .from("return_items")
      .select("order_item_id, quantity")
      .in("return_id", earlier.map((r) => r.id));
    for (const r of returned ?? []) {
      returnedByItem.set(r.order_item_id, (returnedByItem.get(r.order_item_id) ?? 0) + r.quantity);
    }
  }

  const customer = order.customers as unknown as { name: string } | null;

  // A sale with a discount given at the till cost the customer less than the
  // item prices; refunds are that share of the price, as the database works out.
  const itemsSum = (items ?? []).reduce((s, i) => s + Number(i.final_price) * i.quantity, 0);
  const paid = Number(order.estimated_total);
  const ratio = itemsSum > paid + 0.004 && itemsSum > 0 ? paid / itemsSum : 1;

  return {
    ok: true,
    sale: {
      orderId: order.id,
      orderNumber: order.order_number,
      channel: order.channel,
      paymentMethod: order.payment_method,
      createdAt: order.created_at,
      customerName: customer?.name ?? null,
      total: Number(order.estimated_total),
      items: (items ?? []).map((i) => ({
        orderItemId: i.id,
        name: i.product_name,
        soldQuantity: i.quantity,
        returnedQuantity: returnedByItem.get(i.id) ?? 0,
        unitPrice: Math.round(Number(i.final_price) * ratio * 100) / 100,
      })),
    },
  };
}

export interface RecordReturnInput {
  orderId: string;
  lines: { orderItemId: string; quantity: number; restock: boolean }[];
  refundMethod: PaymentMethod;
  reason: string;
  notes?: string;
}

export interface RecordReturnResult {
  ok: boolean;
  returnNumber?: string;
  refundTotal?: number;
  restockedUnits?: number;
  error?: string;
}

/**
 * Records a return and a refund. The refund amount is worked out in the
 * database from the price the customer actually paid, never from the browser.
 */
export async function recordReturn(input: RecordReturnInput): Promise<RecordReturnResult> {
  try {
    const staff = await getCurrentStaff();
    if (!staff) return { ok: false, error: "Not signed in." };

    if (!PAYMENT_METHODS.includes(input.refundMethod)) {
      return { ok: false, error: "Choose how the refund was paid." };
    }
    if (!input.reason?.trim()) {
      return { ok: false, error: "Choose a reason for the return." };
    }

    const lines = (input.lines ?? []).filter((l) => l.quantity > 0);
    if (lines.length === 0) {
      return { ok: false, error: "Choose at least one item to return." };
    }
    for (const l of lines) {
      if (!l.orderItemId || !Number.isInteger(l.quantity) || l.quantity > 500) {
        return { ok: false, error: "One of the quantities is invalid." };
      }
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("fn_record_return", {
      p_order_id: input.orderId,
      p_processed_by: staff.id,
      p_refund_method: input.refundMethod,
      p_reason: input.reason.trim(),
      p_notes: input.notes?.trim() || null,
      p_lines: lines.map((l) => ({
        order_item_id: l.orderItemId,
        quantity: l.quantity,
        restock: l.restock,
      })),
    });

    if (error || !data?.length) {
      console.error("[return] failed:", error);
      const message = error?.message ?? "";
      const friendly = [
        "can still be returned",
        "Only paid sales",
        "could not be found",
        "does not belong",
        "Choose",
      ];
      if (friendly.some((f) => message.includes(f))) return { ok: false, error: message };
      return { ok: false, error: "Could not record the return. Nothing was saved. Please try again." };
    }

    revalidatePath("/admin/returns");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/products");
    revalidatePath("/shop");

    return {
      ok: true,
      returnNumber: data[0].out_return_number,
      refundTotal: Number(data[0].out_refund_total),
      restockedUnits: lines.filter((l) => l.restock).reduce((s, l) => s + l.quantity, 0),
    };
  } catch (error) {
    console.error("[return] unexpected error:", error);
    return { ok: false, error: "Something went wrong. Nothing was saved. Please try again." };
  }
}
