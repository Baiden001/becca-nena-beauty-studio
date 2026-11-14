import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import { LayoutImage } from "@/components/layout-image";
import { HeroDrift } from "@/components/hero-drift";
import { HairSiteBanner } from "@/components/hair-site-banner";

const ORDER_STEPS = [
  { step: "01", label: "Choose your products" },
  { step: "02", label: "Enter your delivery details" },
  { step: "03", label: "Pay securely with Mobile Money or card" },
  { step: "04", label: "We confirm and pack your order" },
  { step: "05", label: "Receive your order" },
];

export default async function Home() {
  const supabase = createClient();

  const [{ data: featured }, { data: categories }, { data: collections }] =
    await Promise.all([
      supabase
        .from("products")
        .select("*, product_images(image_url)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("categories")
        .select("id, name, slug")
        .eq("status", "published")
        .order("display_order")
        .limit(5),
      supabase
        .from("collections")
        .select("id, name, slug")
        .eq("status", "published")
        .limit(3),
    ]);

  return (
    <main>
      <HeroDrift />

      {/* Shop by category */}
      {!!categories?.length && (
        <section className="mx-auto max-w-6xl px-6 py-12">
          <p className="eyebrow">Shop by category</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/shop?category=${c.slug}`}
                className="rounded-full border border-rose px-5 py-2 text-sm text-brown transition-colors hover:bg-rose hover:text-cream"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {!!featured?.length && (
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">Featured</p>
            <Link href="/shop" className="text-sm text-rose hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i === 0} />
            ))}
          </div>
        </section>
      )}

      {/* Curated collections */}
      {!!collections?.length && (
        <section className="mx-auto max-w-6xl px-6 py-12">
          <p className="eyebrow">Curated edits</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {collections.map((c) => (
              <Link
                key={c.id}
                href={`/shop?collection=${c.slug}`}
                className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-sm bg-sage/30 p-5"
              >
                <LayoutImage
                  src={`images/collections/${c.slug}.jpg`}
                  alt=""
                  mode="cover"
                  sizes="(min-width: 640px) 33vw, 100vw"
                />
                <span className="relative z-10 rounded-sm bg-cream/80 px-2 py-1 font-serif text-xl text-brown group-hover:text-rose">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* About */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <LayoutImage
            src="images/about.jpg"
            alt="Inside Becca Nena Beauty Studio"
            aspectClassName="aspect-[4/3]"
            bgClassName="bg-taupe/20"
          />
          <div>
            <p className="eyebrow">About Becca Nena</p>
            <p className="mt-4 max-w-md font-serif text-2xl leading-snug text-brown">
              A cosmetics studio in Accra, built on one idea: beauty shopping should feel an experience.
            </p>
          </div>
        </div>
      </section>

      {/* Ordering process — a real sequence, so numbered steps earn their
          place here. */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="eyebrow text-center">How ordering works</p>
          <ol className="mt-8 grid gap-8 sm:grid-cols-5">
            {ORDER_STEPS.map((s) => (
              <li key={s.step} className="text-center">
                <span className="font-serif text-2xl text-rose">{s.step}</span>
                <p className="mt-2 text-sm text-brown">{s.label}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Instagram */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="eyebrow">Follow along</p>
        <a
          href="https://instagram.com/the.bnb.studio"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block font-serif text-2xl text-brown hover:text-rose"
        >
          @the.bnb.studio
        </a>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <LayoutImage
              key={i}
              src={`images/instagram-${i + 1}.jpg`}
              alt="From @the.bnb.studio on Instagram"
              aspectClassName="aspect-square"
              bgClassName="bg-rose-light/40"
              sizes="16vw"
            />
          ))}
        </div>
      </section>

      {/* Link to the hair website */}
      <HairSiteBanner />

      {/* Final CTA */}
      <section className="bg-brown py-16 text-center">
        <p className="font-serif text-2xl text-cream">Shop Beauty</p>
        <Link
          href="/shop"
          className="mt-5 inline-block rounded-full bg-cream px-6 py-3 text-sm font-medium text-brown hover:bg-rose-light"
        >
          Browse the full edit
        </Link>
      </section>
    </main>
  );
}
