import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";
import { NewCategoryForm } from "@/components/admin/new-category-form";
import { StatusToggle } from "@/components/admin/status-toggle";
import { toggleCategoryStatus } from "@/app/actions/admin/catalog";

export default async function AdminCategoriesPage() {
  await requireOwnerAdmin();
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, status")
    .order("display_order");

  return (
    <div>
      <h1 className="font-serif text-2xl text-brown">Categories</h1>

      <div className="mt-6 rounded-md border border-rose/20 bg-white p-5">
        <NewCategoryForm />
      </div>

      <ul className="mt-6 divide-y divide-rose/10 rounded-md border border-rose/20 bg-white">
        {categories?.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
            <div>
              <p className="text-sm text-brown">{c.name}</p>
              <p className="text-xs text-taupe">{c.slug}</p>
            </div>
            <StatusToggle
              currentStatus={c.status}
              onToggle={toggleCategoryStatus.bind(null, c.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
