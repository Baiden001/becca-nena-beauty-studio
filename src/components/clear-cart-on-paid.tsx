"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

const LAST_CLEARED_KEY = "becca-nena-last-cleared-order";

/**
 * Rendered only once payment is confirmed, so an abandoned payment keeps the
 * cart. Empties the cart once per paid order: opening the same confirmation
 * link again later won't wipe a new basket.
 */
export function ClearCartOnPaid({ orderNumber }: { orderNumber: string }) {
  const { clear } = useCart();

  useEffect(() => {
    try {
      if (window.localStorage.getItem(LAST_CLEARED_KEY) === orderNumber) return;
      window.localStorage.setItem(LAST_CLEARED_KEY, orderNumber);
    } catch {
      // Storage unavailable: clear anyway.
    }
    clear();
  }, [clear, orderNumber]);

  return null;
}
