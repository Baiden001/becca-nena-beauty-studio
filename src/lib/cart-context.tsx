"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
