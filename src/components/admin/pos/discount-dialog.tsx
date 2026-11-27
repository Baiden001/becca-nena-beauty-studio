"use client";

import { useEffect, useRef, useState } from "react";
import { BadgePercent, X } from "lucide-react";
import { formatCedis } from "@/lib/pricing";

export interface AppliedDiscount {
  amount: number;
  reason: string;
  /** For display, e.g. "10%" or "GH₵20". */
  label: string;
}

const REASONS = ["Loyal customer", "Bulk purchase", "Damaged packaging", "Price match"];
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Discount on the whole sale, entered by the staff member at the till. It's
 * saved with the sale along with the reason and who gave it, and printed on
 * the receipt.
 */
export function DiscountDialog({
  saleTotal,
  staffName,
  onApply,
  onClose,
}: {
  saleTotal: number;
  staffName: string;
  onApply: (d: AppliedDiscount) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"amount" | "percent">("amount");
  const [value, setValue] = useState("");
  const [reasonChoice, setReasonChoice] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  const num = Number(value) || 0;
  const amount = round2(mode === "percent" ? (saleTotal * Math.min(num, 100)) / 100 : num);
  const reason = reasonChoice === "Other" ? otherReason.trim() : reasonChoice;
  const tooMuch = amount > saleTotal;
  const ready = amount > 0 && !tooMuch && reason.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    onApply({ amount, reason, label: mode === "percent" ? `${num}%` : formatCedis(amount) });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brown/60 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Add a discount"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        e.stopPropagation(); // keep the till's shortcuts and scanner out of this form
      }}
    >
      <form
        onSubmit={submit}
        className="flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between border-b border-rose/15 px-5 py-4">
          <div>
            <p className="eyebrow">Discount on this sale</p>
            <p className="mt-0.5 text-sm text-taupe">Sale total {formatCedis(saleTotal)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-taupe hover:bg-cream"
            aria-label="Close"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="disc-value" className="field-label">
                Discount
              </label>
              <div className="inline-flex rounded-lg bg-cream p-0.5 text-sm" role="radiogroup" aria-label="Discount type">
                {(["amount", "percent"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-md px-3 py-1 font-medium ${mode === m ? "bg-white text-brown shadow-sm" : "text-taupe"}`}
                  >
                    {m === "amount" ? "GH₵" : "%"}
                  </button>
                ))}
              </div>
            </div>
            <input
              ref={firstField}
              id="disc-value"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder={mode === "amount" ? "e.g. 20" : "e.g. 10"}
              className="field-input mt-1.5 text-lg"
              autoComplete="off"
            />
            {amount > 0 && (
              <p className={`mt-1.5 text-sm ${tooMuch ? "text-red-600" : "text-taupe"}`}>
                {tooMuch
                  ? "That's more than the sale."
                  : `Customer pays ${formatCedis(round2(saleTotal - amount))} instead of ${formatCedis(saleTotal)}.`}
              </p>
            )}
          </div>

          <div>
            <p className="field-label">Reason</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {[...REASONS, "Other"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReasonChoice(r)}
                  aria-pressed={reasonChoice === r}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    reasonChoice === r ? "border-brown bg-brown text-cream" : "border-rose/30 text-brown hover:border-rose"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {reasonChoice === "Other" && (
              <input
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Why is the discount given?"
                maxLength={120}
                className="field-input mt-2"
                aria-label="Other reason"
              />
            )}
          </div>

          <p className="text-xs text-taupe">
            Saved with the sale under your name ({staffName}) and shown on the receipt and in the reports.
          </p>
        </div>

        <div className="border-t border-rose/15 px-5 py-4">
          <button
            type="submit"
            disabled={!ready}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brown text-base font-semibold text-cream hover:bg-[#4a3d3b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <BadgePercent size={18} aria-hidden />
            Apply discount
          </button>
        </div>
      </form>
    </div>
  );
}
