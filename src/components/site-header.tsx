import Link from "next/link";
import { CartIndicator } from "@/components/cart-indicator";
import { Logo } from "@/components/logo";
import { waLink } from "@/lib/whatsapp";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop", label: "Categories" },
  { href: "/promotions", label: "Promotions" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rose/20 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={26} />
          <span className="font-serif text-xl tracking-tight text-brown">Becca Nena</span>
        </Link>

        <nav className="hidden gap-8 md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-brown/80 transition-colors hover:text-rose"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link
            href="/shop"
            aria-label="Search products"
            className="hidden text-sm text-brown hover:text-rose sm:inline"
          >
            Search
          </Link>
          <a
            href={waLink("Hi Becca Nena, I have a question about your products.")}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-sm text-brown hover:text-rose sm:inline"
          >
            WhatsApp
          </a>
          <CartIndicator />
        </div>
      </div>
    </header>
  );
}
