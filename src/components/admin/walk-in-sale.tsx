"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Minus, Plus, Printer, ScanBarcode, X } from "lucide-react";
import {
  lookupProducts,
  recordWalkInSale,
  type SaleProduct,
} from "@/app/actions/admin/walk-in";
import { beep } from "@/lib/beep";
import { formatCedis } from "@/lib/pricing";
import type { PaymentMethod } from "@/types/database";

interface Line {
  product: SaleProduct;
  quantity: number;
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Card" },
  { value: "pos_terminal", label: "POS terminal" },
  { value: "bank_transfer", label: "Bank transfer" },
];

export function WalkInSale({ staffName }: { staffName: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SaleProduct[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{
    orderId: string;
    orderNumber: string;
    total: number;
    method: string;
    paidAt: Date;
    items: { name: string; quantity: number; price: number }[];
  } | null>(null);

  // Always-current copy of the items, so scans that arrive back to back
  // never read a stale list.
  const linesRef = useRef<Line[]>([]);
  linesRef.current = lines;

  const inputRef = useRef<HTMLInputElement>(null);
  const focusScanner = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    focusScanner();
  }, [focusScanner, receipt]);

  // Suggestions while typing a name. Number-only text looks like a barcode,
  // so those wait for Enter (which is what the scanner sends).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || /^\d+$/.test(q)) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await lookupProducts(q);
      if (res.ok) setResults(res.results);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function addProduct(product: SaleProduct) {
    const existing = linesRef.current.find((l) => l.product.id === product.id);
    const nextQty = (existing?.quantity ?? 0) + 1;

    if (product.stock < 1) {
      setError(`${product.name} is out of stock.`);
      beep(false);
    } else if (nextQty > product.stock) {
      setError(`Only ${product.stock} of ${product.name} in stock.`);
      beep(false);
    } else {
      setError(null);
      setLines((current) =>
        existing
          ? current.map((l) =>
              l.product.id === product.id ? { ...l, quantity: nextQty } : l
            )
          : [...current, { product, quantity: 1 }]
      );
      beep(true);
    }

    setQuery("");
    setResults([]);
    focusScanner();
  }

  // One entry point for everything that looks like a scan.
  const processCode = useCallback(async (code: string) => {
    const q = code.trim();
    if (!q) return;
    setError(null);

    const res = await lookupProducts(q);
    if (!res.ok) {
      setError(res.error ?? "Search failed.");
      beep(false);
      return;
    }
    if (res.exact) {
      addProduct(res.exact);
      return;
    }
    setResults(res.results);
    if (res.results.length === 0) {
      setError(`Nothing found for "${q}". Check the barcode on the product page.`);
      beep(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    void processCode(query);
  }

  // Scanner capture. A scanner "types" the barcode very fast and finishes
  // with Enter. If that happens while focus is NOT in a text box (for
  // example right after tapping a payment button), catch it here so the scan
  // still lands in this sale. Enter is cancelled so it can't press a button.
  useEffect(() => {
    if (receipt) return;
    let buffer = "";
    let lastKey = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return; // the focused field handles its own typing
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();
      if (now - lastKey > 60) buffer = ""; // slower than a scanner: a person typing
      lastKey = now;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          e.preventDefault();
          const code = buffer;
          buffer = "";
          void processCode(code);
        }
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [receipt, processCode]);

  function setQuantity(productId: string, quantity: number) {
    setLines((current) =>
      current.map((l) => {
        if (l.product.id !== productId) return l;
        const clamped = Math.max(1, Math.min(quantity || 1, l.product.stock));
        return { ...l, quantity: clamped };
      })
    );
    focusScanner();
  }

  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  async function handleRecord() {
    if (!method) {
      setError("Choose how the customer paid.");
      return;
    }
    setBusy(true);
    setError(null);

    const result = await recordWalkInSale({
      lines: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      paymentMethod: method,
      customerName,
      customerPhone,
      notes,
    });

    setBusy(false);

    if (!result.ok || !result.orderId || !result.orderNumber) {
      setError(result.error ?? "Could not record the sale.");
      return;
    }

    setReceipt({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      total: result.total ?? total,
      method: METHODS.find((m) => m.value === method)?.label ?? "",
      paidAt: new Date(),
      items: lines.map((l) => ({
        name: `${l.product.brand ? `${l.product.brand} ` : ""}${l.product.name}`,
        quantity: l.quantity,
        price: l.product.price,
      })),
    });
  }

  function startNewSale() {
    setLines([]);
    setMethod(null);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setError(null);
    setReceipt(null);
  }

  if (receipt) {
    return (
      <div className="rounded-md border border-rose/20 bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto text-sage" size={36} strokeWidth={1.5} aria-hidden />
        <p className="eyebrow mt-4">Sale recorded</p>
        <h2 className="mt-1 font-serif text-3xl text-brown">#{receipt.orderNumber}</h2>
        <p className="mt-3 text-lg text-brown">{formatCedis(receipt.total)}</p>
        <p className="text-sm text-taupe">
          Paid by {receipt.method.toLowerCase()} · recorded by {staffName}
        </p>
        <p className="mt-1 text-sm text-taupe">Stock has been updated.</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={startNewSale}
            className="rounded-full bg-brown px-6 py-2.5 text-sm font-medium text-cream hover:bg-rose"
          >
            New sale
          </button>
          <button
            onClick={() => printReceipt(receipt, staffName)}
            className="inline-flex items-center gap-2 rounded-full border border-brown/40 px-6 py-2.5 text-sm font-medium text-brown hover:border-rose hover:text-rose"
          >
            <Printer size={16} aria-hidden />
            Print receipt
          </button>
          <Link
            href={`/admin/orders/${receipt.orderId}`}
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
      {/* Scan or search */}
      <form onSubmit={handleScan} className="relative">
        <label htmlFor="scan" className="field-label">
          Scan barcode or search by name
        </label>
        <div className="relative">
          <ScanBarcode
            size={18}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe"
            aria-hidden
          />
          <input
            id="scan"
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            placeholder="Scan now, or type a product name"
            className="field-input w-full pl-10"
          />
        </div>

        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full divide-y divide-rose/10 overflow-hidden rounded-md border border-rose/20 bg-white shadow-lg">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addProduct(p)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm hover:bg-rose-light/20"
                >
                  <span className="text-brown">
                    {p.brand ? `${p.brand} ` : ""}
                    {p.name}
                  </span>
                  <span className="shrink-0 text-taupe">
                    {formatCedis(p.price)} · {p.stock} in stock
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Items */}
      <div className="rounded-md border border-rose/20 bg-white">
        {lines.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-taupe">
            No items yet. Scan a product to begin.
          </p>
        ) : (
          <ul className="divide-y divide-rose/10">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-brown">
                    {product.brand ? `${product.brand} ` : ""}
                    {product.name}
                  </p>
                  <p className="text-xs text-taupe">
                    {formatCedis(product.price)} each · {product.stock} in stock
                  </p>
                </div>

                <div className="flex items-center rounded-full border border-rose/30">
                  <button
                    type="button"
                    aria-label={`Decrease ${product.name}`}
                    onClick={() => setQuantity(product.id, quantity - 1)}
                    className="px-2.5 py-1.5 text-brown hover:text-rose"
                  >
                    <Minus size={14} aria-hidden />
                  </button>
                  <input
                    aria-label={`Quantity of ${product.name}`}
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setQuantity(product.id, Number(e.target.value))}
                    onBlur={focusScanner}
                    className="w-9 bg-transparent text-center text-sm text-brown outline-none"
                  />
                  <button
                    type="button"
                    aria-label={`Increase ${product.name}`}
                    onClick={() => setQuantity(product.id, quantity + 1)}
                    className="px-2.5 py-1.5 text-brown hover:text-rose"
                  >
                    <Plus size={14} aria-hidden />
                  </button>
                </div>

                <p className="w-24 text-right text-sm font-medium text-brown">
                  {formatCedis(product.price * quantity)}
                </p>

                <button
                  type="button"
                  aria-label={`Remove ${product.name}`}
                  onClick={() => {
                    setLines((c) => c.filter((l) => l.product.id !== product.id));
                    focusScanner();
                  }}
                  className="text-taupe hover:text-red-500"
                >
                  <X size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-rose/20 px-5 py-4">
          <span className="text-sm text-taupe">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
          <span className="font-serif text-2xl text-brown">{formatCedis(total)}</span>
        </div>
      </div>

      {/* Payment */}
      <div>
        <p className="field-label">How did the customer pay?</p>
        <div role="radiogroup" aria-label="Payment method" className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={method === m.value}
              onClick={() => {
                setMethod(m.value);
                focusScanner();
              }}
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

      {/* Optional details */}
      <details className="rounded-md border border-rose/20 bg-white p-4">
        <summary className="cursor-pointer text-sm text-brown">
          Customer details and notes (optional)
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cname" className="field-label">Customer name</label>
            <input
              id="cname"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="field-input w-full"
            />
          </div>
          <div>
            <label htmlFor="cphone" className="field-label">Phone</label>
            <input
              id="cphone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              inputMode="tel"
              className="field-input w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="field-label">Notes</label>
            <input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field-input w-full"
            />
          </div>
        </div>
      </details>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-taupe">Recording as {staffName}</p>
        <button
          type="button"
          onClick={handleRecord}
          disabled={busy || lines.length === 0}
          className="rounded-full bg-rose px-8 py-3 text-sm font-medium text-cream transition-colors hover:bg-brown disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Recording…" : `Record sale · ${formatCedis(total)}`}
        </button>
      </div>
    </div>
  );
}

interface ReceiptData {
  orderNumber: string;
  total: number;
  method: string;
  paidAt: Date;
  items: { name: string; quantity: number; price: number }[];
}

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Prints a narrow till-style receipt through the browser's print dialog
// (works with a normal printer or a receipt printer installed on the device).
function printReceipt(r: ReceiptData, staffName: string) {
  const rows = r.items
    .map(
      (i) =>
        `<tr><td colspan="2">${escapeHtml(i.name)}</td></tr>
         <tr><td class="dim">${i.quantity} x ${escapeHtml(formatCedis(i.price))}</td><td class="r">${escapeHtml(formatCedis(i.price * i.quantity))}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(r.orderNumber)}</title>
<style>
  @page { margin: 6mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; width: 70mm; margin: 0 auto; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
  .c { text-align: center; } .r { text-align: right; } .dim { color: #444; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td { padding: 2px 0; vertical-align: top; }
  hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
  .total td { font-size: 14px; font-weight: bold; padding-top: 6px; }
</style></head><body>
  <h1>Becca Nena Beauty Studio</h1>
  <p class="c dim">@the.bnb.studio</p>
  <hr>
  <p>Receipt #${escapeHtml(r.orderNumber)}<br>${escapeHtml(r.paidAt.toLocaleString())}</p>
  <table>${rows}</table>
  <hr>
  <table><tr class="total"><td>Total</td><td class="r">${escapeHtml(formatCedis(r.total))}</td></tr></table>
  <p>Paid by: ${escapeHtml(r.method)}<br>Served by: ${escapeHtml(staffName)}</p>
  <hr>
  <p class="c">Thank you for shopping with us.</p>
</body></html>`;

  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 2000);
}
