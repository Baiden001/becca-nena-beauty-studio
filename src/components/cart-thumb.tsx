"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Small product photo for the cart and checkout. If the photo can't load
 * (e.g. it was replaced since the item was added), a soft placeholder shows
 * instead of a broken-image icon.
 */
export function CartThumb({ src, alt, className = "h-20 w-16" }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative flex-shrink-0 overflow-hidden rounded-sm bg-rose-light/40 ${className}`}>
      {src && !failed ? (
        <Image src={src} alt={alt} fill sizes="80px" className="object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="swatch-dot h-3 w-3 bg-rose/60" />
        </span>
      )}
    </div>
  );
}
