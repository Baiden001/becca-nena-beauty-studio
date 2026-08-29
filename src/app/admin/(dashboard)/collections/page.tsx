import Link from "next/link";
import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";
import { NewCollectionForm } from "@/components/admin/new-collection-form";
import { StatusToggle } from "@/components/admin/status-toggle";
import { toggleCollectionStatus } from "@/app/actions/admin/catalog";

export default async function AdminCollectionsPage() {
  await requireOwnerAdmin();
  const supabase = createClient();
  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, slug, status")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-serif text-2xl text-brown">Collections</h1>

      <div className="mt-6 rounded-md border border-rose/20 bg-white p-5">
        <NewCollectionForm />
      </div>

      <ul className="mt-6 divide-y divide-rose/10 rounded-md border border-rose/20 bg-white">
        {collections?.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <Link href={`/admin/collections/${c.id}`} className="text-sm text-brown hover:text-rose">
                {c.name}
              </Link>
              <p className="text-xs text-taupe">{c.slug}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/collections/${c.id}`} className="text-xs text-rose hover:underline">
                Manage products
              </Link>
              <StatusToggle
                currentStatus={c.status}
                onToggle={toggleCollectionStatus.bind(null, c.id)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
