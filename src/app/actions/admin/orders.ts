"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import type { OrderStatus } from "@/types/database";

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };

  const supabase = createAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, order_number, status")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) return { ok: false, error: "Order not found." };

  const wasConfirmed = order.status !== "confirmed" && status === "confirmed";

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (updateError) return { ok: false, error: "Could not update order status." };

  // Inventory only moves when an order is first confirmed — matches the
  // PRD: "When an order is confirmed, the relevant inventory should be
  // updated." Guarded so re-saving an already-confirmed order never
  // double-decrements stock.
  if (wasConfirmed) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    for (const item of items || []) {
      if (!item.product_id) continue;
      await supabase.from("inventory_transactions").insert({
        product_id: item.product_id,
        quantity_change: -item.quantity,
        reason: `Order #${order.order_number}`,
        order_id: orderId,
        created_by: staff.id,
      });
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  return { ok: true };
}
