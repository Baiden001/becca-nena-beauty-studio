"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ScanBarcode, SkipForward } from "lucide-react";
import { assignBarcode, clearBarcode } from "@/app/actions/admin/barcodes";
import { beep } from "@/lib/beep";

export interface BarcodeProduct {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
}

const label = (p: BarcodeProduct) => `${p.brand ? `${p.brand} ` : ""}${p.name}`;

export function BarcodeAssigner({ initialProducts }: { initialProducts: BarcodeProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [currentId, setCurrentId] = useState<string | null>(
    initialProducts.find((p) => !p.barcode)?.id ?? null
  );
  const [code, setCode] = useState("");
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusScan = useCallback(() => inputRef.current?.focus(), []);
  useEffect(() => focusScan(), [focusScan, currentId]);

  const current = products.find((p) => p.id === currentId) ?? null;
  const doneCount = products.filter((p) => p.barcode).length;

  // The next product after `fromId` that still has no barcode (wrapping round).
  const nextMissing = useCallback(
    (list: BarcodeProduct[], fromId: string | null) => {
      const start = Math.max(0, list.findIndex((p) => p.id === fromId));
      for (let step = 1; step <= list.length; step++) {
        const candidate = list[(start + step) % list.length];
        if (!candidate.barcode && candidate.id !== fromId) return candidate.id;
      }
      return null;
    },
    []
  );

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const scanned = code.trim();
    if (!scanned || !current || busy) return;

    setBusy(true);
    const result = await assignBarcode(current.id, scanned);
    setBusy(false);
    setCode("");

    if (!result.ok) {
      beep(false);
      setMessage({ kind: "error", text: result.error ?? "Could not save the barcode." });
      if (result.conflict) setCurrentId(result.conflict.id); // jump to the product that owns it
      focusScan();
      return;
    }

    beep(true);
    const updated = products.map((p) => (p.id === current.id ? { ...p, barcode: scanned } : p));
    setProducts(updated);
    setMessage({ kind: "ok", text: `Saved for ${label(current)}.` });
    setCurrentId(nextMissing(updated, current.id));
  }

  function skip() {
    setMessage(null);
    setCurrentId(nextMissing(products, currentId));
  }

  async function handleClear(p: BarcodeProduct) {
    const result = await clearBarcode(p.id);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error ?? "Could not clear it." });
      return;
    }
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, barcode: null } : x)));
    setCurrentId(p.id);
    setMessage({ kind: "ok", text: `Barcode removed from ${label(p)}. Scan the right one.` });
  }

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? products.filter((p) => label(p).toLowerCase().includes(q)) : products;
  }, [products, filter]);

  const allDone = doneCount === products.length && products.length > 0;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-sm text-taupe">
          <span>
            {doneCount} of {products.length} products have a barcode
          </span>
          <span>{products.length - doneCount} to go</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-rose-light/40">
          <div
            className="h-full bg-rose transition-all"
            style={{ width: `${products.length ? (doneCount / products.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* The scan card */}
      <div className="rounded-md border border-rose/20 bg-white p-6 text-center">
        {allDone && !current ? (
          <>
            <Check className="mx-auto text-sage" size={32} strokeWidth={1.75} aria-hidden />
            <h2 className="mt-3 font-serif text-2xl text-brown">Every product has a barcode</h2>
            <p className="mt-1 text-sm text-taupe">You can start selling on the Walk-in sale screen.</p>
          </>
        ) : current ? (
          <form onSubmit={handleScan}>
            <p className="eyebrow">Scan the barcode for</p>
            <h2 className="mt-2 font-serif text-2xl leading-snug text-brown">{label(current)}</h2>
            {current.barcode && (
              <p className="mt-1 text-xs text-taupe">Current barcode: {current.barcode}</p>
            )}

            <div className="relative mx-auto mt-5 max-w-sm">
              <ScanBarcode
                size={18}
                strokeWidth={1.75}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe"
                aria-hidden
              />
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                placeholder="Scan now"
                aria-label="Barcode"
                className="field-input w-full pl-10 text-center"
              />
            </div>

            <div className="mt-4 flex justify-center gap-3">
              <button
                type="submit"
                disabled={busy || !code.trim()}
                className="rounded-full bg-rose px-6 py-2.5 text-sm font-medium text-cream hover:bg-brown disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save barcode"}
              </button>
              <button
                type="button"
                onClick={skip}
                className="inline-flex items-center gap-2 rounded-full border border-brown/40 px-5 py-2.5 text-sm font-medium text-brown hover:border-rose hover:text-rose"
              >
                <SkipForward size={16} aria-hidden />
                Skip
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-taupe">Pick a product from the list to scan its barcode.</p>
        )}

        {message && (
          <p
            className={`mt-4 rounded-lg px-4 py-2 text-sm ${
              message.kind === "ok"
                ? "bg-sage/20 text-brown"
                : "border border-red-200 bg-red-50 text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* All products */}
      <div>
        <label htmlFor="filter" className="field-label">
          Find a product
        </label>
        <input
          id="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Type to filter the list"
          className="field-input w-full"
        />

        <ul className="mt-3 divide-y divide-rose/10 rounded-md border border-rose/20 bg-white">
          {visible.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 text-sm ${
                p.id === currentId ? "bg-rose-light/20" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setCurrentId(p.id);
                  setMessage(null);
                  setCode("");
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-brown">{label(p)}</span>
                <span className="block text-xs text-taupe">
                  {p.barcode ? `Barcode: ${p.barcode}` : "No barcode yet"}
                </span>
              </button>
              {p.barcode ? (
                <>
                  <Check size={16} className="text-sage" aria-label="Has a barcode" />
                  <button
                    type="button"
                    onClick={() => handleClear(p)}
                    className="text-xs text-taupe underline underline-offset-2 hover:text-red-500"
                  >
                    Remove
                  </button>
                </>
              ) : null}
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-taupe">No products match.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
