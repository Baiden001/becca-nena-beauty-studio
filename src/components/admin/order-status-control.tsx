"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/app/actions/admin/orders";
import type { OrderStatus } from "@/types/database";

const STATUSES: OrderStatus[] = [
  "new",
  "contacted",
  "confirmed",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
];

export function OrderStatusControl({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: OrderStatus) {
    setSaving(true);
    setError(null);
    const result = await updateOrderStatus(orderId, next);
    setSaving(false);

    if (!result.ok) {
      setError(result.error || "Could not update status.");
      return;
    }
    setStatus(next);
    router.refresh();
  }

  return (
    <div>
      <label htmlFor="order-status" className="field-label">
        Status
      </label>
      <select
        id="order-status"
        value={status}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value as OrderStatus)}
        className="field-select mt-1.5 capitalize"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {status === "confirmed" && (
        <p className="field-hint">
          Confirming deducts these items from stock.
        </p>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
