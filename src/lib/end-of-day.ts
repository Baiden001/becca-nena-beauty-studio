import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentMethod } from "@/types/database";

// End-of-day ("Z report") figures for one calendar day. Ghana is on UTC all
// year (no daylight saving), so a day is simply 00:00 to 24:00 UTC.

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  card: "Card",
  pos_terminal: "POS terminal",
  bank_transfer: "Bank transfer",
};

export type MethodKey = PaymentMethod | "online";

export interface MethodTotals {
  key: MethodKey;
  label: string;
  sales: number;
  salesCount: number;
  refunds: number;
  refundCount: number;
  net: number;
}

export interface CashierTotals {
  id: string;
  name: string;
  salesCount: number;
  total: number;
  cash: number;
}

export interface SaleRow {
  id: string;
  orderNumber: string;
  paidAt: string;
  channel: "online" | "walk_in";
  method: string;
  cashier: string;
  total: number;
}

export interface EndOfDay {
  date: string;
  salesCount: number;
  itemsSold: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  refundCount: number;
  net: number;
  cashSales: number;
  cashRefunds: number;
  methods: MethodTotals[];
  cashiers: CashierTotals[];
  topProducts: { name: string; quantity: number; total: number }[];
  sales: SaleRow[];
}

/** "YYYY-MM-DD" for today in Ghana. */
export function todayInGhana(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDay(d: string | undefined): d is string {
  return Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)));
}

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export async function loadEndOfDay(date: string): Promise<EndOfDay> {
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const supabase = createAdminClient();

  const [ordersRes, returnsRes, usersRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, channel, payment_method, estimated_total, discount_total, sold_by, paid_at, status")
      .eq("payment_status", "paid")
      .neq("status", "cancelled")
      .gte("paid_at", start.toISOString())
      .lt("paid_at", end.toISOString())
      .order("paid_at", { ascending: true })
      .limit(5000),
    supabase
      .from("returns")
      .select("id, refund_method, refund_total, processed_by")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .limit(5000),
    supabase.from("users").select("id, name"),
  ]);

  if (ordersRes.error) throw new Error(`Could not load sales: ${ordersRes.error.message}`);

  const orders = ordersRes.data ?? [];
  const returns = returnsRes.data ?? [];
  const names = new Map((usersRes.data ?? []).map((u) => [u.id, u.name]));

  const itemResults = await Promise.all(
    chunks(
      orders.map((o) => o.id),
      150
    ).map((ids) => supabase.from("order_items").select("product_name, quantity, subtotal").in("order_id", ids))
  );
  const items = itemResults.flatMap((r) => r.data ?? []);

  // Payment methods: walk-in sales by how they were paid, online orders together.
  const methods = new Map<MethodKey, MethodTotals>();
  const method = (key: MethodKey) => {
    let m = methods.get(key);
    if (!m) {
      m = {
        key,
        label: key === "online" ? "Online (Paystack)" : METHOD_LABELS[key],
        sales: 0,
        salesCount: 0,
        refunds: 0,
        refundCount: 0,
        net: 0,
      };
      methods.set(key, m);
    }
    return m;
  };
  for (const key of Object.keys(METHOD_LABELS) as PaymentMethod[]) method(key); // always list the till methods

  const cashiers = new Map<string, CashierTotals>();
  const sales: SaleRow[] = [];
  let gross = 0;
  let discounts = 0;

  for (const o of orders) {
    const total = Number(o.estimated_total) || 0;
    gross += total;
    discounts += Number(o.discount_total) || 0;

    const key: MethodKey = o.channel === "walk_in" && o.payment_method ? o.payment_method : "online";
    const m = method(key);
    m.sales += total;
    m.salesCount += 1;

    const cashierId = o.channel === "walk_in" ? o.sold_by ?? "unknown" : "online";
    const cashierName =
      cashierId === "online" ? "Online shop" : names.get(cashierId) ?? "Unknown staff member";
    let c = cashiers.get(cashierId);
    if (!c) {
      c = { id: cashierId, name: cashierName, salesCount: 0, total: 0, cash: 0 };
      cashiers.set(cashierId, c);
    }
    c.salesCount += 1;
    c.total += total;
    if (key === "cash") c.cash += total;

    sales.push({
      id: o.id,
      orderNumber: o.order_number,
      paidAt: o.paid_at ?? "",
      channel: o.channel,
      method: m.label,
      cashier: cashierName,
      total,
    });
  }

  let refunds = 0;
  for (const r of returns) {
    const amount = Number(r.refund_total) || 0;
    refunds += amount;
    const m = method(r.refund_method);
    m.refunds += amount;
    m.refundCount += 1;
  }
  for (const m of methods.values()) m.net = m.sales - m.refunds;

  const products = new Map<string, { name: string; quantity: number; total: number }>();
  let itemsSold = 0;
  for (const i of items) {
    itemsSold += i.quantity;
    const p = products.get(i.product_name) ?? { name: i.product_name, quantity: 0, total: 0 };
    p.quantity += i.quantity;
    p.total += Number(i.subtotal) || 0;
    products.set(i.product_name, p);
  }

  const cash = methods.get("cash")!;

  return {
    date,
    salesCount: orders.length,
    itemsSold,
    grossSales: gross,
    discounts,
    refunds,
    refundCount: returns.length,
    net: gross - refunds,
    cashSales: cash.sales,
    cashRefunds: cash.refunds,
    // Hide the online row on days with no online orders.
    methods: [...methods.values()].filter((m) => m.key !== "online" || m.salesCount > 0 || m.refundCount > 0),
    cashiers: [...cashiers.values()].sort((a, b) => b.total - a.total),
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    sales: sales.reverse(),
  };
}
