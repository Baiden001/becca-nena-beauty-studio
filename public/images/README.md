# Layout images

These are the site's editorial/decorative images — hero, about section,
Instagram grid, curated collection tiles — as opposed to **product
photos**, which are uploaded through the admin dashboard (Products →
Add/Edit → photo uploader) into Supabase Storage.

To add or change one of these, just drop a file with the exact name
below into this folder (or the `collections/` subfolder) and reload
the page — no code changes needed. Until a file exists, that slot
shows a brand-colored placeholder instead, so the site never breaks
while you're waiting on real photography.

| File | Used on | Recommended shape |
|---|---|---|
| `images/hero.jpg` | Homepage hero — full-bleed background image (and used as the video's poster frame, see `public/videos/README.md`) | Landscape, ~16:9, at least 1600px wide |
| `images/about.jpg` | Homepage "About Becca Nena" section | Landscape, ~4:3 |
| `images/about-page.jpg` | `/about` page | Wide, ~16:9 |
| `images/instagram-1.jpg` … `images/instagram-6.jpg` | Homepage Instagram grid (6 tiles) | Square, 1:1 |
| `images/collections/<collection-slug>.jpg` | Homepage "Curated edits" tile background | Landscape, ~4:3 |

For collection tiles, the filename must match that collection's
**slug** exactly (the same slug used in its URL, e.g.
`the-pink-edit` → `images/collections/the-pink-edit.jpg`). You can
find/set a collection's slug in Admin → Collections.

Formats: JPG, PNG, or WebP all work. Keep files reasonably
compressed (under ~500KB each) — Next.js will still resize and
optimize them for different screen sizes automatically, but a
smaller source file means a faster build and a lighter page.
