import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import { LayoutImage } from "@/components/layout-image";
import { HeroVideo } from "@/components/hero-video";
import { HairSiteBanner } from "@/components/hair-site-banner";
import { waLink } from "@/lib/whatsapp";

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
      {/* Hero — full-bleed, works the same way on mobile and desktop
          instead of split-layout-on-desktop / stacked-on-mobile. A looping
          video sits behind the text if /public/videos/hero.mp4 exists;
          otherwise the static hero image (or brand color) shows instead,
          so nothing breaks before real footage is added. A fixed
          min-height means no layout shift either way — the section's
          size never depends on what loads inside it. */}
      <section id="hero" className="relative min-h-[80vh] w-full overflow-hidden sm:min-h-[90vh]">
        <LayoutImage
          src="images/hero.jpg"
          alt=""
          mode="cover"
          bgClassName="bg-rose-light/50"
          priority
          sizes="100vw"
        />
        <HeroVideo />

        {/* Scrim for text legibility over either the video or the image —
            darkest at the bottom where the text sits, fading upward. */}
        <div className="absolute inset-0 bg-gradient-to-t from-brown/75 via-brown/25 to-transparent" />

        {/* Soft shade at the very top so the floating header stays readable
            over any image or video. */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brown/40 to-transparent" />

        <div className="relative z-10 flex min-h-[80vh] items-end sm:min-h-[90vh]">
          <div className="mx-auto w-full max-w-6xl px-6 pb-14 sm:pb-20">
            <div className="fade-in max-w-xl">
              <p className="eyebrow text-cream/80">@the.bnb.studio</p>
              <h1 className="mt-4 font-serif text-4xl leading-[1.1] text-cream sm:text-5xl">
                Beauty, <span className="italic text-rose-light">curated.</span> Not
                just sold.
              </h1>
              <p className="mt-5 max-w-md text-cream/85">
                A premium edit of makeup, skincare, and fragrance, picked the way
                we&apos;d recommend it to a friend. Pay securely online with Mobile
                Money or card, and our team confirms delivery with you directly.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/shop"
                  className="rounded-full bg-rose px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-brown"
                >
                  Shop Now
                </Link>
                <a
                  href={waLink("Hi Becca Nena, I'd like to place an order.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-cream/70 px-6 py-3 text-sm font-medium text-cream transition-colors hover:border-rose hover:text-rose-light"
                >
                  Order via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

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
              A cosmetics studio in Accra, built on one idea: beauty
              shopping should feel like a recommendation, not a catalogue.
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
