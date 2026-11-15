"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/supabase/require-staff";

export interface NewOrderInfo {
  id: string;
  orderNumber: string;
  total: number;
  paidAt: string;
}

/**
 * Online orders paid after `sinceIso`. Called every few seconds by the alert
 * bar while an admin page is open. With no `since`, it only returns the
 * server's clock so the page has a starting point (nothing is "new" yet).
 */
export async function checkNewOnlineOrders(sinceIso: string): Promise<{
  ok: boolean;
  now: string;
  orders: NewOrderInfo[];
}> {
  const now = new Date().toISOString();

  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, now, orders: [] };

  const since = sinceIso ? new Date(sinceIso) : null;
  if (!since || Number.isNaN(since.getTime())) return { ok: true, now, orders: [] };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, estimated_total, paid_at")
    .eq("channel", "online")
    .eq("payment_status", "paid")
    .gt("paid_at", since.toISOString())
    .order("paid_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[order-alerts] query failed:", error);
    return { ok: false, now, orders: [] };
  }

  return {
    ok: true,
    now,
    orders: (data ?? [])
      .filter((o) => o.paid_at)
      .map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        total: Number(o.estimated_total),
        paidAt: o.paid_at as string,
      })),
  };
}
