"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import type { DiscountType, ProductStatus } from "@/types/database";

export interface ProductFormInput {
  name: string;
  slug: string;
  description: string;
  brand: string;
  categoryId: string;
  sku: string;
  barcode: string;
  regularPrice: number;
  discountType: DiscountType;
  discountValue: number;
  discountStart: string;
  discountEnd: string;
  lowStockThreshold: number;
  status: ProductStatus;
  ingredients: string;
  usageInstructions: string;
  imageUrls: string[];
  variants: { type: string; value: string }[];
}

function validate(input: ProductFormInput): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (!input.slug.trim()) return "Slug is required.";
  if (input.regularPrice < 0) return "Regular price can't be negative.";
  if (input.discountType === "percentage" && input.discountValue > 100) {
    return "Percentage discount can't exceed 100%.";
  }
  if (input.discountType === "fixed" && input.discountValue > input.regularPrice) {
    return "Fixed discount can't exceed the regular price.";
  }
  return null;
}

export async function createProduct(
  input: ProductFormInput
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };

  const error = validate(input);
  if (error) return { ok: false, error };

  const supabase = createClient();
  const { data, error: dbError } = await supabase
    .from("products")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      brand: input.brand || null,
      category_id: input.categoryId || null,
      sku: input.sku || null,
      barcode: input.barcode.trim() || null,
      regular_price: input.regularPrice,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      discount_start: input.discountStart || null,
      discount_end: input.discountEnd || null,
      low_stock_threshold: input.lowStockThreshold,
      status: input.status,
      ingredients: input.ingredients || null,
      usage_instructions: input.usageInstructions || null,
    })
    .select("id")
    .single();

  if (dbError || !data) {
    return { ok: false, error: dbError?.message.includes("duplicate") ? "That slug, SKU or barcode is already in use." : "Could not create the product." };
  }

  await syncImagesAndVariants(supabase, data.id, input);

  revalidatePath("/admin/products");
  return { ok: true, id: data.id };
}

export async function updateProduct(
  productId: string,
  input: ProductFormInput
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };

  const error = validate(input);
  if (error) return { ok: false, error };

  const supabase = createClient();
  const { error: dbError } = await supabase
    .from("products")
    .update({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      brand: input.brand || null,
      category_id: input.categoryId || null,
      sku: input.sku || null,
      barcode: input.barcode.trim() || null,
      regular_price: input.regularPrice,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      discount_start: input.discountStart || null,
      discount_end: input.discountEnd || null,
      low_stock_threshold: input.lowStockThreshold,
      status: input.status,
      ingredients: input.ingredients || null,
      usage_instructions: input.usageInstructions || null,
    })
    .eq("id", productId);

  if (dbError) {
    return {
      ok: false,
      error: dbError.message.includes("duplicate")
        ? "That slug, SKU or barcode is already in use."
        : "Could not save changes.",
    };
  }

  await syncImagesAndVariants(supabase, productId, input);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

/**
 * Replaces a product's images and variants wholesale with what's in the
 * form. Simple and predictable for an admin form — not meant for
 * high-concurrency editing.
 */
async function syncImagesAndVariants(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  input: ProductFormInput
): Promise<void> {
  await supabase.from("product_images").delete().eq("product_id", productId);
  if (input.imageUrls.length) {
    await supabase.from("product_images").insert(
      input.imageUrls.map((url, i) => ({
        product_id: productId,
        image_url: url,
        display_order: i,
      }))
    );
  }

  await supabase.from("product_variants").delete().eq("product_id", productId);
  if (input.variants.length) {
    await supabase.from("product_variants").insert(
      input.variants.map((v, i) => ({
        product_id: productId,
        variant_type: v.type,
        variant_value: v.value,
        display_order: i,
      }))
    );
  }
}

export async function deleteProduct(productId: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };

  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { ok: false, error: "Could not delete the product." };

  revalidatePath("/admin/products");
  return { ok: true };
}

export async function adjustStock(
  productId: string,
  quantityChange: number,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };
  if (!reason.trim()) return { ok: false, error: "A reason is required for stock changes." };
  if (quantityChange === 0) return { ok: false, error: "Enter a non-zero quantity." };

  const supabase = createClient();
  const { error } = await supabase.from("inventory_transactions").insert({
    product_id: productId,
    quantity_change: quantityChange,
    reason,
    created_by: staff.id,
  });

  if (error) return { ok: false, error: "Could not record the stock change." };

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { ok: true };
}
