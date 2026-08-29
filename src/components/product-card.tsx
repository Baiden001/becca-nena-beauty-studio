import Link from "next/link";
import type { Database } from "@/types/database";
import { ProductImage } from "@/components/product-image";
import {
  currentPrice,
  discountPercent,
  formatCedis,
  isDiscountActive,
  stockLabel,
} from "@/lib/pricing";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_images?: { image_url: string }[];
};

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const onSale = isDiscountActive(product);
  const image = product.product_images?.[0]?.image_url ?? null;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <ProductImage src={image} alt={product.name} priority={priority} />

      <div className="mt-3">
        <p className="text-sm text-brown group-hover:text-rose">{product.name}</p>

        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-medium text-brown">
            {formatCedis(currentPrice(product))}
          </span>
          {onSale && (
            <>
              <span className="text-xs text-taupe line-through">
                {formatCedis(product.regular_price)}
              </span>
              <span className="text-xs font-medium text-rose">
                {discountPercent(product)}% off
              </span>
            </>
          )}
        </div>

        {product.stock_status !== "in_stock" && (
          <p className="mt-1 text-xs text-taupe">{stockLabel(product.stock_status)}</p>
        )}
      </div>
    </Link>
  );
}
