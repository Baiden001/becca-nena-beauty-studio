"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * One hero image. If the photo file is missing (or fails to load) it shows the
 * soft blush placeholder instead, so a slot without a photo never looks broken.
 *
 * The check happens in the browser on purpose: the server can't reliably look
 * inside the /public folder once the site is deployed.
 */
export function HeroImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  /** Path inside /public, e.g. "images/hero/hero-1.jpg" */
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A failure can happen before React is listening, so also check once mounted.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-rose-light/40">
      {failed ? (
        <div className="flex h-full w-full items-center justify-center">
          <span className="swatch-dot h-3 w-3" aria-hidden />
        </div>
      ) : (
        <Image
          ref={imgRef}
          src={`/${src}`}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
