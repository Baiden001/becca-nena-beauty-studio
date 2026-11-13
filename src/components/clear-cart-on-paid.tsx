"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

/** Rendered only once payment is confirmed, so an abandoned payment keeps the cart. */
export function ClearCartOnPaid() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
