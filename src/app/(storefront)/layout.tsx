import { CartProvider } from "@/lib/cart-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PromoPopupLoader } from "@/components/promo-popup-loader";
import { CookieConsent } from "@/components/cookie-consent";
import { AnalyticsScripts } from "@/components/analytics-scripts";
import { JsonLd } from "@/components/json-ld";
import { SITE, absoluteUrl } from "@/lib/site";
import { POLICY_CONFIG } from "@/lib/policies";

// Tells search engines who the shop is, where it is, and how to search it.
const shopData = [
  {
    "@context": "https://schema.org",
    "@type": ["Store", "HealthAndBeautyBusiness"],
    "@id": absoluteUrl("/#store"),
    name: SITE.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl(SITE.logoPath),
    image: absoluteUrl(SITE.ogImagePath),
    description: SITE.description,
    telephone: SITE.phone,
    address: { "@type": "PostalAddress", ...SITE.address },
    sameAs: [SITE.instagram],
    currenciesAccepted: "GHS",
    paymentAccepted: "Cash, Credit Card, Mobile Money",
    priceRange: "GH₵",
    areaServed: [
      { "@type": "City", name: "Accra" },
      { "@type": "Country", name: "Ghana" },
    ],
    ...(SITE.openingHours.length ? { openingHours: SITE.openingHours } : {}),
    ...(SITE.mapUrl ? { hasMap: SITE.mapUrl } : {}),
    // Return policy once for the whole shop, so every product shows it in Google.
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "GH",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: POLICY_CONFIG.returnWindowDays,
      merchantReturnLink: absoluteUrl("/policies/refund-policy"),
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/shop")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
];

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <JsonLd data={shopData} />
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <PromoPopupLoader />
      <CookieConsent />
      <AnalyticsScripts />
    </CartProvider>
  );
}
