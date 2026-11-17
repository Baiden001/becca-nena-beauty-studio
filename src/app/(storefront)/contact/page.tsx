import type { Metadata } from "next";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Contact Becca Nena Beauty Studio on WhatsApp or visit us in East Legon, Accra. Questions about a product or an order are welcome.",
  alternates: { canonical: "/contact" },
};


export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-2 font-serif text-4xl text-brown">Get in touch</h1>
      <p className="mt-4 text-taupe">
        Questions about a product or an existing order? Reach us directly.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <a
          href={waLink("Hi Becca Nena, I have a question.")}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-rose px-6 py-3 text-sm font-medium text-cream hover:bg-brown"
        >
          Message us on WhatsApp
        </a>
        <a
          href="https://instagram.com/the.bnb.studio"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brown underline underline-offset-2 hover:text-rose"
        >
          @the.bnb.studio on Instagram
        </a>
      </div>
    </main>
  );
}
