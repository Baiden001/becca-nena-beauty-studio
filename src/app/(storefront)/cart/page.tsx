"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { formatCedis } from "@/lib/pricing";

export default function CartPage() {
  const { lines, updateQuantity, removeItem, subtotal, discountTotal, total } = useCart();

  if (!lines.length) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
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
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-serif text-3xl text-brown">Your cart</h1>

      <ul className="mt-8 divide-y divide-rose/15 border-y border-rose/15">
        {lines.map((line) => (
          <li key={line.productId} className="flex items-center gap-4 py-5">
            <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-rose-light/40">
              {line.imageUrl && (
                <Image src={line.imageUrl} alt={line.name} fill className="object-cover" />
              )}
            </div>

            <div className="flex-1">
              <Link href={`/product/${line.slug}`} className="text-sm text-brown hover:text-rose">
                {line.name}
              </Link>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="text-brown">{formatCedis(line.currentPrice)}</span>
                {line.currentPrice < line.regularPrice && (
                  <span className="text-taupe line-through">
                    {formatCedis(line.regularPrice)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center rounded-full border border-taupe/30">
              <button
                aria-label="Decrease quantity"
                onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                className="px-3 py-1.5 text-brown"
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{line.quantity}</span>
              <button
                aria-label="Increase quantity"
                onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                className="px-3 py-1.5 text-brown"
              >
                +
              </button>
            </div>

            <span className="w-20 text-right text-sm text-brown">
              {formatCedis(line.currentPrice * line.quantity)}
            </span>

            <button
              aria-label={`Remove ${line.name}`}
              onClick={() => removeItem(line.productId)}
              className="text-sm text-taupe hover:text-rose"
            >
              Remove
            </button>
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
