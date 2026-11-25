import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCedis } from "@/lib/pricing";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import { loadSalesReport, todayInGhana } from "@/lib/end-of-day";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const staff = await getCurrentStaff();
  // Owners see today's takings at the top; sales staff don't.
  const today =
    staff?.role === "owner_admin"
      ? await loadSalesReport(todayInGhana(), todayInGhana()).catch(() => null)
      : null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: newOrders },
    { count: ordersToday },
    { count: productCount },
    { count: lowStock },
    { count: outOfStock },
    { count: activePromotions },
    { data: recentOrdersRaw },
    { data: lowStockProducts },
    { data: promotions },
  ] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("stock_status", "low_stock"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("stock_status", "out_of_stock"),
    supabase.from("promotions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("orders")
      .select("id, order_number, status, estimated_total, created_at, customers(name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold")
      .in("stock_status", ["low_stock", "out_of_stock"])
      .limit(6),
    supabase.from("promotions").select("id, title, end_date").eq("status", "active").limit(4),
  ]);

  // The join comes back typed as an array by this postgrest-js version
  // regardless of cardinality — cast to the known one-to-one shape.
  const recentOrders = recentOrdersRaw as unknown as
    | {
        id: string;
        order_number: string;
        status: string;
        estimated_total: number;
        created_at: string;
        customers: { name: string } | null;
      }[]
    | null;

  const kpis = [
    { label: "New Orders", value: newOrders ?? 0 },
    { label: "Orders Today", value: ordersToday ?? 0 },
    { label: "Products", value: productCount ?? 0 },
    { label: "Low Stock", value: lowStock ?? 0 },
    { label: "Out of Stock", value: outOfStock ?? 0 },
    { label: "Active Promotions", value: activePromotions ?? 0 },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl text-brown">Dashboard</h1>

      {today && (
        <Link
          href="/admin/reports"
          className="mt-6 grid gap-4 rounded-xl bg-brown p-5 text-cream transition-opacity hover:opacity-95 md:grid-cols-[auto_1fr] md:items-center md:gap-8"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-cream/70">Today&apos;s sales</p>
            <p className="mt-1 font-serif text-4xl tabular-nums">{formatCedis(today.grossSales)}</p>
            <p className="mt-1 text-sm text-cream/70">
              {today.salesCount} sale{today.salesCount === 1 ? "" : "s"} · see full report →
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {today.groups
              .filter((g) => g.key !== "bank" || g.total > 0)
              .map((g) => (
                <div key={g.key} className="rounded-lg bg-white/10 px-3 py-2.5">
                  <p className="text-xs text-cream/70">{g.label}</p>
                  <p className="mt-0.5 text-lg font-medium tabular-nums">{formatCedis(g.total)}</p>
                </div>
              ))}
          </div>
        </Link>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-md border border-rose/20 bg-white p-4">
            <p className="text-2xl font-medium text-brown">{kpi.value}</p>
            <p className="mt-1 text-xs text-taupe">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-rose/20 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-brown">Recent orders</p>
            <Link href="/admin/orders" className="text-xs text-rose hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-rose/10">
            {recentOrders?.length ? (
              recentOrders.map((o: { id: string; order_number: string; status: string; estimated_total: number; customers: { name: string } | null }) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <Link href={`/admin/orders/${o.id}`} className="text-brown hover:text-rose">
                      #{o.order_number}
                    </Link>
                    <p className="text-xs text-taupe">{o.customers?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-brown">{formatCedis(o.estimated_total)}</p>
                    <p className="text-xs capitalize text-taupe">{o.status}</p>
                  </div>
                </li>
              ))
            ) : (
              <p className="py-4 text-sm text-taupe">No orders yet.</p>
            )}
          </ul>
        </div>

        <div className="rounded-md border border-rose/20 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-brown">Inventory alerts</p>
            <Link href="/admin/products" className="text-xs text-rose hover:underline">
              Manage stock
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-rose/10">
            {lowStockProducts?.length ? (
              lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link href={`/admin/products/${p.id}`} className="text-brown hover:text-rose">
                    {p.name}
                  </Link>
                  <span className={p.stock_quantity === 0 ? "text-red-600" : "text-rose"}>
                    {p.stock_quantity} left
                  </span>
                </li>
              ))
            ) : (
              <p className="py-4 text-sm text-taupe">Stock levels look healthy.</p>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-rose/20 bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-brown">Active promotions</p>
          <Link href="/admin/promotions" className="text-xs text-rose hover:underline">
            Manage
          </Link>
        </div>
        <ul className="mt-4 flex flex-wrap gap-3">
          {promotions?.length ? (
            promotions.map((p) => (
              <li
                key={p.id}
                className="rounded-full border border-rose/30 px-4 py-1.5 text-sm text-brown"
              >
                {p.title} · ends {new Date(p.end_date).toLocaleDateString()}
              </li>
            ))
          ) : (
            <p className="text-sm text-taupe">Nothing running right now.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
