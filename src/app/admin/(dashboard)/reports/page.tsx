import type { Metadata } from "next";
import Link from "next/link";
import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import {
  addDays,
  isValidDay,
  loadSalesReport,
  loadStockSummary,
  todayInGhana,
  type EndOfDay,
  type StockSummary,
} from "@/lib/end-of-day";
import { SalesReport } from "@/components/admin/sales-report";
import { formatCedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sales report" };

type PeriodKey = "today" | "yesterday" | "week" | "month" | "lastmonth" | "custom";

const PERIODS: { key: Exclude<PeriodKey, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "lastmonth", label: "Last month" },
];

/** Works out the dates for a period. Ghana is on UTC all year; weeks start on Monday. */
function resolvePeriod(params: { period?: string; from?: string; to?: string }) {
  const today = todayInGhana();
  const key = (params.period as PeriodKey) || "today";
  const monthStart = `${today.slice(0, 8)}01`;

  if (key === "custom" && isValidDay(params.from) && isValidDay(params.to)) {
    let from = params.from <= today ? params.from : today;
    let to = params.to <= today ? params.to : today;
    if (from > to) [from, to] = [to, from];
    if (addDays(from, 366) < to) from = addDays(to, -366); // at most about a year
    return { key: "custom" as PeriodKey, from, to };
  }
  switch (key) {
    case "yesterday": {
      const y = addDays(today, -1);
      return { key, from: y, to: y };
    }
    case "week": {
      const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
      return { key, from: addDays(today, -weekday), to: today };
    }
    case "month":
      return { key, from: monthStart, to: today };
    case "lastmonth": {
      const lastDay = addDays(monthStart, -1);
      return { key, from: `${lastDay.slice(0, 8)}01`, to: lastDay };
    }
    default:
      return { key: "today" as PeriodKey, from: today, to: today };
  }
}

const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GH", { timeZone: "Africa/Accra", ...opts });

function periodLabel(from: string, to: string) {
  if (from === to) return fmtDay(from, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${fmtDay(from, { day: "numeric", month: "short" })} – ${fmtDay(to, { day: "numeric", month: "short", year: "numeric" })}`;
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string };
}) {
  await requireOwnerAdmin();
  const period = resolvePeriod(searchParams);

  let report: EndOfDay | null = null;
  let stock: StockSummary | null = null;
  let error: string | null = null;
  try {
    [report, stock] = await Promise.all([loadSalesReport(period.from, period.to), loadStockSummary()]);
  } catch (e) {
    console.error("[sales-report]", e);
    error = "The figures could not be loaded. Please refresh the page.";
  }

  return (
    <div className="max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Owner</p>
          <h1 className="font-serif text-2xl text-brown">Sales report</h1>
          <p className="mt-1 text-sm text-taupe">{periodLabel(period.from, period.to)}</p>
        </div>
        <Link
          href={`/admin/end-of-day?date=${period.to}`}
          className="rounded-lg border border-brown/25 px-4 py-2 text-sm font-medium text-brown hover:border-brown"
        >
          Cash up / end of day
        </Link>
      </div>

      {/* Period picker */}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Period" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/admin/reports?period=${p.key}`}
              aria-current={period.key === p.key ? "page" : undefined}
              className={`h-9 flex-shrink-0 rounded-full px-4 text-sm font-medium leading-9 transition-colors ${
                period.key === p.key ? "bg-brown text-cream" : "bg-white text-brown ring-1 ring-rose/20 hover:ring-rose/50"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="period" value="custom" />
          <label className="sr-only" htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={period.from} max={todayInGhana()} className="field-input h-9 w-auto py-1" />
          <span className="text-sm text-taupe">to</span>
          <label className="sr-only" htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={period.to} max={todayInGhana()} className="field-input h-9 w-auto py-1" />
          <button className="h-9 rounded-lg bg-brown px-4 text-sm font-medium text-cream hover:bg-rose">Show</button>
        </form>
      </div>

      {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {report && stock && <SalesReport report={report} stock={stock} />}
    </div>
  );
}
