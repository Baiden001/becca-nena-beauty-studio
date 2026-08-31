# Hero video

The homepage hero can show a looping background video instead of a
static image. Drop a file in here named exactly:

```
videos/hero.mp4
```

...and reload the page — no code changes needed. Until that file
exists, the hero just shows `images/hero.jpg` (or the brand-colored
placeholder if that doesn't exist either), so the site never breaks
while you're waiting on real footage.

## What to use

A short product/brand loop works best — think 10–20 seconds of
b-roll (hands unboxing a product, a swatch being applied, shelves of
product, etc.) that loops seamlessly and doesn't rely on sound, since
it autoplays muted.

## Technical notes

- **Format**: MP4 (H.264) — this is the one format that plays
  reliably across every browser and device without extra setup.
- **No sound needed** — the video plays muted automatically, so audio
  won't be heard regardless of what's in the file.
- **Keep the file small.** Under ~8–10MB is a good target for a
  homepage hero — anything larger will noticeably slow the page down,
  especially on mobile data. Compress with something like
  [HandBrake](https://handbrake.fr) (free) before uploading — aim for
  1080p or even 720p; a hero background doesn't need 4K.
- **Loop point matters.** If the first and last frame look similar,
  the loop will feel seamless instead of jumping. Trim for this if
  your editing tool allows it.
- **Poster frame**: `images/hero.jpg` (see `public/images/README.md`)
  doubles as the video's poster — the frame shown for the split
  second before the video loads, and what displays if `prefers-
  reduced-motion` is on (some users have this set for motion-
  sensitivity reasons; the video is hidden for them and the static
  image shows instead). Worth setting even once you add the video.

## If you don't want a video

Totally fine — just don't add a file here, and the hero stays a
static image (or the placeholder color, until you add
`images/hero.jpg`). Nothing else needs to change either way.
