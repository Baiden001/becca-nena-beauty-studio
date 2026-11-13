"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { CartIndicator } from "@/components/cart-indicator";
import { MenuDrawer } from "@/components/menu-drawer";
import { Logo } from "@/components/logo";

const HEADER_HEIGHT = 64; // h-16

// Floating header: no background, so it takes on whatever page is behind it.
// On the homepage it sits on top of the hero (image or video) in white; once
// you scroll past the hero it switches to the brand brown. On every other
// page it floats over the cream page background in brown.
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [overHero, setOverHero] = useState(isHome);

  useEffect(() => {
    if (!isHome) {
      setOverHero(false);
      return;
    }
    const update = () => {
      const hero = document.getElementById("hero");
      const heroHeight = hero?.offsetHeight ?? window.innerHeight * 0.8;
      setOverHero(window.scrollY < heroHeight - HEADER_HEIGHT);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isHome]);

  const light = isHome && overHero;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
          light ? "text-cream" : "text-brown"
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
