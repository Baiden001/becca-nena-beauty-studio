import { notFound } from "next/navigation";
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

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "*, product_images(image_url, display_order), product_variants(*), categories(name)"
    )
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();

  if (!product) notFound();

  const images = ((product.product_images as { image_url: string; display_order: number }[]) || []).sort(
    (a, b) => a.display_order - b.display_order
  );
  const onSale = isDiscountActive(product);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
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
