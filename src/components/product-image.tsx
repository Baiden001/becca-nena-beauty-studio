import Image from "next/image";

export function ProductImage({
  src,
  alt,
  priority = false,
}: {
  src: string | null;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-rose-light/40">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="swatch-dot h-4 w-4 bg-rose" aria-hidden />
        </div>
      )}
    </div>
  );
}
