"use client";

import { useState } from "react";
import { retryPayment } from "@/app/actions/orders";

export function RetryPaymentButton({ orderNumber }: { orderNumber: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const result = await retryPayment(orderNumber);
    if (result.ok && result.paymentUrl) {
      window.location.href = result.paymentUrl;
      return;
    }
    if (result.ok) {
      window.location.reload(); // already paid
      return;
    }
    setError(result.error || "Something went wrong. Please try again.");
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded-full bg-brown px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-rose disabled:opacity-60"
      >
        {busy ? "Opening payment…" : "Pay now"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
