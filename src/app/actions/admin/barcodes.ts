"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/supabase/require-staff";

export interface AssignBarcodeResult {
  ok: boolean;
  error?: string;
  /** Set when the barcode already belongs to a different product. */
  conflict?: { id: string; name: string };
}

/** Saves a scanned barcode onto a product (owner/admin only). */
export async function assignBarcode(
  productId: string,
  barcode: string
): Promise<AssignBarcodeResult> {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "owner_admin") {
    return { ok: false, error: "Only the owner or admin can assign barcodes." };
  }

  const code = barcode.trim();
  if (code.length < 3 || code.length > 64) {
    return { ok: false, error: "That doesn't look like a barcode. Scan again." };
  }

  const supabase = createAdminClient();

  const { data: clash } = await supabase
    .from("products")
    .select("id, name")
    .eq("barcode", code)
    .neq("id", productId)
    .limit(1)
    .maybeSingle();

  if (clash) {
    return {
      ok: false,
      error: `That barcode already belongs to "${clash.name}".`,
      conflict: { id: clash.id, name: clash.name },
    };
  }

  const { error } = await supabase.from("products").update({ barcode: code }).eq("id", productId);
  if (error) {
    console.error("[assign-barcode] failed:", error);
    return {
      ok: false,
      error: error.message.includes("duplicate")
        ? "That barcode is already in use."
        : "Could not save the barcode. Please try again.",
    };
  }

  revalidatePath("/admin/products");
  return { ok: true };
}

export async function clearBarcode(productId: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "owner_admin") {
    return { ok: false, error: "Only the owner or admin can change barcodes." };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").update({ barcode: null }).eq("id", productId);
  if (error) return { ok: false, error: "Could not clear the barcode." };
  revalidatePath("/admin/products");
  return { ok: true };
}
