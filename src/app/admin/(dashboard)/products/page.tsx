import Link from "next/link";
import { requireCatalogStaff } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";
import { formatCedis } from "@/lib/pricing";

export default async function AdminProductsPage() {
  await requireCatalogStaff();
  const supabase = createClient();
  const { data: productsRaw } = await supabase
    .from("products")
    .select("id, name, sku, regular_price, stock_quantity, stock_status, status, categories(name)")
    .order("created_at", { ascending: false });
  const products = productsRaw as unknown as
    | {
        id: string;
        name: string;
        sku: string | null;
        regular_price: number;
        stock_quantity: number;
        stock_status: string;
        status: string;
        categories: { name: string } | null;
      }[]
    | null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-brown">Products</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/barcodes"
            className="rounded-full border border-brown/40 px-4 py-2 text-sm font-medium text-brown hover:border-rose hover:text-rose"
          >
            Assign barcodes
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded-full bg-rose px-4 py-2 text-sm font-medium text-cream hover:bg-brown"
          >
            + Add product
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border border-rose/20 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-rose/10 text-xs uppercase text-taupe">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose/10">
            {products?.length ? (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-rose-light/10">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="text-brown hover:text-rose">
                      {p.name}
                    </Link>
                    {p.sku && <div className="text-xs text-taupe">{p.sku}</div>}
                  </td>
                  <td className="px-4 py-3 text-brown">{p.categories?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-brown">{formatCedis(p.regular_price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.stock_status === "out_of_stock"
                          ? "text-red-600"
                          : p.stock_status === "low_stock"
                            ? "text-rose"
                            : "text-brown"
                      }
                    >
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-taupe">{p.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-taupe">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
