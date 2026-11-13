import { createClient } from "@/lib/supabase/server";
import { PromoPopup } from "@/components/promo-popup";

// Replaces the old top-of-page promo bar. Finds the live promotion (same
// rules as before: active, and today falls inside its start/end dates) and
// hands it to the popup. No live promotion means nothing renders.
export async function PromoPopupLoader() {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data: promo } = await supabase
    .from("promotions")
    .select("id, title, description, image_url, cta_text")
    .eq("status", "active")
    .lte("start_date", now)
    .gte("end_date", now)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!promo) return null;

  return (
    <PromoPopup
      promo={{
        id: promo.id,
        title: promo.title,
        description: promo.description,
        imageUrl: promo.image_url,
        ctaText: promo.cta_text,
      }}
    />
  );
}
