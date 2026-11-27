import Link from "next/link";
import { Banknote, Building2, CreditCard, Globe, Smartphone, type LucideIcon } from "lucide-react";
import type { EndOfDay, PaymentGroup, StockSummary } from "@/lib/end-of-day";
import { formatCedis } from "@/lib/pricing";
import { DiscountsGiven } from "@/components/admin/discounts-given";

// The owner's sales report: money by payment type, daily sales, employees,
// best sellers and stock. Lays out in columns on desktop and stacks on phones.

const ICONS: Record<PaymentGroup["key"], LucideIcon> = {
  cash: Banknote,
  momo: Smartphone,
  card: CreditCard,
  bank: Building2,
  online: Globe,
};

const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GH", { timeZone: "Africa/Accra", ...opts });

export function SalesReport({ report, stock }: { report: EndOfDay; stock: StockSummary }) {
  const gross = report.grossSales;
  const visibleGroups = report.groups.filter((g) => g.key === "cash" || g.key === "momo" || g.key === "card" || g.total > 0);
  const avg = report.salesCount ? gross / report.salesCount : 0;

  return (
    <div className="mt-6 space-y-6">
      {/* Headline + money by payment type */}
      <div className="grid gap-4 xl:grid-cols-[minmax(320px,1fr)_2fr]">
        <section className="rounded-xl bg-brown p-5 text-cream sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-cream/70">Total sales</p>
          <p className="mt-2 break-words font-serif text-[clamp(2.1rem,3.6vw,3rem)] leading-tight tabular-nums">{formatCedis(gross)}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/15 pt-4 text-sm">
            <div>
              <dt className="text-cream/60">Sales</dt>
              <dd className="mt-0.5 text-lg font-medium tabular-nums">{report.salesCount}</dd>
            </div>
            <div>
              <dt className="text-cream/60">Items</dt>
              <dd className="mt-0.5 text-lg font-medium tabular-nums">{report.itemsSold}</dd>
            </div>
            <div>
              <dt className="text-cream/60">Average</dt>
              <dd className="mt-0.5 text-lg font-medium tabular-nums">{formatCedis(Math.round(avg))}</dd>
            </div>
          </dl>
          {report.refunds > 0 && (
            <p className="mt-3 text-sm text-cream/75">
              After {formatCedis(report.refunds)} refunds: <strong className="text-cream">{formatCedis(report.net)}</strong>
            </p>
          )}
        </section>

        <section
          aria-label="Money by payment type"
          className={`grid gap-3 ${
            visibleGroups.length === 4
              ? "grid-cols-2"
              : visibleGroups.length === 3
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-2 md:grid-cols-3"
          }`}
        >
          {visibleGroups.map((g) => {
            const Icon = ICONS[g.key];
            const share = gross > 0 ? Math.round((g.total / gross) * 100) : 0;
            return (
              <div key={g.key} className="flex flex-col rounded-xl border border-rose/15 bg-white p-4">
                <div className="flex items-center gap-2 text-taupe">
                  <Icon size={17} aria-hidden />
                  <span className="text-sm font-medium text-brown">{g.label}</span>
                </div>
                <p className="mt-2 font-serif text-2xl tabular-nums text-brown sm:text-3xl">{formatCedis(g.total)}</p>
                <p className="mt-auto pt-2 text-xs text-taupe">
                  {g.count} sale{g.count === 1 ? "" : "s"} · {share}% · {g.hint}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream" aria-hidden>
                  <div className="h-full rounded-full bg-rose" style={{ width: `${share}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* Sales per day + refunds/discounts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-rose/15 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-brown">Sales per day</h2>
          {report.days.length > 1 ? (
            <DailyChart days={report.days} />
          ) : (
            <p className="mt-3 text-sm text-taupe">
              Pick <Link href="/admin/reports?period=week" className="text-rose hover:underline">This week</Link> or{" "}
              <Link href="/admin/reports?period=month" className="text-rose hover:underline">This month</Link> to see a chart of
              daily sales.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-rose/15 bg-white p-5">
          <h2 className="text-sm font-semibold text-brown">Refunds &amp; discounts</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-taupe">Refunds</dt>
              <dd className="tabular-nums text-brown">
                {formatCedis(report.refunds)} <span className="text-taupe">({report.refundCount})</span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-taupe">Discounts given</dt>
              <dd className="tabular-nums text-brown">{formatCedis(report.discounts)}</dd>
            </div>
            <div className="flex justify-between border-t border-rose/15 pt-3 font-semibold">
              <dt className="text-brown">Takings after refunds</dt>
              <dd className="tabular-nums text-brown">{formatCedis(report.net)}</dd>
            </div>
          </dl>
          {report.refunds > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-taupe">
              {report.methods
                .filter((m) => m.refunds > 0)
                .map((m) => (
                  <li key={m.key} className="flex justify-between">
                    <span>Refunded by {m.label.toLowerCase()}</span>
                    <span className="tabular-nums">{formatCedis(m.refunds)}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      <DiscountsGiven items={report.discountsGiven} showDate={report.days.length > 1} />

      {/* Employees, best sellers, stock */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-xl border border-rose/15 bg-white">
          <h2 className="border-b border-rose/10 px-5 py-3.5 text-sm font-semibold text-brown">Sales by employee</h2>
          {report.cashiers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-taupe">No sales in this period.</p>
          ) : (
            <ul className="divide-y divide-rose/10 text-sm">
              {report.cashiers.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-brown">{c.name}</span>
                    <span className="font-medium tabular-nums text-brown">{formatCedis(c.total)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-taupe">
                    {c.salesCount} sale{c.salesCount === 1 ? "" : "s"}
                    {c.cash > 0 && ` · ${formatCedis(c.cash)} in cash`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-rose/15 bg-white">
          <h2 className="border-b border-rose/10 px-5 py-3.5 text-sm font-semibold text-brown">Best-selling products</h2>
          {report.topProducts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-taupe">Nothing sold in this period.</p>
          ) : (
            <ol className="divide-y divide-rose/10 text-sm">
              {report.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="min-w-0 truncate text-brown">
                    <span className="mr-2 text-xs tabular-nums text-taupe">{i + 1}.</span>
                    {p.name}
                  </span>
                  <span className="whitespace-nowrap text-taupe">
                    ×{p.quantity} · <span className="tabular-nums text-brown">{formatCedis(p.total)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-rose/15 bg-white md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between border-b border-rose/10 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-brown">Stock remaining</h2>
            <Link href="/admin/products" className="text-xs text-rose hover:underline">Manage stock</Link>
          </div>
          <dl className="grid grid-cols-2 gap-4 px-5 py-4 text-sm">
            <div>
              <dt className="text-taupe">Items on the shelves</dt>
              <dd className="mt-0.5 text-lg font-medium tabular-nums text-brown">{stock.units.toLocaleString("en-GH")}</dd>
            </div>
            <div>
              <dt className="text-taupe">Worth at normal prices</dt>
              <dd className="mt-0.5 text-lg font-medium tabular-nums text-brown">{formatCedis(stock.retailValue)}</dd>
            </div>
            <div>
              <dt className="text-taupe">Running low</dt>
              <dd className="mt-0.5 text-lg font-medium tabular-nums text-amber-700">{stock.lowCount}</dd>
            </div>
            <div>
              <dt className="text-taupe">Out of stock</dt>
              <dd className="mt-0.5 text-lg font-medium tabular-nums text-red-600">{stock.outCount}</dd>
            </div>
          </dl>
          {stock.low.length > 0 && (
            <ul className="divide-y divide-rose/10 border-t border-rose/10 text-sm">
              {stock.low.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-2">
                  <Link href={`/admin/products/${p.id}`} className="min-w-0 truncate text-brown hover:text-rose">
                    {p.name}
                  </Link>
                  <span className={`whitespace-nowrap text-xs font-medium ${p.stock === 0 ? "text-red-600" : "text-amber-700"}`}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Daily sales as bars. Hover or tap a bar for the figures; a table view is below. */
function DailyChart({ days }: { days: EndOfDay["days"] }) {
  const max = Math.max(...days.map((d) => d.total), 1);
  const step = days.length > 14 ? Math.ceil(days.length / 7) : 1; // keep date labels readable
  const best = days.reduce((a, b) => (b.total > a.total ? b : a), days[0]);

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between text-xs text-taupe">
        <span>
          Best day: <strong className="text-brown">{fmtDay(best.date, { weekday: "short", day: "numeric", month: "short" })}</strong>{" "}
          · {formatCedis(best.total)}
        </span>
        <span className="tabular-nums">max {formatCedis(max)}</span>
      </div>
      <div className="relative mt-3 h-48 border-b border-taupe/30 sm:h-56">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-taupe/15" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-taupe/15" aria-hidden />
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {days.map((d) => {
            const h = d.total > 0 ? Math.max(2, (d.total / max) * 100) : 0;
            const label = `${fmtDay(d.date, { weekday: "short", day: "numeric", month: "short" })}: ${formatCedis(d.total)}, ${d.count} sale${d.count === 1 ? "" : "s"}`;
            return (
              <div key={d.date} tabIndex={0} aria-label={label} className="group relative flex h-full flex-1 items-end outline-none">
                <div
                  className="w-full rounded-t-[4px] bg-rose transition-colors group-hover:bg-brown group-focus:bg-brown"
                  style={{ height: `${h}%` }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-brown px-2.5 py-1.5 text-xs text-cream shadow-lg group-hover:block group-focus:block">
                  <p className="font-medium">{fmtDay(d.date, { weekday: "short", day: "numeric", month: "short" })}</p>
                  <p className="tabular-nums">
                    {formatCedis(d.total)} · {d.count} sale{d.count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[10px] text-taupe sm:text-xs">
        {days.map((d, i) => (
          <span key={d.date} className="flex-1 text-center tabular-nums">
            {i % step === 0 ? fmtDay(d.date, days.length > 7 ? { day: "numeric" } : { weekday: "short" }) : ""}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs text-taupe hover:text-brown">Show as a table</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-rose/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-taupe">
              <tr>
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 text-right font-medium">Sales</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose/10 text-brown">
              {days.map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5">{fmtDay(d.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.count}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatCedis(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
