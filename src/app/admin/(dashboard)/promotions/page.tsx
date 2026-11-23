import Link from "next/link";
import { requireCatalogStaff } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPromotionsPage() {
  await requireCatalogStaff();
  const supabase = createClient();
  const { data: promotions } = await supabase
    .from("promotions")
    .select("id, title, status, start_date, end_date")
    .order("start_date", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-brown">Promotions</h1>
        <Link
          href="/admin/promotions/new"
          className="rounded-full bg-rose px-4 py-2 text-sm font-medium text-cream hover:bg-brown"
        >
          + New promotion
        </Link>
      </div>

      <ul className="mt-6 divide-y divide-rose/10 rounded-md border border-rose/20 bg-white">
        {promotions?.length ? (
          promotions.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <Link href={`/admin/promotions/${p.id}`} className="text-sm text-brown hover:text-rose">
                  {p.title}
                </Link>
                <p className="text-xs text-taupe">
                  {new Date(p.start_date).toLocaleDateString()} – {new Date(p.end_date).toLocaleDateString()}
                </p>
              </div>
              <span className="rounded-full border border-taupe/30 px-3 py-1 text-xs capitalize text-brown">
                {p.status}
              </span>
            </li>
          ))
        ) : (
          <li className="px-5 py-8 text-center text-sm text-taupe">No promotions yet.</li>
        )}
      </ul>
    </div>
  );
}
