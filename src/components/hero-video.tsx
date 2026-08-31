import { existsInPublic } from "@/lib/public-file";

/**
 * A full-bleed, autoplaying, looping background video for the hero —
 * checked the same way LayoutImage checks for a static image: if
 * /public/videos/hero.mp4 exists, it renders; if not, this renders
 * nothing and the caller should fall back to a static image instead.
 *
 * Muted + playsInline + loop are required for autoplay to actually work
 * across mobile browsers (notably iOS Safari, which blocks autoplay on
 * anything with sound or without playsInline). Respects
 * prefers-reduced-motion by hiding the video via CSS — pair this with a
 * static image or color sitting behind it (lower z-index) so something
 * still shows when the video is hidden.
 */
export function HeroVideo() {
  const videoExists = existsInPublic("videos/hero.mp4");
  if (!videoExists) return null;

  const posterExists = existsInPublic("images/hero.jpg");

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      poster={posterExists ? "/images/hero.jpg" : undefined}
      className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
    >
      <source src="/videos/hero.mp4" type="video/mp4" />
    </video>
  );
}
