import fs from "fs";
import path from "path";
import Image from "next/image";

function existsInPublic(relativePath: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", relativePath));
  } catch {
    return false;
  }
}

/**
 * For static, editorial layout imagery (hero, about section, Instagram
 * grid, collection tiles) — as opposed to product photos, which are
 * uploaded through the admin dashboard into Supabase Storage.
 *
 * Checks whether the file exists in /public at request time. If it does,
 * renders it; if not, renders the brand-colored placeholder box instead —
 * so the site never breaks while waiting on real photography, and adding
 * an image later is just a matter of dropping the file in with the right
 * name (see /public/images/README.md).
 */
export function LayoutImage({
  src,
  alt,
  aspectClassName = "aspect-[4/5]",
  bgClassName = "bg-rose-light/50",
  mode = "box",
  priority = false,
  sizes = "50vw",
}: {
  /** Path relative to /public, e.g. "images/hero.jpg" */
  src: string;
  alt: string;
  aspectClassName?: string;
  bgClassName?: string;
  /** "box" renders its own sized container; "cover" fills the parent
   *  (use when the parent already establishes position + aspect ratio,
   *  e.g. a collection tile with text overlaid on top). */
  mode?: "box" | "cover";
  priority?: boolean;
  sizes?: string;
}) {
  const exists = existsInPublic(src);
  const image = exists ? (
    <Image src={`/${src}`} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center">
      <span className="swatch-dot h-3 w-3" aria-hidden />
    </div>
  );

  if (mode === "cover") {
    return <div className={`absolute inset-0 ${exists ? "" : bgClassName}`}>{image}</div>;
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-sm ${aspectClassName} ${bgClassName}`}>
      {image}
    </div>
  );
}
