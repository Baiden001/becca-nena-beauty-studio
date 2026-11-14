"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { currentPrice } from "@/lib/pricing";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Variant = Database["public"]["Tables"]["product_variants"]["Row"];

export function AddToCartForm({
  product,
  variants,
  imageUrl,
}: {
  product: Product;
  variants: Variant[];
  imageUrl: string | null;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Group variants by type (e.g. "size", "shade") for separate selectors.
  const variantGroups = variants.reduce<Record<string, Variant[]>>((acc, v) => {
    (acc[v.variant_type] ??= []).push(v);
    return acc;
  }, {});
  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(variantGroups).map(([type, opts]) => [type, opts[0]?.id ?? ""])
    )
  );

  const isSoldOut = product.stock_status === "out_of_stock";

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl,
        regularPrice: product.regular_price,
        currentPrice: currentPrice(product),
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mt-6 space-y-6">
      {Object.entries(variantGroups).map(([type, opts]) => (
        <div key={type}>
          <p className="text-sm text-brown capitalize">{type}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {opts.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelected((s) => ({ ...s, [type]: o.id }))}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  selected[type] === o.id
                    ? "border-rose bg-rose text-cream"
                    : "border-taupe/30 text-brown hover:border-rose"
                }`}
              >
                {o.variant_value}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-full border border-taupe/30">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-brown"
          >
            −
          </button>
          <span className="w-6 text-center text-sm">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => q + 1)}
            className="px-3 py-2 text-brown"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled={isSoldOut}
          onClick={handleAdd}
          className="flex-1 rounded-full bg-rose px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-brown disabled:cursor-not-allowed disabled:bg-taupe/40"
        >
          {isSoldOut ? "Out of stock" : added ? "Added" : "Add to Cart"}
        </button>
      </div>

      {added && (
        <button
          type="button"
          onClick={() => router.push("/cart")}
          className="text-sm text-rose underline underline-offset-2"
        >
          View cart
        </button>
      )}
    </div>
  );
}
