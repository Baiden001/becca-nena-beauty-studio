"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { formatCedis } from "@/lib/pricing";

export interface CartLine {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  quantity: number;
  regularPrice: number;
  currentPrice: number;
}

interface CartContextValue {
  lines: CartLine[];
  addItem: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  /** True once the saved cart has been loaded from this browser. */
  hydrated: boolean;
  /**
   * Bring the cart up to date with the shop: current photo, name and price;
   * products no longer for sale removed; quantities capped at what's in stock.
   * Returns a sentence per change, for telling the shopper.
   */
  syncWithShop: (
    fresh: {
      id: string;
      name: string;
      slug: string;
      imageUrl: string | null;
      regularPrice: number;
      currentPrice: number;
      stock: number;
    }[]
  ) => string[];
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  total: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "becca-nena-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load saved cart once on mount (after hydration, so SSR markup matches).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setLines(JSON.parse(saved));
    } catch {
      // Corrupt or inaccessible storage — start with an empty cart.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addItem = useCallback<CartContextValue["addItem"]>((line, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === line.productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === line.productId
            ? { ...l, quantity: l.quantity + quantity }
            : l
        );
      }
      return [...prev, { ...line, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l))
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => {
    // Remove the saved copy too. On a fresh page load the cart provider reads
    // localStorage right after this runs, and would otherwise put the old
    // items straight back.
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: nothing saved to remove.
    }
    setLines([]);
  }, []);

  const syncWithShop = useCallback<CartContextValue["syncWithShop"]>(
    (fresh) => {
      const byId = new Map(fresh.map((f) => [f.id, f]));
      const notes: string[] = [];
      const next: CartLine[] = [];
      for (const line of lines) {
        const f = byId.get(line.productId);
        if (!f || f.stock < 1) {
          notes.push(`${line.name} is no longer available and was removed.`);
          continue;
        }
        if (Math.abs(f.currentPrice - line.currentPrice) > 0.004) {
          notes.push(`${f.name} is now ${formatCedis(f.currentPrice)} each.`);
        }
        const quantity = Math.min(line.quantity, f.stock);
        if (quantity < line.quantity) notes.push(`Only ${f.stock} of ${f.name} left, so the quantity was lowered.`);
        next.push({
          ...line,
          name: f.name,
          slug: f.slug,
          imageUrl: f.imageUrl,
          regularPrice: f.regularPrice,
          currentPrice: f.currentPrice,
          quantity,
        });
      }
      setLines(next);
      return notes;
    },
    [lines]
  );

  const { itemCount, subtotal, discountTotal, total } = useMemo(() => {
    const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.regularPrice * l.quantity, 0);
    const total = lines.reduce((sum, l) => sum + l.currentPrice * l.quantity, 0);
    return { itemCount, subtotal, discountTotal: subtotal - total, total };
  }, [lines]);

  const value: CartContextValue = {
    lines,
    addItem,
    updateQuantity,
    removeItem,
    clear,
    hydrated,
    syncWithShop,
    itemCount,
    subtotal,
    discountTotal,
    total,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
