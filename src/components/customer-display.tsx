"use client";

import { useEffect, useState } from "react";
import { useDisplayState, type DisplayLine, type DisplayState } from "@/lib/customer-display";
import { formatCedis } from "@/lib/pricing";

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

function IdleView() {
  const images = useIdleImages();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [images.length]);

  if (images.length === 0) {
    // No idle pictures added yet: a calm welcome card with the logo.
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="Becca Nena Beauty Studio" className="h-[40dvh] w-auto object-contain" />
        <p className="font-serif text-3xl text-brown">Welcome</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
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
