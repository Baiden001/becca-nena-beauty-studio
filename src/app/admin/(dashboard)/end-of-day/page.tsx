import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import { isValidDay, loadEndOfDay, todayInGhana } from "@/lib/end-of-day";
import { EndOfDayReport } from "@/components/admin/end-of-day-report";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "End of day" };

export default async function EndOfDayPage({ searchParams }: { searchParams: { date?: string } }) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");

  const today = todayInGhana();
  const date = isValidDay(searchParams.date) && searchParams.date <= today ? searchParams.date : today;

  let report = null;
  let error: string | null = null;
  try {
    report = await loadEndOfDay(date);
  } catch (e) {
    console.error("[end-of-day]", e);
    error = "The day's figures could not be loaded. Please refresh the page.";
  }

  return (
    <div className="max-w-6xl">
      <p className="eyebrow">Cash up</p>
      <h1 className="font-serif text-2xl text-brown">End of day</h1>
      <p className="mt-1 text-sm text-taupe">
        Every paid sale and refund for the day, by payment method and by cashier. Count the cash drawer
        and compare it with what the till expects, then print the report.
      </p>

      <form className="mt-5 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label htmlFor="date" className="field-label">Day</label>
          <input id="date" name="date" type="date" defaultValue={date} max={today} className="field-input mt-1.5 w-auto" />
        </div>
        <button className="rounded-lg border border-brown/30 px-4 py-2.5 text-sm font-medium text-brown hover:border-brown">
          Show
        </button>
      </form>

      {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {report && <EndOfDayReport report={report} isToday={date === today} printedBy={staff.name} />}
    </div>
  );
}
