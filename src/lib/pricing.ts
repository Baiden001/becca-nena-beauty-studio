import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function formatCedis(amount: number): string {
  return `GH₵${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * A discount only counts as "live" if the product has one configured AND
 * (when dates are set) today falls inside the discount window. Mirrors the
 * PRD's scheduling rules — discounts activate/deactivate automatically.
 */
export function isDiscountActive(product: Product): boolean {
  if (product.discount_type === "none" || !product.sale_price) return false;

  const now = Date.now();
  if (product.discount_start && new Date(product.discount_start).getTime() > now) {
    return false;
  }
  if (product.discount_end && new Date(product.discount_end).getTime() < now) {
    return false;
  }
  return true;
}

export function discountPercent(product: Product): number {
  if (!isDiscountActive(product) || !product.sale_price) return 0;
  return Math.round((1 - product.sale_price / product.regular_price) * 100);
}

export function currentPrice(product: Product): number {
  return isDiscountActive(product) && product.sale_price
    ? product.sale_price
    : product.regular_price;
}

export function stockLabel(status: Product["stock_status"]): string {
  switch (status) {
    case "in_stock":
      return "In stock";
    case "low_stock":
      return "Only a few left";
    case "out_of_stock":
      return "Out of stock";
  }
}
