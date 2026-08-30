"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { NAV_LINKS } from "@/lib/nav-links";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="text-brown hover:text-rose md:hidden"
      >
        {open ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 z-30 border-b border-rose/20 bg-cream shadow-sm md:hidden">
          <nav className="flex flex-col px-6 py-2" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-rose/10 py-3 text-sm text-brown last:border-0"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={waLink("Hi Becca Nena, I have a question about your products.")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="py-3 text-sm text-brown"
            >
              WhatsApp
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
