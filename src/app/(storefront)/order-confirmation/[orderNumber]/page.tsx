import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack";
import { markOrderPaid } from "@/lib/payments";
import { waLink } from "@/lib/whatsapp";
import { ClearCartOnPaid } from "@/components/clear-cart-on-paid";
import { RetryPaymentButton } from "@/components/retry-payment-button";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: { orderNumber: string };
  searchParams: { reference?: string; trxref?: string };
}) {
  const supabase = createAdminClient();

  const load = () =>
    supabase
      .from("orders")
      .select("order_number, payment_status")
      .eq("order_number", params.orderNumber)
      .maybeSingle();

  let { data: order, error } = await load();

  if (error) {
    console.error("[order-confirmation] failed to fetch order:", error);
    notFound();
  }
  if (!order) notFound();

  // When Paystack sends the customer back, ask Paystack directly what
  // happened — the webhook may still be on its way, and the URL alone
  // proves nothing.
  let attempt: "success" | "failed" | "unknown" = "unknown";
  const reference = searchParams.reference || searchParams.trxref;

  if (
    order.payment_status !== "paid" &&
    reference &&
    reference.startsWith(`${order.order_number}-`)
  ) {
    try {
      const tx = await verifyTransaction(reference);
      if (tx.status === "success") {
        const result = await markOrderPaid(tx);
        if (result.ok) attempt = "success";
      } else if (["failed", "abandoned", "reversed"].includes(tx.status)) {
        attempt = "failed";
      }
    } catch (err) {
      console.error("[order-confirmation] verify failed:", err);
    }
    ({ data: order } = await load());
    if (!order) notFound();
  }

  const paid = order.payment_status === "paid";
  const failed = !paid && attempt === "failed";

  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      {paid && <ClearCartOnPaid orderNumber={order.order_number} />}

      <span
        className={`swatch-dot h-4 w-4 ${paid ? "bg-sage" : failed ? "bg-red-400" : "bg-rose-light"}`}
        aria-hidden
      />

      <p className="eyebrow mt-4">
        {paid ? "Payment received" : failed ? "Payment not completed" : "Confirming payment"}
      </p>

      <h1 className="mt-2 font-serif text-3xl text-brown">#{order.order_number}</h1>

      {paid && (
        <p className="mt-4 text-taupe">
          Thank you for shopping with Becca Nena Beauty Studio. Your payment
          went through. Our team will contact you shortly via WhatsApp or phone
          to confirm delivery.
        </p>
      )}

      {failed && (
        <p className="mt-4 text-taupe">
          Your payment didn&apos;t go through and you haven&apos;t been charged.
          Your items are still in your cart, so you can try again whenever
          you&apos;re ready.
        </p>
      )}

      {!paid && !failed && (
        <p className="mt-4 text-taupe">
          We&apos;re waiting for confirmation from Paystack. This usually takes
          a few seconds. Refresh this page in a moment. If you approved a
          Mobile Money prompt and your payment still doesn&apos;t show, message
          us on WhatsApp with your order number.
        </p>
      )}

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {!paid && <RetryPaymentButton orderNumber={order.order_number} />}

        <Link
          href="/shop"
          className="rounded-full border border-brown px-6 py-3 text-sm font-medium text-brown hover:border-rose hover:text-rose"
        >
          {paid ? "Continue Shopping" : "Back to shop"}
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
