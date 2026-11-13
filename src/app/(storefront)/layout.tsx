import { CartProvider } from "@/lib/cart-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PromoPopupLoader } from "@/components/promo-popup-loader";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <PromoPopupLoader />
    </CartProvider>
  );
}
