"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adjustStock } from "@/app/actions/admin/products";

export function StockAdjustForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await adjustStock(productId, Number(quantity), reason);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || "Could not adjust stock.");
      return;
    }
    setQuantity("");
    setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="stock-quantity" className="field-label">Quantity (+/−)</label>
        <input
          id="stock-quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="e.g. 20 or -2"
          className="field-input-sm mt-1.5 w-28"
        />
      </div>
      <div className="flex-1">
        <label htmlFor="stock-reason" className="field-label">Reason</label>
        <input
          id="stock-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Stock received, Damaged item"
          className="field-input-sm mt-1.5 w-full"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-rose px-4 py-2 text-xs font-medium text-cream shadow-sm transition-colors hover:bg-brown disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Apply"}
      </button>
      {error && <p className="w-full field-error">{error}</p>}
    </form>
  );
}
