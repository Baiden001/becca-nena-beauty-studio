import { HAIR_SITE } from "@/lib/links";

// A statement plus link that sends visitors to the hair website.
export function HairSiteBanner() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-lg border border-rose/30 bg-rose-light/20 px-8 py-12 text-center">
        <p className="eyebrow">
          {HAIR_SITE.name} · {HAIR_SITE.short}
        </p>
        <h2 className="mt-2 font-serif text-2xl text-brown sm:text-3xl">
          Looking for hair too? Visit {HAIR_SITE.name} ({HAIR_SITE.short}).
        </h2>
        <a
          href={HAIR_SITE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-full bg-brown px-7 py-3 text-sm font-medium text-cream transition-colors hover:bg-rose"
        >
          Visit {HAIR_SITE.short} ↗
        </a>
      </div>
    </section>
  );
}
