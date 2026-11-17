import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { POLICIES } from "@/lib/policies";
import { absoluteUrl } from "@/lib/site";

// Rebuilt on every request so new products appear without redeploying.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/promotions"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.5 },
    ...Object.keys(POLICIES).map((slug) => ({
      url: absoluteUrl(`/policies/${slug}`),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];

  try {
    const supabase = createAdminClient();

    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase
        .from("products")
        .select("slug, updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(5000),
      supabase.from("categories").select("slug").eq("status", "published"),
    ]);

    for (const c of categories ?? []) {
      pages.push({
        url: absoluteUrl(`/shop?category=${c.slug}`),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
    for (const p of products ?? []) {
      pages.push({
        url: absoluteUrl(`/product/${p.slug}`),
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    // A database hiccup must never break the sitemap: serve the fixed pages.
    console.error("[sitemap] could not load products:", error);
  }

  return pages;
}
