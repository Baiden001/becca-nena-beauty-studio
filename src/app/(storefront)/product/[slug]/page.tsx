import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { SITE, absoluteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { ProductImage } from "@/components/product-image";
import { AddToCartForm } from "@/components/add-to-cart-form";
import {
  currentPrice,
  discountPercent,
  formatCedis,
  isDiscountActive,
  stockLabel,
} from "@/lib/pricing";
import { waLink } from "@/lib/whatsapp";

// One database lookup shared by the page and its metadata.
const getProduct = cache(async (slug: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "*, product_images(image_url, display_order), product_variants(*), categories(name)"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
});

const imagesOf = (product: { product_images?: unknown }) =>
  ((product.product_images as { image_url: string; display_order: number }[]) || []).sort(
    (a, b) => a.display_order - b.display_order
  );

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};

  const images = imagesOf(product);
  const description =
    (product.description && product.description.replace(/\s+/g, " ").trim().slice(0, 155)) ||
    `${product.brand ? `${product.brand} ` : ""}${product.name}. Available at ${SITE.name}, with Mobile Money and card payments.`;
  const title = product.brand && !product.name.startsWith(product.brand)
    ? `${product.brand} ${product.name}`
    : product.name;

  return {
    title,
    description,
    alternates: { canonical: `/product/${params.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/product/${params.slug}`,
      images: images[0] ? [{ url: images[0].image_url, alt: product.name }] : [SITE.ogImagePath],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images[0] ? [images[0].image_url] : [SITE.ogImagePath],
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);

  if (!product) notFound();

  const images = imagesOf(product);
  const onSale = isDiscountActive(product);

  const barcode = (product.barcode ?? "").replace(/\D/g, "");
  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: images.map((i) => i.image_url),
    sku: product.sku || undefined,
    gtin: [8, 12, 13, 14].includes(barcode.length) ? barcode : undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.categories?.name || undefined,
    url: absoluteUrl(`/product/${params.slug}`),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${params.slug}`),
      priceCurrency: "GHS",
      price: currentPrice(product).toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.stock_status === "out_of_stock"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: SITE.name },
    },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
      { "@type": "ListItem", position: 3, name: product.name, item: absoluteUrl(`/product/${params.slug}`) },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <JsonLd data={[structuredData, breadcrumbs]} />
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <ProductImage src={images[0]?.image_url ?? null} alt={product.name} priority />
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {images.slice(1).map((img: { image_url: string }, i: number) => (
                <ProductImage key={i} src={img.image_url} alt={`${product.name} ${i + 2}`} />
              ))}
            </div>
          )}
        </div>

        <div>
          {product.categories?.name && <p className="eyebrow">{product.categories.name}</p>}
          <h1 className="mt-2 font-serif text-3xl text-brown">{product.name}</h1>
          {product.brand && <p className="mt-1 text-sm text-taupe">{product.brand}</p>}

          <div className="mt-4 flex items-center gap-3">
            <span className="text-xl font-medium text-brown">
              {formatCedis(currentPrice(product))}
            </span>
            {onSale && (
              <>
                <span className="text-taupe line-through">
                  {formatCedis(product.regular_price)}
                </span>
                <span className="rounded-full bg-rose/10 px-2 py-0.5 text-xs font-medium text-rose">
                  {discountPercent(product)}% off
                </span>
              </>
            )}
          </div>

          <p className="mt-2 text-sm text-taupe">{stockLabel(product.stock_status)}</p>

          {product.description && (
            <p className="mt-6 max-w-md text-sm leading-relaxed text-brown/90">
              {product.description}
            </p>
          )}

          <AddToCartForm
            product={product}
            variants={product.product_variants || []}
            imageUrl={images[0]?.image_url ?? null}
          />

          <a
            href={waLink(`Hi Becca Nena, I have a question about "${product.name}".`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-brown underline underline-offset-2 hover:text-rose"
          >
            Ask about this product on WhatsApp
          </a>

          {(product.ingredients || product.usage_instructions) && (
            <div className="mt-8 space-y-4 border-t border-rose/20 pt-6">
              {product.ingredients && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-brown">
                    Ingredients
                  </summary>
                  <p className="mt-2 text-sm text-taupe">{product.ingredients}</p>
                </details>
              )}
              {product.usage_instructions && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-brown">
                    How to use
                  </summary>
                  <p className="mt-2 text-sm text-taupe">{product.usage_instructions}</p>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
