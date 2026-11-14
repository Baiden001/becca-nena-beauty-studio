import Link from "next/link";
import { LayoutImage } from "@/components/layout-image";
import { DriftTrack } from "@/components/hero-drift-track";
import { HERO_ITEMS, type HeroItem } from "@/lib/hero-items";
import { waLink } from "@/lib/whatsapp";

// Homepage hero.
//  - Phones: text on top, a strip of images that drifts sideways forever,
//    buttons underneath.
//  - Desktop: text and buttons on the left, two columns of images on the
//    right drifting up and down in opposite directions.
// Everyone can also swipe or drag to bring back an image that just passed.
// There are no arrow buttons and no captions: the images speak for themselves.

function Card({ item, className = "" }: { item: HeroItem; className?: string }) {
  return (
    <div className={className}>
      <LayoutImage
        src={item.image}
        alt={item.alt}
        aspectClassName="aspect-[4/5]"
        bgClassName="bg-rose-light/40"
        sizes="(min-width: 768px) 22vw, 240px"
      />
    </div>
  );
}

export function HeroDrift() {
  const columnA = HERO_ITEMS.filter((_, i) => i % 2 === 0);
  const columnB = HERO_ITEMS.filter((_, i) => i % 2 === 1);

  return (
    <section id="hero" className="bg-cream pb-12 pt-24 md:pb-16 md:pt-28">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-x-14 md:gap-y-0">
        {/* Text */}
        <div className="fade-in text-center md:col-start-1 md:row-start-1 md:self-end md:pb-4 md:text-left">
          <p className="eyebrow">@the.bnb.studio</p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.1] text-brown sm:text-5xl lg:text-6xl">
            Beauty, <span className="italic text-rose">curated.</span> Not just sold.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-taupe md:mx-0">
            A premium edit of skincare and body care, picked the way we&apos;d
            recommend it to a friend. Pay securely online with Mobile Money or
            card, and our team confirms delivery with you directly.
          </p>
        </div>

        {/* Moving product cards */}
        <div className="md:col-start-2 md:row-span-2 md:row-start-1">
          {/* Phone: one strip, drifting sideways */}
          <DriftTrack
            axis="x"
            speed={36}
            dragWith="all"
            className="-mx-6 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] md:hidden"
          >
            {HERO_ITEMS.map((item) => (
              <Card key={item.image} item={item} className="w-[240px] shrink-0 pr-3" />
            ))}
          </DriftTrack>

          {/* Desktop: two columns drifting in opposite directions */}
          <div className="hidden h-[min(720px,calc(100svh_-_8rem))] grid-cols-2 gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] md:grid">
            <DriftTrack axis="y" direction={1} speed={30} dragWith="mouse" className="h-full">
              {columnA.map((item) => (
                <Card key={item.image} item={item} className="pb-4" />
              ))}
            </DriftTrack>
            <DriftTrack axis="y" direction={-1} speed={30} dragWith="mouse" className="h-full">
              {columnB.map((item) => (
                <Card key={item.image} item={item} className="pb-4" />
              ))}
            </DriftTrack>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap justify-center gap-4 md:col-start-1 md:row-start-2 md:justify-start md:self-start md:pt-4">
          <Link
            href="/shop"
            className="rounded-full bg-rose px-7 py-3 text-sm font-medium text-cream transition-colors hover:bg-brown"
          >
            Shop Now
          </Link>
          <a
            href={waLink("Hi Becca Nena, I'd like to place an order.")}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-brown/40 px-7 py-3 text-sm font-medium text-brown transition-colors hover:border-rose hover:text-rose"
          >
            Order via WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
