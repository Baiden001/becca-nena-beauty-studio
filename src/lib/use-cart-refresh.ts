"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { refreshCartProducts } from "@/app/actions/cart";

/**
 * Once per page visit, bring the saved cart up to date with the shop
 * (photos, names, prices, stock). Returns notes about anything that changed.
 */
export function useCartRefresh() {
  const { lines, hydrated, syncWithShop } = useCart();
  const [notes, setNotes] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!hydrated || done.current || lines.length === 0) return;
    done.current = true;
    setChecking(true);
    refreshCartProducts(lines.map((l) => l.productId))
      .then((fresh) => {
        // null = the shop couldn't be reached: keep the saved cart untouched.
        if (fresh) setNotes(syncWithShop(fresh));
      })
      .catch(() => {
        /* offline or a hiccup: keep the saved cart as it is */
      })
      .finally(() => setChecking(false));
  }, [hydrated, lines, syncWithShop]);

  return { notes, checking };
}
