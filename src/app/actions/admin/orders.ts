"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import type { OrderStatus } from "@/types/database";

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log("1. Starting update", { orderId, status });

    const staff = await getCurrentStaff();
    console.log("2. Staff check complete", staff?.id);

    if (!staff) {
      return { ok: false, error: "Not signed in." };
    }

    const supabase = createAdminClient();
    console.log("3. Admin client created");

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number, status, channel")
      .eq("id", orderId)
      .single();

    console.log("4. Order fetch complete", { order, fetchError });

    if (fetchError || !order) {
      return { ok: false, error: "Order not found." };
    }

    // In-store sales are finished and already deducted from stock when they
    // are recorded; changing their status could deduct stock a second time.
    if (order.channel === "walk_in") {
      return { ok: false, error: "In-store sales can't be changed here." };
    }

    const wasConfirmed =
      order.status !== "confirmed" && status === "confirmed";

    console.log("5. Updating order", {
      oldStatus: order.status,
      newStatus: status,
      wasConfirmed,
    });

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    console.log("6. Order update complete", updateError);

    if (updateError) {
      return {
        ok: false,
        error: "Could not update order status.",
      };
    }

    if (wasConfirmed) {
      console.log("7. Fetching order items");

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      console.log("8. Items fetch complete", {
        items,
        itemsError,
      });

      for (const item of items || []) {
        if (!item.product_id) continue;

        console.log("9. Creating inventory transaction", item);

        const { error: inventoryError } = await supabase
          .from("inventory_transactions")
          .insert({
            product_id: item.product_id,
            quantity_change: -item.quantity,
            reason: `Order #${order.order_number}`,
            order_id: orderId,
            created_by: staff.id,
          });

        console.log("10. Inventory transaction complete", inventoryError);
      }
    }

    console.log("11. Revalidating");

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin");

    console.log("12. Finished successfully");

    return { ok: true };
  } catch (error) {
  console.error("ORDER STATUS UPDATE ERROR:", error);

  return {
    ok: false,
    error:
      error instanceof Error
        ? error.message
        : JSON.stringify(error),
  };
}
}
