"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  findSaleForReturn,
  recordReturn,
  type RecordReturnResult,
  type ReturnableSale,
} from "@/app/actions/admin/returns";
import { formatCedis } from "@/lib/pricing";
import type { PaymentMethod } from "@/types/database";

export interface RecentSale {
  orderNumber: string;
  total: number;
  createdAt: string;
  channel: "online" | "walk_in";
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Card" },
  { value: "pos_terminal", label: "POS terminal" },
  { value: "bank_transfer", label: "Bank transfer" },
];

const REASONS = ["Changed their mind", "Faulty or damaged", "Wrong item", "Other"];

export function ReturnForm({
  staffName,
  recent,
  initialOrder,
}: {
  staffName: string;
  recent: RecentSale[];
  initialOrder: string;
}) {
  const [orderInput, setOrderInput] = useState(initialOrder);
  const [sale, setSale] = useState<ReturnableSale | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>({});
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<RecordReturnResult | null>(null);

  async function loadSale(number: string) {
    setError(null);
    setSale(null);
    setBusy(true);
    const res = await findSaleForReturn(number);
    setBusy(false);
    if (!res.ok || !res.sale) {
      setError(res.error ?? "Could not find that sale.");
      return;
    }
    setSale(res.sale);
    setQty({});
    setRestock(Object.fromEntries(res.sale.items.map((i) => [i.orderItemId, true])));
    setMethod(res.sale.channel === "walk_in" ? res.sale.paymentMethod : null);
    setReason("");
    setNotes("");
  }

  // Arriving from a sale's page with the number already filled in.
  useEffect(() => {
    if (initialOrder) void loadSale(initialOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refundTotal = sale
    ? sale.items.reduce((sum, i) => sum + (qty[i.orderItemId] ?? 0) * i.unitPrice, 0)
    : 0;
  const anySelected = sale ? sale.items.some((i) => (qty[i.orderItemId] ?? 0) > 0) : false;

  function setItemQty(itemId: string, value: number, max: number) {
    setQty((q) => ({ ...q, [itemId]: Math.max(0, Math.min(Number.isFinite(value) ? value : 0, max)) }));
  }

  async function handleRecord() {
    if (!sale) return;
    if (!anySelected) return setError("Choose at least one item to return.");
    if (!reason) return setError("Choose a reason for the return.");
    if (!method) return setError("Choose how the refund is paid.");

    setBusy(true);
    setError(null);
    const result = await recordReturn({
      orderId: sale.orderId,
      lines: sale.items
        .filter((i) => (qty[i.orderItemId] ?? 0) > 0)
        .map((i) => ({
          orderItemId: i.orderItemId,
          quantity: qty[i.orderItemId],
          restock: restock[i.orderItemId] ?? true,
        })),
      refundMethod: method,
      reason,
      notes,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Could not record the return.");
      return;
    }
    setDone(result);
  }

  function reset() {
    setDone(null);
    setSale(null);
    setOrderInput("");
    setError(null);
  }

  if (done && sale) {
    return (
      <div className="rounded-md border border-rose/20 bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto text-sage" size={36} strokeWidth={1.5} aria-hidden />
        <p className="eyebrow mt-4">Return recorded</p>
        <h2 className="mt-1 font-serif text-3xl text-brown">{done.returnNumber}</h2>
        <p className="mt-3 text-lg text-brown">Refund {formatCedis(done.refundTotal ?? 0)}</p>
        <p className="text-sm text-taupe">
          Refund method: {METHODS.find((m) => m.value === method)?.label.toLowerCase()} · recorded by{" "}
          {staffName}
        </p>
        <p className="mt-1 text-sm text-taupe">
          {done.restockedUnits
            ? `${done.restockedUnits} item${done.restockedUnits === 1 ? "" : "s"} put back in stock.`
            : "Nothing was put back in stock."}
        </p>
        {sale.channel === "online" && (
          <p className="mx-auto mt-4 max-w-md rounded-lg bg-rose-light/30 px-4 py-3 text-sm text-brown">
            This was an online payment. Remember to refund the customer in your Paystack dashboard
            too. This screen records the return and restocks, but does not move money.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-brown px-6 py-2.5 text-sm font-medium text-cream hover:bg-rose"
          >
            New return
          </button>
          <Link
            href={`/admin/orders/${sale.orderId}`}
            className="rounded-full border border-brown/40 px-6 py-2.5 text-sm font-medium text-brown hover:border-rose hover:text-rose"
          >
            View sale
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Find the sale */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void loadSale(orderInput);
        }}
      >
        <label htmlFor="order" className="field-label">
          Receipt number
        </label>
        <div className="flex gap-3">
          <input
            id="order"
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            placeholder="For example BN-1052"
            autoComplete="off"
            className="field-input flex-1"
          />
          <button
            type="submit"
            disabled={busy || !orderInput.trim()}
            className="rounded-full bg-brown px-6 py-2.5 text-sm font-medium text-cream hover:bg-rose disabled:opacity-50"
          >
            Find sale
          </button>
        </div>
      </form>

      {!sale && recent.length > 0 && (
        <div>
          <p className="field-label">Or pick a recent sale</p>
          <ul className="divide-y divide-rose/10 rounded-md border border-rose/20 bg-white">
            {recent.map((r) => (
              <li key={r.orderNumber}>
                <button
                  type="button"
                  onClick={() => {
                    setOrderInput(r.orderNumber);
                    void loadSale(r.orderNumber);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-rose-light/20"
                >
                  <span className="text-brown">
                    #{r.orderNumber}
                    <span className="ml-2 text-xs text-taupe">
                      {r.channel === "walk_in" ? "In store" : "Online"}
                    </span>
                  </span>
                  <span className="text-taupe">
                    {formatCedis(r.total)} · {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      {sale && (
        <>
          <div className="rounded-md border border-rose/20 bg-white">
            <div className="border-b border-rose/10 px-5 py-3">
              <p className="font-medium text-brown">
                Sale #{sale.orderNumber}{" "}
                <span className="text-xs font-normal text-taupe">
                  {sale.channel === "walk_in" ? "In store" : "Online"} ·{" "}
                  {new Date(sale.createdAt).toLocaleString()}
                  {sale.customerName ? ` · ${sale.customerName}` : ""}
                </span>
              </p>
            </div>

            <ul className="divide-y divide-rose/10">
              {sale.items.map((item) => {
                const remaining = item.soldQuantity - item.returnedQuantity;
                const selected = qty[item.orderItemId] ?? 0;
                return (
                  <li key={item.orderItemId} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-brown">{item.name}</p>
                        <p className="text-xs text-taupe">
                          Sold {item.soldQuantity} at {formatCedis(item.unitPrice)}
                          {item.returnedQuantity > 0 ? ` · ${item.returnedQuantity} already returned` : ""}
                        </p>
                      </div>

                      {remaining > 0 ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <label className="text-xs text-taupe" htmlFor={`q-${item.orderItemId}`}>
                            Return
                          </label>
                          <input
                            id={`q-${item.orderItemId}`}
                            type="number"
                            min={0}
                            max={remaining}
                            inputMode="numeric"
                            value={selected}
                            onChange={(e) => setItemQty(item.orderItemId, Number(e.target.value), remaining)}
                            className="field-input w-16 text-center"
                          />
                          <span className="text-xs text-taupe">of {remaining}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-taupe">Fully returned</span>
                      )}
                    </div>

                    {selected > 0 && (
                      <label className="mt-3 flex items-center gap-2 text-sm text-brown">
                        <input
                          type="checkbox"
                          checked={restock[item.orderItemId] ?? true}
                          onChange={(e) =>
                            setRestock((r) => ({ ...r, [item.orderItemId]: e.target.checked }))
                          }
                        />
                        Put back in stock (untick if damaged or can&apos;t be resold)
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-rose/20 px-5 py-4">
              <span className="text-sm text-taupe">Refund total</span>
              <span className="font-serif text-2xl text-brown">{formatCedis(refundTotal)}</span>
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="field-label">
              Reason
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="field-input w-full"
            >
              <option value="">Choose a reason</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="field-label">How is the refund paid?</p>
            <div role="radiogroup" aria-label="Refund method" className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={method === m.value}
                  onClick={() => setMethod(m.value)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    method === m.value
                      ? "border-brown bg-brown text-cream"
                      : "border-rose/30 text-brown hover:border-rose"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {sale.channel === "online" && (
            <p className="rounded-lg bg-rose-light/30 px-4 py-3 text-sm text-brown">
              This was an online payment. After recording the return, refund the customer in your
              Paystack dashboard too. This screen records the return and restocks, but does not move
              money.
            </p>
          )}

          <div>
            <label htmlFor="notes" className="field-label">
              Notes (optional)
            </label>
            <input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field-input w-full"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-taupe">Recording as {staffName}</p>
            <button
              type="button"
              onClick={handleRecord}
              disabled={busy || !anySelected}
              className="rounded-full bg-rose px-8 py-3 text-sm font-medium text-cream transition-colors hover:bg-brown disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Recording…" : `Record return · ${formatCedis(refundTotal)}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
