import Link from "next/link";
import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";
import { BarcodeAssigner, type BarcodeProduct } from "@/components/admin/barcode-assigner";

export const dynamic = "force-dynamic";

export default async function AssignBarcodesPage() {
  await requireOwnerAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from("products")
    .select("id, name, brand, barcode")
    .order("brand", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const products: BarcodeProduct[] = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    barcode: p.barcode,
  }));

  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="text-sm text-taupe hover:text-rose">
        Back to Products
      </Link>
      <p className="eyebrow mt-4">Setup</p>
      <h1 className="font-serif text-2xl text-brown">Assign barcodes</h1>
      <p className="mt-1 text-sm text-taupe">
        Pick up each product, scan its barcode, and it moves on to the next. Products that
        already have a barcode are skipped.
      </p>

      <div className="mt-6">
        <BarcodeAssigner initialProducts={products} />
      </div>
    </div>
  );
}
