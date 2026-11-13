import { LayoutImage } from "@/components/layout-image";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow">About</p>
      <h1 className="mt-2 font-serif text-4xl text-brown">Becca Nena Beauty Studio</h1>
      <div className="mt-6">
        <LayoutImage
          src="videos/about-page.mp4"
          alt="Becca Nena Beauty Studio"
          aspectClassName="aspect-[9/16]"
          bgClassName="bg-taupe/20"
          priority
          sizes="(min-width: 640px) 768px, 100vw"
        />
      </div>
      <p className="mt-8 max-w-xl text-brown/90">
        Becca Nena is a premium cosmetics studio based in Accra. We curate
        makeup, skincare, body care, hair care, and fragrance the way we&apos;d
        recommend it to a friend. No clutter, no guesswork, just an edit
        worth trusting.
      </p>
      <p className="mt-4 max-w-xl text-brown/90">
        Every order is confirmed personally by our sales team over WhatsApp
        or phone, so you always know exactly what&apos;s happening with your
        beauty essentials.
      </p>
    </main>
  );
}
