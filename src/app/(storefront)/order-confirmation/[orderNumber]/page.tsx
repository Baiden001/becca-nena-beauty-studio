import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { waLink } from "@/lib/whatsapp";

export default async function OrderConfirmationPage({
  params,
}: {
  params: { orderNumber: string };
}) {
  const supabase = createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("order_number")
    .eq("order_number", params.orderNumber)
    .maybeSingle();

  if (!order) notFound();

  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <span className="swatch-dot h-4 w-4 bg-sage" aria-hidden />
      <p className="eyebrow mt-4">Order Received</p>
      <h1 className="mt-2 font-serif text-3xl text-brown">#{order.order_number}</h1>
      <p className="mt-4 text-taupe">
        Thank you for shopping with Becca Nena Beauty Studio. Our sales team
        will contact you shortly via WhatsApp or phone to confirm payment and
        delivery details.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/shop"
          className="rounded-full border border-brown px-6 py-3 text-sm font-medium text-brown hover:border-rose hover:text-rose"
        >
          Continue Shopping
        </Link>
        <a
          href={waLink(`Hi Becca Nena, following up on my order #${order.order_number}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-rose px-6 py-3 text-sm font-medium text-cream hover:bg-brown"
        >
          Contact Us on WhatsApp
        </a>
      </div>
    </main>
  );
}
