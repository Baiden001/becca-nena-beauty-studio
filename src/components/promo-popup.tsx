"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface PopupPromo {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ctaText: string | null;
}

export function PromoPopup({ promo }: { promo: PopupPromo }) {
  const [open, setOpen] = useState(false);
  const seenKey = `becca-nena-promo-seen-${promo.id}`;

  // Opens shortly after the site loads, once per visit (a new browser
  // session shows it again; moving between pages doesn't re-trigger it).
  // Keyed on the promotion id, so a brand-new promotion always shows.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(seenKey)) return;
      window.sessionStorage.setItem(seenKey, "1");
    } catch {
      // Storage blocked: still show it, just can't remember it.
    }
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [seenKey]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      {/* Blurred, dimmed site behind the popup. Tapping it closes the popup. */}
      <button
        aria-label="Close promotion"
        onClick={close}
        className="absolute inset-0 bg-brown/40 backdrop-blur-md"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-popup-title"
        className="popup-in relative w-full max-w-md overflow-hidden rounded-lg bg-cream shadow-2xl"
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 text-brown shadow-sm hover:text-rose"
        >
          <X size={18} strokeWidth={1.75} />
        </button>

        {promo.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={promo.imageUrl}
            alt=""
            className="aspect-[16/9] w-full object-cover"
          />
        )}

        <div className="px-7 pb-8 pt-7 text-center">
          <p className="eyebrow">Promotion</p>
          <h2
            id="promo-popup-title"
            className="mt-2 font-serif text-2xl leading-snug text-brown"
          >
            {promo.title}
          </h2>
          {promo.description && (
            <p className="mt-3 text-sm text-taupe">{promo.description}</p>
          )}
          <Link
            href="/promotions"
            onClick={close}
            className="mt-6 inline-block rounded-full bg-rose px-7 py-3 text-sm font-medium text-cream transition-colors hover:bg-brown"
          >
            {promo.ctaText || "View promotions"}
          </Link>
        </div>
      </div>
    </div>
  );
}
