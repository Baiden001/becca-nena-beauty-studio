import Link from "next/link";
import { Search } from "lucide-react";
import { CartIndicator } from "@/components/cart-indicator";
import { MenuDrawer } from "@/components/menu-drawer";
import { Logo } from "@/components/logo";

// Minimal three-part header: menu on the left, logo dead-centre, search and
// bag on the right. The 1fr / auto / 1fr grid keeps the logo truly centred
// no matter how wide the left and right groups are.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rose/20 bg-cream/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6">
        <div className="flex justify-start">
          <MenuDrawer />
        </div>

        <Link
          href="/"
          aria-label="Becca Nena Beauty Studio, home"
          className="flex items-center justify-center"
        >
          <Logo size={22} />
        </Link>

        <div className="flex items-center justify-end gap-5">
          <Link
            href="/shop"
            aria-label="Search products"
            className="text-brown hover:text-rose"
          >
            <Search size={20} strokeWidth={1.75} />
          </Link>
          <CartIndicator />
        </div>
      </div>
    </header>
  );
}
