import { notFound } from "next/navigation";
import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { StockAdjustForm } from "@/components/admin/stock-adjust-form";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requireOwnerAdmin();
  const supabase = createClient();

  const [{ data: product }, { data: categories }, { data: transactions }] = await Promise.all([
    supabase
      .from("products")
      .select("*, product_images(image_url, display_order), product_variants(variant_type, variant_value)")
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("categories").select("id, name").order("display_order"),
    supabase
      .from("inventory_transactions")
      .select("id, quantity_change, reason, created_at")
      .eq("product_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!product) notFound();

  const images = (product.product_images as { image_url: string; display_order: number }[] || [])
    .sort((a, b) => a.display_order - b.display_order)
    .map((img) => img.image_url);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-brown">{product.name}</h1>
        <p className="text-sm text-taupe">
          Stock: <span className="font-medium text-brown">{product.stock_quantity}</span>
        </p>
      </div>

      <div className="mt-6 rounded-md border border-rose/20 bg-white p-5">
        <p className="text-sm font-medium text-brown">Adjust stock</p>
        <div className="mt-3">
          <StockAdjustForm productId={product.id} />
        </div>

        {!!transactions?.length && (
          <div className="mt-5 border-t border-rose/10 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-taupe">Recent history</p>
            <ul className="mt-2 space-y-1 text-sm">
              {transactions.map((t) => (
                <li key={t.id} className="flex justify-between text-brown">
                  <span>
                    {t.quantity_change > 0 ? "+" : ""}
                    {t.quantity_change} · {t.reason}
                  </span>
                  <span className="text-taupe">{new Date(t.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6">
        <ProductForm
          categories={categories || []}
          existing={product}
          existingImages={images}
          existingVariants={product.product_variants || []}
        />
      </div>
    </div>
  );
}
