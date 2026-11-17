import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Promotions and offers",
  description: "Current offers and promotions at Becca Nena Beauty Studio.",
  alternates: { canonical: "/promotions" },
};


export default async function PromotionsPage() {
  const supabase = createClient();
  const { data: promotions } = await supabase
    .from("promotions")
    .select("*")
    .in("status", ["active", "scheduled"])
    .order("start_date");

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="eyebrow">Promotions</p>
      <h1 className="mt-1 font-serif text-3xl text-brown">Current & upcoming edits</h1>

      {promotions?.length ? (
        <ul className="mt-8 space-y-6">
          {promotions.map((promo) => {
            const href =
              promo.cta_type === "shop"
                ? "/shop"
                : promo.cta_type === "collection"
                  ? `/shop?collection=${promo.cta_target}`
                  : promo.cta_type === "category"
                    ? `/shop?category=${promo.cta_target}`
                    : promo.cta_type === "product"
                      ? `/product/${promo.cta_target}`
                      : promo.cta_target || "/shop";

            return (
              <li key={promo.id} className="rounded-md border border-rose/20 bg-white p-6">
                <span className="swatch-dot" aria-hidden />
                <h2 className="mt-2 font-serif text-xl text-brown">{promo.title}</h2>
                {promo.description && (
                  <p className="mt-1 text-sm text-taupe">{promo.description}</p>
                )}
                {promo.cta_text && (
                  <Link
                    href={href}
                    className="mt-3 inline-block text-sm text-rose underline underline-offset-2"
                  >
                    {promo.cta_text}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-taupe">No promotions running right now — check back soon.</p>
      )}
    </main>
  );
}
