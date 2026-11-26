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

export interface PaymentGroup {
  key: "cash" | "momo" | "card" | "bank" | "online";
  label: string;
  hint: string;
  total: number;
  count: number;
}

export interface DayTotal {
  date: string;
  total: number;
  count: number;
}

export interface EndOfDay {
  date: string;
  /** Last day of the period (same as date for a single day). */
  endDate: string;
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
  /** The money that came in, grouped the way the shop thinks about it. */
  groups: PaymentGroup[];
  days: DayTotal[];
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

/**
 * Supabase hands back at most 1,000 rows per request, so busy periods are
 * read page by page until everything is in.
 */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; from < 100_000; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export function loadEndOfDay(date: string): Promise<EndOfDay> {
  return loadSalesReport(date, date);
}

/** Sales, refunds and payment totals for every day from `from` to `to`, inclusive. */
export async function loadSalesReport(from: string, to: string): Promise<EndOfDay> {
  const date = from;
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(Date.parse(`${to}T00:00:00Z`) + DAY_MS);
  const supabase = createAdminClient();

  let orders, returns;
  try {
    [orders, returns] = await Promise.all([
      fetchAll((a, b) =>
        supabase
          .from("orders")
          .select("id, order_number, channel, payment_method, estimated_total, discount_total, sold_by, paid_at, status")
          .eq("payment_status", "paid")
          .neq("status", "cancelled")
          .gte("paid_at", start.toISOString())
          .lt("paid_at", end.toISOString())
          .order("paid_at", { ascending: true })
          .range(a, b)
      ),
      fetchAll((a, b) =>
        supabase
          .from("returns")
          .select("id, refund_method, refund_total, processed_by")
          .gte("created_at", start.toISOString())
          .lt("created_at", end.toISOString())
          .order("created_at", { ascending: true })
          .range(a, b)
      ),
    ]);
  } catch (e) {
    throw new Error(`Could not load sales: ${e instanceof Error ? e.message : e}`);
  }
  const usersRes = await supabase.from("users").select("id, name");
  const names = new Map((usersRes.data ?? []).map((u) => [u.id, u.name]));

  const itemResults = await Promise.all(
    chunks(
      orders.map((o) => o.id),
      150
    ).map((ids) =>
      fetchAll((a, b) =>
        supabase.from("order_items").select("product_name, quantity, subtotal").in("order_id", ids).range(a, b)
      )
    )
  );
  const items = itemResults.flat();

  // How each in-store sale was paid. A split sale has several lines (e.g.
  // MoMo + cash). Sales from before split payments existed, or if the table
  // isn't there yet, fall back to the sale's single payment method.
  const paymentsByOrder = new Map<string, { method: PaymentMethod; amount: number }[]>();
  const walkInIds = orders.filter((o) => o.channel === "walk_in").map((o) => o.id);
  try {
    const payResults = await Promise.all(
      chunks(walkInIds, 150).map((ids) =>
        fetchAll((a, b) =>
          supabase.from("order_payments").select("order_id, method, amount").in("order_id", ids).range(a, b)
        )
      )
    );
    for (const p of payResults.flat()) {
      const list = paymentsByOrder.get(p.order_id) ?? [];
      list.push({ method: p.method, amount: Number(p.amount) || 0 });
      paymentsByOrder.set(p.order_id, list);
    }
  } catch (e) {
    console.warn("[sales-report] payment lines unavailable, using one method per sale:", e);
  }

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

    // The parts of this sale's payment: one for most sales, several for a split.
    const parts: { key: MethodKey; amount: number }[] =
      o.channel !== "walk_in"
        ? [{ key: "online", amount: total }]
        : paymentsByOrder.get(o.id)?.length
          ? paymentsByOrder.get(o.id)!.map((p) => ({ key: p.method, amount: p.amount }))
          : [{ key: o.payment_method ?? "cash", amount: total }];
    for (const part of parts) {
      const m = method(part.key);
      m.sales += part.amount;
      m.salesCount += 1;
    }
    const cashPart = parts.filter((p) => p.key === "cash").reduce((sum, p) => sum + p.amount, 0);
    const methodText = [...new Set(parts.map((p) => method(p.key).label))].join(" + ");

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
    c.cash += cashPart;

    sales.push({
      id: o.id,
      orderNumber: o.order_number,
      paidAt: o.paid_at ?? "",
      channel: o.channel,
      method: methodText,
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

  // Money by where it lands: the drawer, the MoMo wallet, the card machine...
  const m = (k: MethodKey) => methods.get(k) ?? { sales: 0, salesCount: 0 };
  const groups: PaymentGroup[] = [
    { key: "cash", label: "Cash", hint: "in the drawer", total: m("cash").sales, count: m("cash").salesCount },
    { key: "momo", label: "MoMo", hint: "Mobile Money at the till", total: m("mobile_money").sales, count: m("mobile_money").salesCount },
    {
      key: "card",
      label: "Card machine",
      hint: "card + POS terminal",
      total: m("card").sales + m("pos_terminal").sales,
      count: m("card").salesCount + m("pos_terminal").salesCount,
    },
    { key: "bank", label: "Bank transfer", hint: "paid to the bank", total: m("bank_transfer").sales, count: m("bank_transfer").salesCount },
    { key: "online", label: "Online", hint: "website, via Paystack", total: m("online").sales, count: m("online").salesCount },
  ];

  // One entry per day in the period, including days with no sales.
  const dayMap = new Map<string, DayTotal>();
  for (let d = from; d <= to; d = addDays(d, 1)) dayMap.set(d, { date: d, total: 0, count: 0 });
  for (const sale of sales) {
    const day = dayMap.get(sale.paidAt.slice(0, 10));
    if (day) {
      day.total += sale.total;
      day.count += 1;
    }
  }

  return {
    date,
    endDate: to,
    groups,
    days: [...dayMap.values()],
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

export interface StockSummary {
  products: number;
  units: number;
  /** What the stock on the shelves would sell for at today's normal prices. */
  retailValue: number;
  lowCount: number;
  outCount: number;
  low: { id: string; name: string; stock: number }[];
}

/** Stock remaining right now (not tied to a date range). */
export async function loadStockSummary(): Promise<StockSummary> {
  const supabase = createAdminClient();
  const rows = await fetchAll((a, b) =>
    supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold, regular_price, status")
      .neq("status", "draft")
      .order("stock_quantity", { ascending: true })
      .range(a, b)
  );
  let units = 0;
  let retailValue = 0;
  let lowCount = 0;
  let outCount = 0;
  const low: StockSummary["low"] = [];
  for (const p of rows) {
    const stock = Math.max(0, p.stock_quantity);
    units += stock;
    retailValue += stock * (Number(p.regular_price) || 0);
    if (stock === 0) outCount += 1;
    else if (stock <= p.low_stock_threshold) lowCount += 1;
    if (stock <= p.low_stock_threshold && low.length < 8) low.push({ id: p.id, name: p.name, stock });
  }
  return { products: rows.length, units, retailValue, lowCount, outCount, low };
}
