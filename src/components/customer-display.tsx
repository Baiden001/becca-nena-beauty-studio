"use client";

import { useEffect, useState } from "react";
import { useDisplayState, type DisplayLine, type DisplayState } from "@/lib/customer-display";
import { formatCedis } from "@/lib/pricing";
import { HeroImage } from "@/components/hero-image";
import { DriftTrack } from "@/components/hero-drift-track";
import { HERO_ITEMS, type HeroItem } from "@/lib/hero-items";

const SLIDE_MS = 8000; // how long each idle picture stays

/** Finds idle-1.jpg ... idle-8.jpg in public/images/customer-display/. */
function useIdleImages() {
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    const candidates = Array.from({ length: 8 }, (_, i) => `/images/customer-display/idle-${i + 1}.jpg`);
    void Promise.all(
      candidates.map(
        (src) =>
          new Promise<string | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(null);
            img.src = src;
          })
      )
    ).then((found) => {
      if (!cancelled) setImages(found.filter((s): s is string => Boolean(s)));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return images;
}

/** The picture shown to the customer. Fills whatever box it is put in. */
export function CustomerScreen({ state }: { state: DisplayState }) {
  return (
    <div className="relative h-full w-full cursor-none select-none overflow-hidden bg-cream text-brown">
      <style>{`
        @keyframes cd-pop { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
        .cd-pop { animation: cd-pop .35s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .cd-pop { animation: none; } }
      `}</style>

      {state.kind === "sale" && state.lines.length > 0 ? (
        <SaleView state={state} />
      ) : state.kind === "thanks" ? (
        <ThanksView total={state.total} />
      ) : (
        <IdleView />
      )}
    </div>
  );
}

/** Customer-facing page rendered in its own browser window. */
export function CustomerDisplay() {
  const state = useDisplayState();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const on = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const goFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <main onClick={goFullscreen} className="relative h-[100dvh] w-screen">
      <CustomerScreen state={state} />
      {!fullscreen && (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-taupe/70">
          Click anywhere for full screen
        </p>
      )}
    </main>
  );
}

function WelcomeProductCard({
  item,
  priority = false,
  className = "",
}: {
  item: HeroItem;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <HeroImage
        src={item.image}
        alt={item.alt}
        priority={priority}
        sizes="(min-width: 768px) 22vw, 240px"
      />
    </div>
  );
}

/** Welcome view reuses the exact text, images and motion from the website hero. */
function IdleView() {
  const columnA = HERO_ITEMS.filter((_, i) => i % 2 === 0);
  const columnB = HERO_ITEMS.filter((_, i) => i % 2 === 1);

  return (
    <section className="h-full min-h-0 overflow-hidden bg-cream">
      <div className="mx-auto grid h-full max-w-6xl grid-cols-1 content-center gap-8 px-6 py-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-x-14 md:py-6">
        <div className="fade-in self-center text-center md:text-left">
          <h1 className="font-serif text-4xl leading-[1.1] text-brown sm:text-5xl lg:text-6xl">
            Beauty, <span className="italic text-rose">curated.</span> Not just sold.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-taupe md:mx-0">
            A premium edit of skincare and body care, picked the way we&apos;d
            recommend it to a friend. Pay securely online with Mobile Money or
            card, and our team confirms delivery with you directly.
          </p>
        </div>

        <div className="min-w-0 self-center md:h-[min(720px,calc(100dvh_-_3rem))]">
          <DriftTrack
            axis="x"
            speed={36}
            dragWith="all"
            className="-mx-6 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] md:hidden"
          >
            {HERO_ITEMS.map((item, i) => (
              <WelcomeProductCard
                key={item.image}
                item={item}
                priority={i < 2}
                className="w-[240px] shrink-0 pr-3"
              />
            ))}
          </DriftTrack>

          <div className="hidden h-full grid-cols-2 gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] md:grid">
            <DriftTrack axis="y" direction={1} speed={30} dragWith="mouse" className="h-full">
              {columnA.map((item) => (
                <WelcomeProductCard key={item.image} item={item} className="pb-4" />
              ))}
            </DriftTrack>
            <DriftTrack axis="y" direction={-1} speed={30} dragWith="mouse" className="h-full">
              {columnB.map((item) => (
                <WelcomeProductCard key={item.image} item={item} className="pb-4" />
              ))}
            </DriftTrack>
          </div>
        </div>
      </div>
    </section>
  );
}

function ThanksView({ total }: { total: number }) {
  return (
    <div className="cd-pop flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo.png" alt="" className="h-[28dvh] w-auto object-contain" />
      <p className="font-serif text-5xl text-brown">Thank you</p>
      <p className="text-2xl text-taupe">{formatCedis(total)} paid</p>
      <p className="text-lg text-taupe">We appreciate your purchase.</p>
    </div>
  );
}

function SaleView({ state }: { state: Extract<DisplayState, { kind: "sale" }> }) {
  const focus: DisplayLine | undefined =
    state.lines.find((l) => l.id === state.focusId) ?? state.lines[state.lines.length - 1];
  const recent = state.lines.slice(-6);
  const hidden = state.lines.length - recent.length;

  if (!focus) return null;

  return (
    <div className="flex h-full flex-col landscape:flex-row">
      {/* The product that was just scanned */}
      <section className="flex min-h-0 flex-1 items-center justify-center p-6 landscape:w-1/2">
        <div key={`${focus.id}-${state.seq}`} className="cd-pop w-full max-w-sm">
          <div className="aspect-[4/5] max-h-[48dvh] w-full overflow-hidden rounded-lg bg-white landscape:max-h-[58dvh]">
            {focus.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={focus.imageUrl} alt={focus.name} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-rose-light/40 px-6 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo.png" alt="" className="h-24 w-auto object-contain opacity-60" />
              </div>
            )}
          </div>
          {focus.brand && <p className="eyebrow mt-4 text-center">{focus.brand}</p>}
          <h2 className="mt-1 text-center font-serif text-3xl leading-tight">{focus.name}</h2>
          <p className="mt-2 text-center text-2xl text-taupe">
            {formatCedis(focus.price)}
            {focus.quantity > 1 ? ` x ${focus.quantity}` : ""}
          </p>
        </div>
      </section>

      {/* The running list and total */}
      <section className="flex flex-col justify-between border-t border-rose/20 bg-white/60 p-6 landscape:w-1/2 landscape:border-l landscape:border-t-0">
        <ul className="space-y-3 overflow-hidden">
          {hidden > 0 && (
            <li className="text-sm text-taupe">+ {hidden} earlier item{hidden === 1 ? "" : "s"}</li>
          )}
          {recent.map((l) => (
            <li key={l.id} className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate text-lg">
                {l.quantity > 1 ? `${l.quantity} x ` : ""}
                {l.name}
              </span>
              <span className="shrink-0 text-lg">{formatCedis(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-baseline justify-between border-t border-rose/30 pt-4">
          <span className="font-serif text-2xl">Total</span>
          <span key={state.total} className="cd-pop font-serif text-5xl">
            {formatCedis(state.total)}
          </span>
        </div>
      </section>
    </div>
  );
}
