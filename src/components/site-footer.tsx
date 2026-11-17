import Link from "next/link";
import { waLink } from "@/lib/whatsapp";
import { HAIR_SITE } from "@/lib/links";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { POLICY_LINKS } from "@/lib/policies";
import { CookieSettingsItem } from "@/components/cookie-consent";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rose/20 bg-white">
      <div className="relative bg-rose-light/30 px-6 py-12 text-center">
        <p className="eyebrow">Stay in the loop</p>
        <h2 className="mt-2 font-serif text-2xl text-brown">
          New arrivals, offers and beauty edits, straight to your inbox.
        </h2>
        <div className="mt-6">
          <NewsletterSignup />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-3">
        <div>
          <p className="font-serif text-lg text-brown">Becca Nena Beauty Studio</p>
          <p className="mt-2 max-w-xs text-sm text-taupe">
            Premium cosmetics, curated for the way you actually get ready.
          </p>
        </div>

        <div>
          <p className="eyebrow">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-brown/80">
            <li><Link href="/shop" className="hover:text-rose">All products</Link></li>
            <li><Link href="/shop?collection=new-arrivals" className="hover:text-rose">New arrivals</Link></li>
            <li><Link href="/shop?collection=best-sellers" className="hover:text-rose">Best sellers</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">Get in touch</p>
          <ul className="mt-3 space-y-2 text-sm text-brown/80">
            <li>
              <a
                href={waLink("Hi Becca Nena, I'd like to ask about an order.")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-rose"
              >
                WhatsApp us
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com/the.bnb.studio"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-rose"
              >
                @the.bnb.studio
              </a>
            </li>
            <li>
              <a
                href={HAIR_SITE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-rose/60 underline-offset-4 hover:text-rose"
              >
                Visit {HAIR_SITE.name} ({HAIR_SITE.short})
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-rose/10 px-6 py-6 text-center text-xs text-taupe">
        <ul className="mx-auto mb-5 flex max-w-xl flex-wrap justify-center gap-x-6 gap-y-3 font-mono text-[13px] tracking-wide">
          {POLICY_LINKS.map((l) => (
            <li key={l.slug}>
              <span aria-hidden="true">· </span>
              <Link href={`/policies/${l.slug}`} className="hover:text-rose">
                {l.label}
              </Link>
            </li>
          ))}
          <CookieSettingsItem />
        </ul>
        <p>© {new Date().getFullYear()} Becca Nena Beauty Studio. All rights reserved.</p>
        <p className="mt-1">
          Designed By{" "}
          <a
            href="https://bales-solutions.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-rose/60 underline-offset-4 hover:text-rose"
          >
            Bales Solution
          </a>
        </p>
      </div>
    </footer>
  );
}
