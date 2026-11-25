"use client";

// "Hold" / "park" a sale on this till, the way most POS systems do: the
// cashier can put a customer's items aside, serve the next person, and pick
// the first sale up again. Held sales live only on this device.

import type { SaleProduct } from "@/app/actions/admin/walk-in";

export interface HeldSale {
  id: string;
  heldAt: number;
  label: string;
  heldBy: string;
  lines: { product: SaleProduct; quantity: number }[];
  customerName: string;
  customerPhone: string;
  notes: string;
}

const KEY = "bn-held-sales";
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // forget sales held more than 3 days ago

export function readHeldSales(): HeldSale[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as HeldSale[]) : [];
    const fresh = list.filter((s) => Date.now() - s.heldAt < MAX_AGE_MS);
    return fresh.sort((a, b) => b.heldAt - a.heldAt);
  } catch {
    return [];
  }
}

function write(list: HeldSale[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage full or blocked: holding just won't survive a reload
  }
}

export function holdSale(sale: Omit<HeldSale, "id" | "heldAt">): HeldSale[] {
  const entry: HeldSale = {
    ...sale,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    heldAt: Date.now(),
  };
  const list = [entry, ...readHeldSales()];
  write(list);
  return list;
}

export function removeHeldSale(id: string): HeldSale[] {
  const list = readHeldSales().filter((s) => s.id !== id);
  write(list);
  return list;
}
