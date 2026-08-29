import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import { SortSelect } from "@/components/sort-select";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    category?: string;
    collection?: string;
    sort?: string;
  };
}) {
  const supabase = createClient();
  const { q, category, collection, sort = "newest" } = searchParams;

  let query = supabase
    .from("products")
    .select("*, product_images(image_url), categories!inner(slug, name)")
    .eq("status", "published");

  if (q) query = query.ilike("name", `%${q}%`);
  if (category) query = query.eq("categories.slug", category);

  if (sort === "price_asc") query = query.order("regular_price", { ascending: true });
  else if (sort === "price_desc") query = query.order("regular_price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  // Collection filtering needs the join table, so it's resolved separately.
  let productIdsInCollection: string[] | null = null;
  if (collection) {
    const { data: coll } = await supabase
      .from("collections")
      .select("id")
      .eq("slug", collection)
      .maybeSingle();

    if (coll) {
      const { data: links } = await supabase
        .from("collection_products")
        .select("product_id")
        .eq("collection_id", coll.id);
      productIdsInCollection = (links || []).map((l) => l.product_id);
    } else {
      productIdsInCollection = [];
    }
  }

  if (productIdsInCollection) {
    query = query.in("id", productIdsInCollection.length ? productIdsInCollection : ["-"]);
  }

  const { data: products } = await query;
  const { data: categories } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("status", "published")
    .order("display_order");

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Shop</p>
          <h1 className="mt-1 font-serif text-3xl text-brown">
            {collection
              ? "Curated edit"
              : category
                ? categories?.find((c) => c.slug === category)?.name ?? "Shop"
                : "All products"}
          </h1>
        </div>

        <form action="/shop" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search products"
            className="w-48 rounded-full border border-taupe/25 bg-white px-4 py-2 text-sm text-brown shadow-sm outline-none transition-all duration-150 placeholder:text-taupe/50 hover:border-taupe/45 focus:border-rose focus:ring-2 focus:ring-rose/15"
          />
        </form>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-rose/20 py-4">
        <div className="flex flex-wrap gap-2">
          <FilterPill href="/shop" active={!category}>
            All
          </FilterPill>
          {categories?.map((c) => (
            <FilterPill key={c.slug} href={`/shop?category=${c.slug}`} active={category === c.slug}>
              {c.name}
            </FilterPill>
          ))}
        </div>

        <SortSelect defaultValue={sort} />
      </div>

      {products?.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="mt-16 text-center text-taupe">
          <span className="swatch-dot" aria-hidden />
          <p className="mt-3">No products match yet — try a different search or category.</p>
        </div>
      )}
    </main>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
        active
          ? "border-rose bg-rose text-cream"
          : "border-taupe/30 text-brown hover:border-rose"
      }`}
    >
      {children}
    </Link>
  );
}
