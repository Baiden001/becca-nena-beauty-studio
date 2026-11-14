import Image from "next/image";
import { HAIR_SITE } from "@/lib/links";

const PHOTOS = [
  { src: "/images/hair-3.jpg", alt: "Honey-highlighted lace wig with soft layers", offset: "" },
  { src: "/images/hair-1.jpg", alt: "Black lace wig with loose body waves", offset: "mt-8 sm:mt-12" },
  { src: "/images/hair-2.jpg", alt: "Close-up of glossy wavy hair", offset: "" },
];

// A minimal editorial banner: three photos on one side, a short statement and
// an underlined link to the hair website on the other.
export function HairSiteBanner() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <div className="grid items-center gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
        <div className="order-2 text-center md:order-1 md:text-left">
          <p className="eyebrow">
            {HAIR_SITE.name} · {HAIR_SITE.short}
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-brown sm:text-4xl">
            Looking for hair extensions?
          </h2>
          <p className="mt-4 text-taupe">
            Visit{" "}
            <a
              href={HAIR_SITE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brown underline decoration-rose decoration-1 underline-offset-4 transition-colors hover:text-rose"
            >
              {HAIR_SITE.name} ({HAIR_SITE.short})
            </a>{" "}
            at beccanenahair.com.
          </p>
        </div>

        <a
          href={HAIR_SITE.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${HAIR_SITE.name}`}
          className="group order-1 grid grid-cols-3 gap-2 sm:gap-3 md:order-2"
        >
          {PHOTOS.map((photo) => (
            <div key={photo.src} className={photo.offset}>
              <div className="relative aspect-[3/4] overflow-hidden bg-rose-light/40">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 768px) 25vw, 30vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
          ))}
        </a>
      </div>
    </section>
  );
}
