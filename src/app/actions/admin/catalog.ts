"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import type { ProductStatus } from "@/types/database";

export async function createCategory(
  name: string,
  slug: string
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };
  if (!name.trim() || !slug.trim()) return { ok: false, error: "Name and slug are required." };

  const supabase = createClient();
  const { error } = await supabase.from("categories").insert({ name, slug, status: "published" });
  if (error) return { ok: false, error: "Could not create category — slug may already be in use." };

  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function toggleCategoryStatus(
  id: string,
  status: ProductStatus
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };

  const supabase = createClient();
  const { error } = await supabase.from("categories").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Could not update category." };

  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function createCollection(
  name: string,
  slug: string
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };
  if (!name.trim() || !slug.trim()) return { ok: false, error: "Name and slug are required." };

  const supabase = createClient();
  const { error } = await supabase.from("collections").insert({ name, slug, status: "published" });
  if (error) return { ok: false, error: "Could not create collection — slug may already be in use." };

  revalidatePath("/admin/collections");
  return { ok: true };
}

export async function toggleCollectionStatus(
  id: string,
  status: ProductStatus
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };

  const supabase = createClient();
  const { error } = await supabase.from("collections").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Could not update collection." };

  revalidatePath("/admin/collections");
  return { ok: true };
}

export async function setCollectionProduct(
  collectionId: string,
  productId: string,
  include: boolean
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };

  const supabase = createClient();
  const error = include
    ? (await supabase.from("collection_products").insert({ collection_id: collectionId, product_id: productId })).error
    : (
        await supabase
          .from("collection_products")
          .delete()
          .eq("collection_id", collectionId)
          .eq("product_id", productId)
      ).error;

  if (error) return { ok: false, error: "Could not update collection products." };

  revalidatePath(`/admin/collections/${collectionId}`);
  return { ok: true };
}
