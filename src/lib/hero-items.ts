// The images that drift across the homepage hero.
//
// Each image can show several products together (a group shot or flat lay).
// Save the photos in public/images/hero/ using the file names below (JPG,
// 900 x 1125 px, plain background, no text). Until a photo exists, that slot
// shows a soft blush placeholder, so the hero never looks broken.
//
// Add, remove or reorder freely. 8 works well; keep an even number so the two
// desktop columns stay balanced.
export interface HeroItem {
  /** Path inside /public */
  image: string;
  /** Short description for screen readers, e.g. "Body wash and lotions". */
  alt: string;
}

export const HERO_ITEMS: HeroItem[] = [
  { image: "images/hero/hero-1.jpg", alt: "Skincare essentials" },
  { image: "images/hero/hero-2.jpg", alt: "Body washes and lotions" },
  { image: "images/hero/hero-3.jpg", alt: "Cleansers and moisturisers" },
  { image: "images/hero/hero-4.jpg", alt: "Body oils and butters" },
  { image: "images/hero/hero-5.jpg", alt: "Lip care and sunscreen" },
  { image: "images/hero/hero-6.jpg", alt: "Scrubs and body care" },
  { image: "images/hero/hero-7.jpg", alt: "Hand and body care" },
  { image: "images/hero/hero-8.jpg", alt: "Daily beauty favourites" },
];
