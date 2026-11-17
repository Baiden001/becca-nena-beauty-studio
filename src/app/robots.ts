import type { MetadataRoute } from "next";
import { isLive, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Test copies (the vercel.app address) stay out of search engines.
  if (!isLive()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/cart", "/checkout", "/order-confirmation"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
