import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  await requireOwnerAdmin();
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("display_order");

  return (
    <div>
      <h1 className="font-serif text-2xl text-brown">Add product</h1>
      <div className="mt-6">
        <ProductForm categories={categories || []} />
      </div>
    </div>
  );
}
