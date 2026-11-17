# SEO and cookies

## SEO: what was added
- Page titles and descriptions for every page (template: "Page | Becca Nena Beauty Studio")
- Product pages: own title, description, share image, canonical address, and
  Product structured data (price in GHS, stock, brand, SKU, barcode) so Google
  can show price and availability
- Shop and category pages: category titles; searches and sorted lists are
  kept out of search results
- Store structured data (name, logo, address, phone, Instagram) and a site
  search box description for Google
- /sitemap.xml (lists every published product and category, updates itself)
- /robots.txt (keeps /admin, /cart, /checkout, /api out)
- Share preview image (public/images/og-default.jpg) for WhatsApp, Facebook, X
- The admin, cart, checkout and order confirmation pages are never indexed

## IMPORTANT: the site stays hidden from Google on a vercel.app address
While NEXT_PUBLIC_SITE_URL is a vercel.app address the whole site tells search
engines not to list it (so the test copy never competes with the real domain).
It switches on by itself when NEXT_PUBLIC_SITE_URL is changed to the real
domain, e.g. https://beccanenabeautystudio.com, and the site is redeployed.

## After the real domain is live
1. Set NEXT_PUBLIC_SITE_URL to the real domain. Redeploy.
2. Google Search Console: add the property, copy the "HTML tag" code, put the
   code value in NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION, redeploy, then verify.
3. In Search Console submit https://yourdomain/sitemap.xml
4. Check a product link in https://search.google.com/test/rich-results
5. Give every product a description and photo: that is what ranks.

## Cookies
Nothing optional is loaded and NO banner shows until you set one of these in
Vercel and redeploy:
- NEXT_PUBLIC_GA_ID          (Google Analytics 4, looks like G-XXXXXXXXXX)
- NEXT_PUBLIC_META_PIXEL_ID  (Meta Pixel ID, digits)
Then visitors see a banner: Accept all / Essential only / Choose. The tools load
only after they agree. A "Cookie settings" link appears in the footer so they
can change their mind. The Cookie policy page lists what is used.
Update the Privacy policy if you add other tracking tools.
