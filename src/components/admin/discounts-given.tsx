import Link from "next/link";
import type { DiscountGiven } from "@/lib/end-of-day";
import { formatCedis } from "@/lib/pricing";

const when = (iso: string, withDate: boolean) =>
  iso
    ? new Date(iso).toLocaleString("en-GH", {
        timeZone: "Africa/Accra",
        hour: "2-digit",
        minute: "2-digit",
        ...(withDate ? { day: "numeric", month: "short" } : {}),
      })
    : "";

/** Every discount staff gave at the till: which sale, how much, why, who. */
export function DiscountsGiven({ items, showDate = false }: { items: DiscountGiven[]; showDate?: boolean }) {
  const total = items.reduce((s, d) => s + d.amount, 0);
  return (
    <section className="rounded-xl border border-rose/15 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rose/10 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-brown">
          Discounts given at the till <span className="font-normal text-taupe">({items.length})</span>
        </h2>
        {items.length > 0 && <span className="text-sm font-medium tabular-nums text-brown">−{formatCedis(total)}</span>}
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-taupe">No discounts were given.</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-taupe">
              <tr>
                <th className="px-5 py-2.5 font-medium">{showDate ? "When" : "Time"}</th>
                <th className="px-3 py-2.5 font-medium">Sale</th>
                <th className="px-3 py-2.5 font-medium">Reason</th>
                <th className="px-3 py-2.5 font-medium">Given by</th>
                <th className="px-5 py-2.5 text-right font-medium">Discount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose/10 text-brown">
              {items.map((d) => (
                <tr key={d.orderId}>
                  <td className="whitespace-nowrap px-5 py-2.5 tabular-nums text-taupe">{when(d.paidAt, showDate)}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/orders/${d.orderId}`} className="hover:text-rose">
                      #{d.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{d.reason}</td>
                  <td className="px-3 py-2.5">{d.givenBy}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">−{formatCedis(d.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
