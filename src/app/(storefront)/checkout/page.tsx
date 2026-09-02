"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatCedis } from "@/lib/pricing";
import { placeOrder } from "@/app/actions/orders";

export default function CheckoutPage() {
  const { lines, subtotal, discountTotal, total, clear } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

 async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setError(null);
  setSubmitting(true);

  try {
    const form = new FormData(e.currentTarget);

    const result = await placeOrder({
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      whatsapp: String(form.get("whatsapp") || ""),
      email: String(form.get("email") || ""),
      deliveryLocation: String(form.get("deliveryLocation") || ""),
      notes: String(form.get("notes") || ""),
      lines: lines.map((l) => ({
        productId: l.productId,
        productName: l.name,
        quantity: l.quantity,
        regularPrice: l.regularPrice,
        currentPrice: l.currentPrice,
      })),
    });

    if (!result.ok || !result.orderNumber) {
      setError(result.error || "Something went wrong. Please try again.");
      return;
    }

    clear();
    router.push(`/order-confirmation/${result.orderNumber}`);
  } catch (error) {
    console.error("PLACE ORDER ERROR:", error);
    setError("We could not complete your order. Please try again.");
  } finally {
    setSubmitting(false);
  }
}

  if (!lines.length) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-serif text-2xl text-brown">Your cart is empty</h1>
        <Link href="/shop" className="mt-4 inline-block text-sm text-rose underline">
          Back to shop
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-serif text-3xl text-brown">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Full name" name="name" placeholder="Ama Owusu" required />
          <Field label="Phone number" name="phone" type="tel" placeholder="024 123 4567" required />
          <Field label="WhatsApp number" name="whatsapp" type="tel" placeholder="024 123 4567" required />
          <Field label="Email (optional)" name="email" type="email" placeholder="you@example.com" />
          <Field
            label="Delivery location"
            name="deliveryLocation"
            placeholder="e.g. East Legon, Accra"
            required
          />
          <div>
            <label htmlFor="notes" className="field-label">Additional delivery notes</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Landmarks, preferred delivery time, gate code, etc."
              className="field-textarea mt-1.5"
            />
          </div>

          <p className="rounded-md bg-rose-light/30 px-4 py-3 text-sm text-brown">
            Payment and delivery details will be confirmed by our sales team
            after your order is received.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-rose px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-brown disabled:opacity-60"
          >
            {submitting ? "Placing order…" : "Place Order"}
          </button>
        </form>

        <aside className="h-fit rounded-md border border-rose/20 bg-white p-6">
          <p className="eyebrow">Order summary</p>
          <ul className="mt-4 space-y-3 text-sm">
            {lines.map((l) => (
              <li key={l.productId} className="flex justify-between text-brown">
                <span>
                  {l.quantity} × {l.name}
                </span>
                <span>{formatCedis(l.currentPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-rose/20 pt-4 text-sm">
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
            <div className="flex justify-between text-base font-medium text-brown">
              <span>Estimated total</span>
              <span>{formatCedis(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="field-input mt-1.5"
      />
    </div>
  );
}
