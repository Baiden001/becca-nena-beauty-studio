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

export interface PaymentResult {
  method: PaymentMethod;
  /** Cash only: what the customer handed over. */
  tendered: number | null;
  /** Non-cash only: MoMo / card / transfer reference, saved with the sale notes. */
  reference: string;
}

/** Banknote-style amounts just above the total: what customers usually hand over. */
function quickCash(total: number): number[] {
  const steps = [5, 10, 20, 50, 100, 200, 500];
  const out = new Set<number>();
  for (const s of steps) {
    const v = Math.ceil(total / s) * s;
    if (v > total) out.add(v);
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
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  /** Cash typed on the keypad, as text so "50." can be mid-entry. Empty = exact amount. */
  const [entry, setEntry] = useState("");
  const [reference, setReference] = useState("");
  const [scanWarning, setScanWarning] = useState(false);

  const tendered = entry ? Number(entry) : total;
  const change = method === "cash" ? Math.max(0, tendered - total) : 0;
  const short = method === "cash" && tendered < total;
  const canConfirm = Boolean(method) && !short && !busy && online;
  const quick = useMemo(() => quickCash(total), [total]);

  // Take keyboard focus away from the sale screen's search box behind us.
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const state = useRef({ method, entry, canConfirm, reference });
  state.current = { method, entry, canConfirm, reference };

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

  function confirm() {
    const s = state.current;
    if (!s.canConfirm || !s.method) return;
    onConfirm({
      method: s.method,
      tendered: s.method === "cash" ? (s.entry ? Number(s.entry) : null) : null,
      reference: s.method === "cash" ? "" : s.reference.trim(),
    });
  }

  // Keyboard: 1-5 pick a method (until cash is chosen), digits type cash,
  // Enter completes, Esc goes back. A barcode scanner types very fast and ends
  // with Enter; that burst must NOT complete the payment, so it's undone.
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
          // scanner burst: put the cash amount back and warn
          if (burstStart !== null) setEntry(burstStart);
          burstStart = null;
          setScanWarning(true);
          return;
        }
        burstStart = null;
        confirm();
        return;
      }
      if (typing) return;
      if (!fast) burstStart = s.entry;

      if (!s.method || s.method !== "cash") {
        const m = PAYMENT_METHODS.find((pm) => pm.key === e.key);
        if (m && !fast) {
          e.preventDefault();
          setMethod(m.value);
          return;
        }
      }
      if (s.method === "cash") {
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
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keyBtn =
    "flex h-14 items-center justify-center rounded-xl bg-cream text-xl font-semibold text-brown transition active:scale-95 hover:bg-rose-light/40";

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
        <div className="flex items-center justify-between border-b border-rose/15 px-5 py-4 sm:px-6">
          <div>
            <p className="eyebrow">Take payment · {itemCount} item{itemCount === 1 ? "" : "s"}</p>
            <p className="font-serif text-3xl text-brown sm:text-4xl">{formatCedis(total)}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 w-11 items-center justify-center rounded-full text-taupe hover:bg-cream hover:text-brown"
            aria-label="Back to sale (Esc)"
          >
            <X size={22} aria-hidden />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-y-auto sm:grid-cols-2">
          {/* Methods */}
          <div className="border-b border-rose/10 p-5 sm:border-b-0 sm:border-r sm:p-6">
            <p className="field-label mb-3">Payment method</p>
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
                    onClick={() => {
                      setMethod(m.value);
                      setScanWarning(false);
                    }}
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
          </div>

          {/* Amount */}
          <div className="p-5 sm:p-6">
            {method === "cash" ? (
              <div>
                <div className="flex items-end justify-between rounded-xl bg-cream px-4 py-3">
                  <span className="text-sm text-taupe">Cash received</span>
                  <span className="font-serif text-3xl tabular-nums text-brown">
                    {entry ? formatCedis(Number(entry)) : formatCedis(total)}
                    {!entry && <span className="ml-1.5 align-middle text-xs font-sans text-taupe">exact</span>}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <button type="button" onClick={() => setEntry("")} className="rounded-lg border border-rose/30 py-2 text-sm font-medium text-brown hover:border-rose">
                    Exact
                  </button>
                  {quick.map((q) => (
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

                <div
                  className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ${
                    short ? "bg-red-50 text-red-700" : "bg-sage/20 text-brown"
                  }`}
                >
                  <span className="text-sm font-medium">{short ? "Still to pay" : "Change due"}</span>
                  <span className="font-serif text-3xl tabular-nums">
                    {formatCedis(short ? total - tendered : change)}
                  </span>
                </div>
              </div>
            ) : method ? (
              <div>
                <label htmlFor="pay-ref" className="field-label">
                  Transaction reference <span className="font-normal text-taupe">(optional)</span>
                </label>
                <input
                  id="pay-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={method === "mobile_money" ? "MoMo transaction ID" : "Reference or last 4 digits"}
                  autoComplete="off"
                  className="field-input mt-1.5"
                />
                <p className="field-hint">Saved with the sale so it can be matched to your statement.</p>
                <div className="mt-6 rounded-xl bg-cream px-4 py-4 text-sm text-taupe">
                  Confirm the customer&apos;s payment of{" "}
                  <strong className="text-brown">{formatCedis(total)}</strong> has gone through before completing
                  the sale.
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-40 items-center justify-center rounded-xl border-2 border-dashed border-rose/20 p-6 text-center text-sm text-taupe">
                Choose how the customer is paying.
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
            onClick={confirm}
            disabled={!canConfirm}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-brown text-lg font-semibold text-cream transition hover:bg-[#4a3d3b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? "Completing sale…"
              : method === "cash" && change > 0
                ? `Complete sale · give ${formatCedis(change)} change`
                : `Complete sale · ${formatCedis(total)}`}
            {!busy && <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 text-xs md:inline">Enter</kbd>}
          </button>
        </div>
      </div>
    </div>
  );
}
