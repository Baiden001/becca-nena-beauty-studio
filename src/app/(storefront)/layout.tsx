import { CartProvider } from "@/lib/cart-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PromoBar } from "@/components/promo-bar";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <PromoBar />
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </CartProvider>
  );
}
