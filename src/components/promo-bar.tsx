import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export async function PromoBar() {
  const supabase = createClient();
  const { data: promo } = await supabase
    .from("promotions")
    .select("title, cta_text, cta_type, cta_target")
    .eq("status", "active")
    .lte("start_date", new Date().toISOString())
    .gte("end_date", new Date().toISOString())
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!promo) return null;

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
    <div className="flex h-9 items-center justify-center gap-2 bg-brown px-4 text-center text-xs text-cream">
      <span className="swatch-dot bg-rose-light" aria-hidden />
      <span className="uppercase tracking-wide">{promo.title}</span>
      {promo.cta_text && (
        <Link href={href} className="underline underline-offset-2 hover:text-rose-light">
          {promo.cta_text}
        </Link>
      )}
    </div>
  );
}
