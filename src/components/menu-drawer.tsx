"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { NAV_LINKS } from "@/lib/nav-links";
import { waLink } from "@/lib/whatsapp";

export function MenuDrawer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close on Escape and stop the page behind from scrolling while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="text-brown hover:text-rose"
      >
        <Menu size={24} strokeWidth={1.5} />
      </button>

      {/* Portalled to <body>: the header's backdrop blur would otherwise trap
          a fixed-position drawer inside the 64px header bar. */}
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-brown/30 backdrop-blur-sm"
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="drawer-in absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-cream px-6 py-5 shadow-xl"
            >
              <div className="flex h-8 items-center justify-between">
                <Logo size={20} />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="text-brown hover:text-rose"
                >
                  <X size={24} strokeWidth={1.5} />
                </button>
              </div>

              <nav className="mt-8 flex flex-col" aria-label="Main">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-rose/15 py-4 font-serif text-xl text-brown hover:text-rose"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto space-y-3 pt-8 text-sm text-taupe">
                <a
                  href={waLink("Hi Becca Nena, I have a question about your products.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-rose"
                >
                  WhatsApp us
                </a>
                <a
                  href="https://instagram.com/the.bnb.studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-rose"
                >
                  @the.bnb.studio
                </a>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
