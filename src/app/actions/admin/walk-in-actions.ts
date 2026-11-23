"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import { currentPrice } from "@/lib/pricing";
import type { PaymentMethod, ProductRow } from "@/types/database";
import { notifyStaffOfWalkInSale } from "@/lib/payments";

export interface SaleProduct {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  sku: string | null;
  stock: number;
  /** What the customer pays per unit today (after any active discount). */
  price: number;
  /** The normal price before any discount. */
  regularPrice: number;
  /** First product photo, shown on the customer screen. */
  imageUrl: string | null;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "mobile_money",
  "card",
  "pos_terminal",
  "bank_transfer",
];

function toSaleProduct(p: ProductRow, imageUrl: string | null): SaleProduct {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    barcode: p.barcode,
    sku: p.sku,
    stock: p.stock_quantity,
    price: currentPrice(p),
    regularPrice: p.regular_price,
    imageUrl,
  };
}

// Looks up the first photo of each product in one query.
async function withImages(
  supabase: ReturnType<typeof createAdminClient>,
  rows: ProductRow[]
): Promise<SaleProduct[]> {
  if (rows.length === 0) return [];
  const { data } = await supabase
    .from("product_images")
    .select("product_id, image_url, display_order")
    .in("product_id", rows.map((r) => r.id))
    .order("display_order", { ascending: true });

  const first = new Map<string, string>();
  for (const img of data ?? []) {
    if (!first.has(img.product_id)) first.set(img.product_id, img.image_url);
  }
  return rows.map((r) => toSaleProduct(r, first.get(r.id) ?? null));
}

// Escape the characters that act as wildcards inside a LIKE pattern.
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Finds products for the sale screen. A scanned barcode (or SKU) matches
 * exactly and comes back as `exact`; anything else is a name/brand search.
 */
export async function lookupProducts(query: string): Promise<{
  ok: boolean;
  exact?: SaleProduct;
  results: SaleProduct[];
  error?: string;
}> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, results: [], error: "Not signed in." };

  const q = query.trim().slice(0, 100);
  if (!q) return { ok: true, results: [] };

  const supabase = createAdminClient();

  for (const column of ["barcode", "sku"] as const) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq(column, q)
      .limit(1)
      .maybeSingle();
    if (data) {
      const [product] = await withImages(supabase, [data]);
      return { ok: true, exact: product, results: [product] };
    }
  }

  const pattern = `%${escapeLike(q)}%`;
  const [byName, byBrand] = await Promise.all([
    supabase.from("products").select("*").ilike("name", pattern).limit(8),
    supabase.from("products").select("*").ilike("brand", pattern).limit(8),
  ]);

  const seen = new Set<string>();
  const rows: ProductRow[] = [];
  for (const row of [...(byName.data ?? []), ...(byBrand.data ?? [])]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }

  return { ok: true, results: await withImages(supabase, rows.slice(0, 8)) };
}

export interface WalkInSaleInput {
  lines: { productId: string; quantity: number }[];
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

export interface WalkInSaleResult {
  ok: boolean;
  orderId?: string;
  orderNumber?: string;
  total?: number;
  error?: string;
}

/**
 * Records an in-store sale: reduces stock, stores who sold it and how it was
 * paid. Prices are read from the database here, never taken from the browser.
 */
export async function recordWalkInSale(input: WalkInSaleInput): Promise<WalkInSaleResult> {
  try {
    const staff = await getCurrentStaff();
    if (!staff) return { ok: false, error: "Not signed in." };

    if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
      return { ok: false, error: "Choose how the customer paid." };
    }
    if (!input.lines?.length) {
      return { ok: false, error: "Add at least one product." };
    }

    const wanted = new Map<string, number>();
    for (const line of input.lines) {
      const qty = Number(line.quantity);
      if (!line.productId || !Number.isInteger(qty) || qty < 1 || qty > 500) {
        return { ok: false, error: "One of the quantities is invalid." };
      }
      wanted.set(line.productId, (wanted.get(line.productId) ?? 0) + qty);
    }

    const supabase = createAdminClient();

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", [...wanted.keys()]);

    if (productsError || !products || products.length !== wanted.size) {
      return { ok: false, error: "A product in this sale could not be found. Please start again." };
    }

    const lines = products.map((p) => ({
      product_id: p.id,
      quantity: wanted.get(p.id)!,
      regular_price: p.regular_price,
      final_price: currentPrice(p),
    }));

    // Customer: optional. Walk-ins without details share one "Walk-in customer" record.
    const name = input.customerName?.trim();
    const phone = input.customerPhone?.trim();
    let customerId: string | null = null;

    if (phone) {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();
      customerId = data?.id ?? null;
    }

    if (!customerId && (name || phone)) {
      const { data } = await supabase
        .from("customers")
        .insert({ name: name || "Walk-in customer", phone: phone || null, location: "In store" })
        .select("id")
        .single();
      customerId = data?.id ?? null;
    }

    if (!customerId) {
      const { data: shared } = await supabase
        .from("customers")
        .select("id")
        .eq("name", "Walk-in customer")
        .is("phone", null)
        .is("email", null)
        .limit(1)
        .maybeSingle();

      if (shared) {
        customerId = shared.id;
      } else {
        const { data: created } = await supabase
          .from("customers")
          .insert({ name: "Walk-in customer", location: "In store" })
          .select("id")
          .single();
        customerId = created?.id ?? null;
      }
    }

    if (!customerId) {
      return { ok: false, error: "Could not save the customer record. Please try again." };
    }

    const { data, error } = await supabase.rpc("fn_record_walk_in_sale", {
      p_customer_id: customerId,
      p_sold_by: staff.id,
      p_payment_method: input.paymentMethod,
      p_notes: input.notes?.trim() || null,
      p_lines: lines,
    });

    if (error || !data?.length) {
      console.error("[walk-in-sale] failed:", error);
      const message = error?.message ?? "";
      if (message.includes("Not enough stock") || message.includes("no longer exists")) {
        return { ok: false, error: message };
      }
      return { ok: false, error: "Could not record the sale. Nothing was saved. Please try again." };
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    revalidatePath("/shop");

    // The sale and stock transaction is already committed. Notification failure
    // must not cause the cashier to retry and create a duplicate sale.
    await notifyStaffOfWalkInSale(data[0].out_order_id).catch((e) =>
      console.error("[walk-in-sale] staff email notification failed:", e)
    );

    return {
      ok: true,
      orderId: data[0].out_order_id,
      orderNumber: data[0].out_order_number,
      total: lines.reduce((sum, l) => sum + l.final_price * l.quantity, 0),
    };
  } catch (error) {
    console.error("[walk-in-sale] unexpected error:", error);
    return { ok: false, error: "Something went wrong. Nothing was saved. Please try again." };
  }
}
