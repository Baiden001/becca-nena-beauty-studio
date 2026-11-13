"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function CartIndicator() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
      className="relative flex items-center hover:text-rose"
    >
      <ShoppingBag size={20} strokeWidth={1.75} />
      {itemCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-medium text-cream">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
