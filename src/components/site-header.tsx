"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { CartIndicator } from "@/components/cart-indicator";
import { MenuDrawer } from "@/components/menu-drawer";
import { Logo } from "@/components/logo";

const SCROLL_THRESHOLD = 40; // px scrolled before the header gets its background

// Floating header. At the very top it's fully transparent: on the homepage it
// sits on the hero (image or video) in white. Once you scroll, it gets a
// frosted cream background and switches to the brand brown so it stays
// readable over products and text.
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // White only while transparent over the hero.
  const light = isHome && !scrolled;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${
          scrolled
            ? "border-rose/20 bg-cream/95 text-brown backdrop-blur"
            : `border-transparent ${light ? "text-cream" : "text-brown"}`
        }`}
      >
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6">
          <div className="flex justify-start">
            <MenuDrawer />
          </div>

          <Link
            href="/"
            aria-label="Becca Nena Beauty Studio, home"
            className="flex items-center justify-center"
          >
            <Logo size={22} light={light} />
          </Link>

          <div className="flex items-center justify-end gap-5">
            <Link
              href="/shop"
              aria-label="Search products"
              className="hover:text-rose"
            >
              <Search size={20} strokeWidth={1.75} />
            </Link>
            <CartIndicator />
          </div>
        </div>
      </header>

      {/* A fixed header no longer takes up space, so every page except the
          homepage (whose hero should reach the very top) gets a spacer. */}
      {!isHome && <div aria-hidden className="h-16" />}
    </>
  );
}
