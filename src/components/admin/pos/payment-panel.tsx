"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Building2, CreditCard, Delete, Smartphone, X, type LucideIcon } from "lucide-react";
import { formatCedis } from "@/lib/pricing";
import type { PaymentMethod } from "@/types/database";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: LucideIcon; key: string }[] = [
  { value: "cash", label: "Cash", icon: Banknote, key: "1" },
  { value: "mobile_money", label: "Mobile Money", icon: Smartphone, key: "2" },
  { value: "card", label: "Card", icon: CreditCard, key: "3" },
  { value: "pos_terminal", label: "POS terminal", icon: CreditCard, key: "4" },
  { value: "bank_transfer", label: "Bank transfer", icon: Building2, key: "5" },
];

export const methodLabel = (m: PaymentMethod) => PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m;

export interface PaymentPart {
  method: PaymentMethod;
  /** The part of the sale paid this way (never more than the total). */
  amount: number;
  /** MoMo transaction ID, card slip number... optional. */
  reference: string;
}

export interface PaymentResult {
  /** One part for a normal sale; several for a split payment. Adds up to the total. */
  payments: PaymentPart[];
  /** Cash handed over for the cash part, when it was more than needed (for change). */
  tendered: number | null;
  change: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Banknote-style amounts just above what's due: what customers usually hand over. */
function quickCash(due: number): number[] {
  const steps = [5, 10, 20, 50, 100, 200, 500];
  const out = new Set<number>();
  for (const s of steps) {
    const v = Math.ceil(due / s) * s;
    if (v > due) out.add(v);
  }
  return [...out].sort((a, b) => a - b).slice(0, 4);
}

export function PaymentPanel({
  total,
  itemCount,
  busy,
  error,
  online,
  onCancel,
  onConfirm,
}: {
  total: number;
  itemCount: number;
  busy: boolean;
  error: string | null;
  online: boolean;
  onCancel: () => void;
  onConfirm: (p: PaymentResult) => void;
}) {
  /** Parts already taken (split payment). */
  const [paid, setPaid] = useState<PaymentPart[]>([]);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  /** Amount typed on the keypad, as text so "50." can be mid-entry. Empty = the rest. */
  const [entry, setEntry] = useState("");
  const [reference, setReference] = useState("");
  const [scanWarning, setScanWarning] = useState(false);

  const remaining = round2(total - paid.reduce((s, p) => s + p.amount, 0));
  const amount = entry ? Number(entry) : remaining;
  const isCash = method === "cash";
  const change = isCash ? round2(Math.max(0, amount - remaining)) : 0;
  const tooMuch = !isCash && amount > remaining + 0.001;
  /** This payment covers everything that's left: the sale can be completed. */
  const finishes = Boolean(method) && amount >= remaining - 0.001 && !tooMuch;
  /** A part payment: less than what's left, so it's added and another method follows. */
  const isPart = Boolean(method) && amount > 0 && amount < remaining - 0.001;
  const canAct = !busy && online && (finishes || isPart);
  const quick = useMemo(() => quickCash(remaining), [remaining]);

  // Take keyboard focus away from the sale screen's search box behind us.
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const state = useRef({ method, entry, reference, paid, remaining, amount, finishes, isPart, canAct, change, isCash });
  state.current = { method, entry, reference, paid, remaining, amount, finishes, isPart, canAct, change, isCash };

  function press(key: string) {
    setScanWarning(false);
    setEntry((cur) => {
      if (key === "back") return cur.slice(0, -1);
      if (key === "clear") return "";
      if (key === ".") return cur.includes(".") ? cur : (cur || "0") + ".";
      const next = cur + key;
      const [, dec] = next.split(".");
      if (dec && dec.length > 2) return cur;
      if (Number(next) > 100000) return cur;
      return next.replace(/^0+(?=\d)/, "");
    });
  }

  function pickMethod(m: PaymentMethod) {
    setMethod(m);
    setScanWarning(false);
    setReference("");
  }

  /** Enter / the big button: add this part, or finish the sale. */
  function act() {
    const s = state.current;
    if (!s.canAct || !s.method) return;
    const part: PaymentPart = {
      method: s.method,
      amount: round2(Math.min(s.amount, s.remaining)),
      reference: s.isCash ? "" : s.reference.trim(),
    };
    if (s.isPart) {
      setPaid([...s.paid, part]);
      setMethod(null);
      setEntry("");
      setReference("");
      return;
    }
    onConfirm({
      payments: [...s.paid, part],
      tendered: s.isCash && s.change > 0 ? round2(s.amount) : null,
      change: s.change,
    });
  }

  function removePart(i: number) {
    setPaid((cur) => cur.filter((_, idx) => idx !== i));
  }

  // Keyboard: 1-5 pick a method (before one is chosen), digits type the
  // amount, Enter adds the part or completes, Esc goes back. A barcode scanner
  // types very fast and ends with Enter; that burst is undone, never acted on.
  useEffect(() => {
    let lastKey = 0;
    let burstStart: string | null = null;

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
      const now = Date.now();
      const fast = now - lastKey < 45;
      lastKey = now;
      const s = state.current;

      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (fast) {
          if (burstStart !== null) setEntry(burstStart);
          burstStart = null;
          setScanWarning(true);
          return;
        }
        burstStart = null;
        act();
        return;
      }
      if (typing) return;
      if (!fast) burstStart = s.entry;

      if (!s.method) {
        const m = PAYMENT_METHODS.find((pm) => pm.key === e.key);
        if (m && !fast) {
          e.preventDefault();
          pickMethod(m.value);
        }
        return;
      }
      if (/^\d$/.test(e.key) || e.key === ".") {
        e.preventDefault();
        press(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        press("back");
      } else if (e.key === "Delete") {
        e.preventDefault();
        press("clear");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keyBtn =
    "flex h-12 items-center justify-center rounded-xl bg-cream text-xl font-semibold text-brown transition active:scale-95 hover:bg-rose-light/40 sm:h-14";
  const label = method ? methodLabel(method) : "";

  let buttonText: string;
  if (busy) buttonText = "Completing sale…";
  else if (!method) buttonText = paid.length ? `Choose how the other ${formatCedis(remaining)} is paid` : "Choose a payment method";
  else if (tooMuch) buttonText = `More than the ${formatCedis(remaining)} left`;
  else if (isPart) buttonText = `Add ${formatCedis(amount)} ${label} · ${formatCedis(round2(remaining - amount))} left`;
  else if (change > 0) buttonText = `Complete sale · give ${formatCedis(change)} change`;
  else buttonText = `Complete sale · ${formatCedis(total)}`;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-brown/60 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Take payment"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-rose/15 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="eyebrow">Take payment · {itemCount} item{itemCount === 1 ? "" : "s"}</p>
            {paid.length === 0 ? (
              <p className="font-serif text-3xl text-brown sm:text-4xl">{formatCedis(total)}</p>
            ) : (
              <p className="font-serif text-3xl text-brown sm:text-4xl">
                {formatCedis(remaining)}
                <span className="ml-2 align-middle font-sans text-sm text-taupe">left of {formatCedis(total)}</span>
              </p>
            )}
            {paid.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Paid so far">
                {paid.map((p, i) => (
                  <li
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sage/25 py-1 pl-3 pr-1 text-sm text-brown"
                  >
                    {methodLabel(p.method)} {formatCedis(p.amount)}
                    <button
                      type="button"
                      onClick={() => removePart(i)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-taupe hover:bg-white hover:text-red-600"
                      aria-label={`Remove ${methodLabel(p.method)} ${formatCedis(p.amount)}`}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-taupe hover:bg-cream hover:text-brown"
            aria-label="Back to sale (Esc)"
          >
            <X size={22} aria-hidden />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-y-auto sm:grid-cols-2">
          {/* Methods */}
          <div className="border-b border-rose/10 p-5 sm:border-b-0 sm:border-r sm:p-6">
            <p className="field-label mb-3">{paid.length ? "Next payment method" : "Payment method"}</p>
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Payment method">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const active = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickMethod(m.value)}
                    className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-3.5 text-left transition ${
                      active
                        ? "border-rose bg-rose-light/40 text-brown"
                        : "border-rose/20 text-brown hover:border-rose/60"
                    } ${m.value === "cash" ? "col-span-2" : ""}`}
                  >
                    <Icon size={22} aria-hidden />
                    <span className="text-[15px] font-medium">{m.label}</span>
                    <kbd
                      className={`absolute right-2.5 top-2.5 hidden rounded px-1.5 text-[10px] font-medium md:block ${
                        active ? "bg-white text-brown" : "bg-cream text-taupe"
                      }`}
                    >
                      {m.key}
                    </kbd>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-taupe">
              <strong className="font-medium text-brown">Paying two ways?</strong> Pick the first method, type the amount
              (e.g. 100), press <em>Add</em>, then pick the next method for the rest.
            </p>
          </div>

          {/* Amount */}
          <div className="p-5 sm:p-6">
            {method ? (
              <div>
                <div className="flex items-end justify-between gap-3 rounded-xl bg-cream px-4 py-3">
                  <span className="text-sm text-taupe">{isCash ? "Cash received" : `Paid by ${label}`}</span>
                  <span className="font-serif text-3xl tabular-nums text-brown">
                    {formatCedis(amount)}
                    {!entry && (
                      <span className="ml-1.5 align-middle font-sans text-xs text-taupe">
                        {paid.length ? "the rest" : "full amount"}
                      </span>
                    )}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntry("")}
                    className="rounded-lg border border-rose/30 py-2 text-sm font-medium text-brown hover:border-rose"
                  >
                    {paid.length ? "Rest" : "Exact"}
                  </button>
                  {isCash &&
                    quick.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setEntry(String(q))}
                        className="rounded-lg border border-rose/30 py-2 text-sm font-medium text-brown hover:border-rose"
                      >
                        {formatCedis(q)}
                      </button>
                    ))}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((k) => (
                    <button key={k} type="button" onClick={() => press(k)} className={keyBtn}>
                      {k}
                    </button>
                  ))}
                  <button type="button" onClick={() => press("back")} className={keyBtn} aria-label="Delete last digit">
                    <Delete size={22} aria-hidden />
                  </button>
                </div>

                {isCash ? (
                  <div
                    className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ${
                      isPart ? "bg-amber-50 text-amber-900" : "bg-sage/20 text-brown"
                    }`}
                  >
                    <span className="text-sm font-medium">{isPart ? "Still to pay after this" : "Change due"}</span>
                    <span className="font-serif text-3xl tabular-nums">
                      {formatCedis(isPart ? round2(remaining - amount) : change)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-3">
                    {tooMuch && (
                      <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        Only {formatCedis(remaining)} is left to pay. Card, MoMo and transfers can&apos;t be more than that.
                      </p>
                    )}
                    <label htmlFor="pay-ref" className="field-label">
                      Reference <span className="font-normal text-taupe">(optional)</span>
                    </label>
                    <input
                      id="pay-ref"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={method === "mobile_money" ? "MoMo transaction ID" : "Reference or last 4 digits"}
                      autoComplete="off"
                      className="field-input mt-1.5"
                    />
                    <p className="field-hint">Check the payment has gone through before you continue.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-40 items-center justify-center rounded-xl border-2 border-dashed border-rose/20 p-6 text-center text-sm text-taupe">
                {paid.length
                  ? `Choose how the remaining ${formatCedis(remaining)} is being paid.`
                  : "Choose how the customer is paying."}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-rose/15 bg-white px-5 py-4 sm:px-6">
          {scanWarning && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              That looked like a barcode scan. Go back to the sale (Esc) to add more items.
            </p>
          )}
          {!online && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              No internet connection. The sale can be completed once the till is back online.
            </p>
          )}
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button
            type="button"
            onClick={act}
            disabled={!canAct}
            className={`flex h-14 w-full items-center justify-center gap-3 rounded-xl px-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 sm:text-lg ${
              isPart
                ? "border-2 border-brown bg-white text-brown hover:bg-cream"
                : "bg-brown text-cream hover:bg-[#4a3d3b]"
            }`}
          >
            <span className="truncate">{buttonText}</span>
            {!busy && canAct && <kbd className="hidden rounded bg-black/10 px-1.5 py-0.5 text-xs md:inline">Enter</kbd>}
          </button>
        </div>
      </div>
    </div>
  );
}
