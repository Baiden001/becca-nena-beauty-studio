"use server";

import { createClient } from "@/lib/supabase/server";
import { currentPrice } from "@/lib/pricing";

export interface FreshCartProduct {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  regularPrice: number;
  currentPrice: number;
  stock: number;
}

/**
 * Today's details for the products in a shopper's cart. The cart is saved in
 * the browser, so photos, names and prices in it can be out of date (e.g. a
 * product photo was replaced). Only published products come back; anything
 * missing is no longer for sale.
 *
 * Returns null if the shop's data couldn't be read: the cart must then be
 * left exactly as it is, never emptied.
 */
export async function refreshCartProducts(ids: string[]): Promise<FreshCartProduct[] | null> {
  const unique = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100);
  if (unique.length === 0) return null;

  const supabase = createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*, product_images(image_url, display_order)")
    .in("id", unique)
    .eq("status", "published");
  if (error || !products) {
    console.error("[cart] could not refresh products:", error);
    return null;
  }

  return products.map((p) => {
    const images = ((p.product_images ?? []) as { image_url: string; display_order: number }[])
      .slice()
      .sort((a, b) => a.display_order - b.display_order);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: images[0]?.image_url ?? null,
      regularPrice: Number(p.regular_price),
      currentPrice: currentPrice(p),
      stock: p.stock_quantity,
    };
  });
}
