"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Printer } from "lucide-react";
import type { EndOfDay } from "@/lib/end-of-day";
import { formatCedis } from "@/lib/pricing";
import { desktop, printSlip, RECEIPT_CONFIG, slipHelpers } from "@/lib/receipt";
import { DiscountsGiven } from "@/components/admin/discounts-given";

const { esc, money, stamp } = slipHelpers;

function parseAmount(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const time = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" }) : "";

const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Accra",
  });

export function EndOfDayReport({ report, isToday, printedBy }: { report: EndOfDay; isToday: boolean; printedBy: string }) {
  const storeKey = `bn-cashup-${report.date}`;
  const [float, setFloat] = useState("");
  const [counted, setCounted] = useState("");
  const [hasDrawer, setHasDrawer] = useState(false);
  const [drawerMsg, setDrawerMsg] = useState<string | null>(null);

  // Remember what was typed for this day on this device, so a refresh doesn't lose it.
  useEffect(() => {
    setHasDrawer(Boolean(desktop()));
    try {
      const saved = JSON.parse(window.localStorage.getItem(storeKey) ?? "{}");
      if (typeof saved.float === "string") setFloat(saved.float);
      if (typeof saved.counted === "string") setCounted(saved.counted);
    } catch {
      /* start empty */
    }
  }, [storeKey]);
  useEffect(() => {
    try {
      window.localStorage.setItem(storeKey, JSON.stringify({ float, counted }));
    } catch {
      /* only for this visit */
    }
  }, [storeKey, float, counted]);

  const floatAmt = parseAmount(float) ?? 0;
  const countedAmt = parseAmount(counted);
  const expectedCash = floatAmt + report.cashSales - report.cashRefunds;
  const difference = countedAmt === null ? null : countedAmt - expectedCash;

  async function openDrawer() {
    const res = await desktop()?.openDrawer();
    setDrawerMsg(res?.ok ? "Drawer opened." : `Couldn't open the drawer: ${res?.error ?? "no desktop app"}`);
    setTimeout(() => setDrawerMsg(null), 4000);
  }

  function print() {
    const row = (a: string, b: string, bold = false) =>
      `<tr><td${bold ? ' class="b"' : ""}>${esc(a)}</td><td${bold ? ' class="b"' : ""}>${esc(b)}</td></tr>`;

    const methodRows = report.methods
      .filter((m) => m.salesCount || m.refundCount)
      .map(
        (m) =>
          row(`${m.label} (${m.salesCount})`, money(m.sales)) +
          (m.refunds ? row(`  less refunds (${m.refundCount})`, `-${money(m.refunds)}`) : "")
      )
      .join("");

    const cashierRows = report.cashiers.map((c) => row(`${c.name} (${c.salesCount})`, money(c.total))).join("");

    const body = `
  <div>
    <img class="logo" src="${esc(window.location.origin)}/images/logo.png" alt="">
    <div class="title">END OF DAY REPORT</div>
    <div class="c">${esc(longDate(report.date))}</div>
    <div class="c small">Printed ${esc(stamp(new Date()))} by ${esc(printedBy)}</div>
    ${RECEIPT_CONFIG.storeLocation ? `<div class="c small">${esc(RECEIPT_CONFIG.storeLocation)}</div>` : ""}
  </div>
  <hr>
  <table class="kv">
    ${row("Sales", String(report.salesCount))}
    ${row("Items sold", String(report.itemsSold))}
    ${row("Gross sales", money(report.grossSales))}
    ${row("Discounts given", money(report.discounts))}
    ${
      report.discountsGiven.length
        ? row(
            `  incl. at the till (${report.discountsGiven.length})`,
            money(report.discountsGiven.reduce((s, d) => s + d.amount, 0))
          )
        : ""
    }
    ${row(`Refunds (${report.refundCount})`, `-${money(report.refunds)}`)}
  </table>
  <hr>
  <table class="kv total"><tr><td>NET</td><td>${esc(money(report.net))}</td></tr></table>
  <hr>
  <div class="title">BY PAYMENT METHOD</div>
  <table class="kv">${methodRows || row("No sales", "")}</table>
  <hr>
  <div class="title">CASH DRAWER</div>
  <table class="kv">
    ${row("Opening float", money(floatAmt))}
    ${row("+ Cash sales", money(report.cashSales))}
    ${row("- Cash refunds", money(report.cashRefunds))}
    ${row("Expected in drawer", money(expectedCash), true)}
    ${countedAmt === null ? row("Counted", "not entered") : row("Counted", money(countedAmt))}
    ${
      difference === null
        ? ""
        : row(
            difference === 0 ? "Balanced" : difference > 0 ? "Over" : "Short",
            money(Math.abs(difference)),
            true
          )
    }
  </table>
  <hr>
  <div class="title">BY CASHIER</div>
  <table class="kv">${cashierRows || row("No sales", "")}</table>
  <hr>
  <div class="c small">Counted by: ______________________</div>
  <div class="c small mt">Checked by: ______________________</div>`;
    void printSlip(body);
  }

  const tile = (label: string, value: string, hint?: string) => (
    <div className="rounded-xl border border-rose/15 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-taupe">{label}</p>
      <p className="mt-1 font-serif text-2xl tabular-nums text-brown">{value}</p>
      {hint && <p className="text-xs text-taupe">{hint}</p>}
    </div>
  );

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brown">
          {longDate(report.date)}
          {isToday && <span className="ml-2 rounded-full bg-sage/25 px-2 py-0.5 text-xs text-brown">so far today</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {hasDrawer && (
            <button
              type="button"
              onClick={() => void openDrawer()}
              className="inline-flex items-center gap-2 rounded-lg border border-brown/30 px-4 py-2.5 text-sm font-medium text-brown hover:border-brown"
            >
              <Archive size={16} aria-hidden />
              Open cash drawer
            </button>
          )}
          <button
            type="button"
            onClick={print}
            className="inline-flex items-center gap-2 rounded-lg bg-brown px-4 py-2.5 text-sm font-medium text-cream hover:bg-rose"
          >
            <Printer size={16} aria-hidden />
            Print end-of-day report
          </button>
        </div>
      </div>
      {drawerMsg && <p className="text-sm text-taupe">{drawerMsg}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tile("Net takings", formatCedis(report.net), "after refunds")}
        {tile("Sales", String(report.salesCount), `${report.itemsSold} items`)}
        {tile("Average sale", formatCedis(report.salesCount ? report.grossSales / report.salesCount : 0))}
        {tile("Refunds", formatCedis(report.refunds), `${report.refundCount} return${report.refundCount === 1 ? "" : "s"}`)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Payment methods */}
        <section className="rounded-xl border border-rose/15 bg-white">
          <h2 className="border-b border-rose/10 px-5 py-3.5 text-sm font-semibold text-brown">By payment method</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-taupe">
                  <th className="px-5 py-2.5 font-medium">Method</th>
                  <th className="px-3 py-2.5 text-right font-medium">Sales</th>
                  <th className="px-3 py-2.5 text-right font-medium">Refunds</th>
                  <th className="px-5 py-2.5 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose/10">
                {report.methods.map((m) => (
                  <tr key={m.key} className={m.salesCount || m.refundCount ? "text-brown" : "text-taupe/70"}>
                    <td className="px-5 py-2.5">
                      {m.label}
                      <span className="ml-1.5 text-xs text-taupe">×{m.salesCount}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCedis(m.sales)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{m.refunds ? `−${formatCedis(m.refunds)}` : "—"}</td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums">{formatCedis(m.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-rose/20 font-semibold text-brown">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCedis(report.grossSales)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{report.refunds ? `−${formatCedis(report.refunds)}` : "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCedis(report.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {report.discounts > 0 && (
            <p className="border-t border-rose/10 px-5 py-3 text-xs text-taupe">
              Discounts given on these sales: {formatCedis(report.discounts)}
            </p>
          )}
        </section>

        {/* Cash drawer */}
        <section className="rounded-xl border border-rose/15 bg-white p-5">
          <h2 className="text-sm font-semibold text-brown">Cash drawer</h2>
          <p className="mt-0.5 text-xs text-taupe">Count the notes and coins, then type the total.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="float" className="field-label">Opening float</label>
              <input
                id="float"
                inputMode="decimal"
                value={float}
                onChange={(e) => setFloat(e.target.value)}
                placeholder="0"
                className="field-input mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="counted" className="field-label">Cash counted</label>
              <input
                id="counted"
                inputMode="decimal"
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
                placeholder="Count the drawer"
                className="field-input mt-1.5"
              />
            </div>
          </div>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-taupe">
              <dt>Opening float</dt>
              <dd className="tabular-nums">{formatCedis(floatAmt)}</dd>
            </div>
            <div className="flex justify-between text-taupe">
              <dt>+ Cash sales</dt>
              <dd className="tabular-nums">{formatCedis(report.cashSales)}</dd>
            </div>
            <div className="flex justify-between text-taupe">
              <dt>− Cash refunds</dt>
              <dd className="tabular-nums">{formatCedis(report.cashRefunds)}</dd>
            </div>
            <div className="flex justify-between border-t border-rose/15 pt-2 font-semibold text-brown">
              <dt>Expected in drawer</dt>
              <dd className="tabular-nums">{formatCedis(expectedCash)}</dd>
            </div>
          </dl>
          {difference !== null && (
            <div
              className={`mt-4 flex items-center justify-between rounded-lg px-4 py-3 ${
                Math.abs(difference) < 0.005
                  ? "bg-sage/25 text-brown"
                  : difference > 0
                    ? "bg-amber-50 text-amber-800"
                    : "bg-red-50 text-red-700"
              }`}
            >
              <span className="text-sm font-medium">
                {Math.abs(difference) < 0.005 ? "Drawer balances" : difference > 0 ? "Drawer is over by" : "Drawer is short by"}
              </span>
              <span className="font-serif text-2xl tabular-nums">{formatCedis(Math.abs(difference))}</span>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-rose/15 bg-white">
          <h2 className="border-b border-rose/10 px-5 py-3.5 text-sm font-semibold text-brown">By cashier</h2>
          {report.cashiers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-taupe">No sales yet.</p>
          ) : (
            <ul className="divide-y divide-rose/10 text-sm">
              {report.cashiers.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="text-brown">
                    {c.name}
                    <span className="ml-1.5 text-xs text-taupe">
                      {c.salesCount} sale{c.salesCount === 1 ? "" : "s"}
                      {c.cash > 0 && ` · ${formatCedis(c.cash)} cash`}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums text-brown">{formatCedis(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-rose/15 bg-white">
          <h2 className="border-b border-rose/10 px-5 py-3.5 text-sm font-semibold text-brown">Best sellers</h2>
          {report.topProducts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-taupe">Nothing sold yet.</p>
          ) : (
            <ol className="divide-y divide-rose/10 text-sm">
              {report.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="min-w-0 truncate text-brown">
                    <span className="mr-2 text-xs text-taupe">{i + 1}.</span>
                    {p.name}
                  </span>
                  <span className="whitespace-nowrap text-taupe">
                    ×{p.quantity} · <span className="text-brown">{formatCedis(p.total)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <DiscountsGiven items={report.discountsGiven} />

      <section className="rounded-xl border border-rose/15 bg-white">
        <h2 className="border-b border-rose/10 px-5 py-3.5 text-sm font-semibold text-brown">
          All sales <span className="font-normal text-taupe">({report.sales.length})</span>
        </h2>
        {report.sales.length === 0 ? (
          <p className="px-5 py-6 text-sm text-taupe">No paid sales on this day.</p>
        ) : (
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs uppercase tracking-wide text-taupe">
                  <th className="px-5 py-2.5 font-medium">Time</th>
                  <th className="px-3 py-2.5 font-medium">Sale</th>
                  <th className="px-3 py-2.5 font-medium">Paid by</th>
                  <th className="px-3 py-2.5 font-medium">Cashier</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose/10 text-brown">
                {report.sales.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-2.5 tabular-nums text-taupe">{time(s.paidAt)}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/orders/${s.id}`} className="hover:text-rose">
                        #{s.orderNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{s.method}</td>
                    <td className="px-3 py-2.5">{s.cashier}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{formatCedis(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
