"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatCedis } from "@/lib/pricing";
import { useCartRefresh } from "@/lib/use-cart-refresh";
import { CartThumb } from "@/components/cart-thumb";

export default function CartPage() {
  const { lines, updateQuantity, removeItem, subtotal, discountTotal, total } = useCart();
  const { notes } = useCartRefresh();

  if (!lines.length) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        {notes.length > 0 && (
          <ul className="mb-6 space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        <span className="swatch-dot" aria-hidden />
        <h1 className="mt-4 font-serif text-2xl text-brown">Your cart is empty</h1>
        <p className="mt-2 text-taupe">Nothing here yet — let&apos;s find you something.</p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-rose px-6 py-3 text-sm font-medium text-cream hover:bg-brown"
        >
          Continue shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-serif text-3xl text-brown">Your cart</h1>

      {notes.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <ul className="mt-6 divide-y divide-rose/15 border-y border-rose/15 sm:mt-8">
        {lines.map((line) => (
          <li key={line.productId} className="flex gap-4 py-5">
            <Link href={`/product/${line.slug}`} className="flex-shrink-0">
              <CartThumb src={line.imageUrl} alt={line.name} />
            </Link>

            {/* Phones: name and price on top, controls underneath.
                Larger screens: everything on one line. */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <Link href={`/product/${line.slug}`} className="text-sm leading-snug text-brown hover:text-rose">
                  {line.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="text-brown">{formatCedis(line.currentPrice)}</span>
                  {line.currentPrice < line.regularPrice && (
                    <span className="text-taupe line-through">{formatCedis(line.regularPrice)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
                <div className="flex items-center rounded-full border border-taupe/30">
                  <button
                    type="button"
                    aria-label={`One less ${line.name}`}
                    onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                    className="flex h-10 w-10 items-center justify-center text-brown hover:text-rose"
                  >
                    <Minus size={15} aria-hidden />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={`One more ${line.name}`}
                    onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                    className="flex h-10 w-10 items-center justify-center text-brown hover:text-rose"
                  >
                    <Plus size={15} aria-hidden />
                  </button>
                </div>

                <span className="whitespace-nowrap text-sm font-medium tabular-nums text-brown sm:w-24 sm:text-right">
                  {formatCedis(line.currentPrice * line.quantity)}
                </span>

                <button
                  type="button"
                  aria-label={`Remove ${line.name}`}
                  onClick={() => removeItem(line.productId)}
                  className="flex h-10 items-center gap-1.5 rounded-full px-2 text-sm text-taupe hover:text-rose"
                >
                  <Trash2 size={16} aria-hidden />
                  <span className="hidden sm:inline">Remove</span>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
        <div className="flex justify-between text-taupe">
          <span>Subtotal</span>
          <span>{formatCedis(subtotal)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between text-rose">
            <span>Discount</span>
            <span>−{formatCedis(discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-rose/20 pt-2 text-base font-medium text-brown">
          <span>Estimated total</span>
          <span>{formatCedis(total)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/shop"
          className="rounded-full border border-brown px-6 py-3 text-center text-sm font-medium text-brown hover:border-rose hover:text-rose"
        >
          Continue shopping
        </Link>
        <Link
          href="/checkout"
          className="rounded-full bg-rose px-6 py-3 text-center text-sm font-medium text-cream hover:bg-brown"
        >
          Proceed to checkout
        </Link>
      </div>
    </main>
  );
}
