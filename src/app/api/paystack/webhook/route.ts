import { NextResponse } from "next/server";
import { isValidWebhookSignature } from "@/lib/paystack";
import { markOrderPaid } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paystack calls this URL after every charge. This is the reliable way to
 * learn a payment succeeded — the customer's browser may close before the
 * redirect back to the site ever happens.
 *
 * Set it in the Paystack dashboard: Settings → API Keys & Webhooks →
 *   https://YOUR-DOMAIN/api/paystack/webhook
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  let valid = false;
  try {
    valid = isValidWebhookSignature(rawBody, request.headers.get("x-paystack-signature"));
  } catch (error) {
    console.error("[paystack-webhook] signature check failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (!valid) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      amount?: number;
      currency?: string;
      channel?: string | null;
      status?: string;
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    const d = event.data;
    const result = await markOrderPaid({
      reference: d.reference!,
      amount: Number(d.amount ?? 0),
      currency: d.currency ?? "",
      channel: d.channel ?? null,
    });
    if (!result.ok) {
      console.error("[paystack-webhook] could not mark paid:", result.reason, d.reference);
    }
  }

  // Always 200 for valid, signed events so Paystack doesn't keep retrying.
  return NextResponse.json({ ok: true });
}
