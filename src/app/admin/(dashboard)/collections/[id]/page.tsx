import { notFound } from "next/navigation";
import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";
import { CollectionProductPicker } from "@/components/admin/collection-product-picker";

export default async function CollectionDetailPage({ params }: { params: { id: string } }) {
  await requireOwnerAdmin();
  const supabase = createClient();

  const [{ data: collection }, { data: allProducts }, { data: links }] = await Promise.all([
    supabase.from("collections").select("id, name, slug").eq("id", params.id).maybeSingle(),
    supabase.from("products").select("id, name").order("name"),
    supabase.from("collection_products").select("product_id").eq("collection_id", params.id),
  ]);

  if (!collection) notFound();

  return (
    <div className="max-w-xl">
      <p className="eyebrow">Collection</p>
      <h1 className="font-serif text-2xl text-brown">{collection.name}</h1>

      <div className="mt-6">
        <CollectionProductPicker
          collectionId={collection.id}
          allProducts={allProducts || []}
          initiallyIncluded={(links || []).map((l) => l.product_id)}
        />
      </div>
    </div>
  );
}
