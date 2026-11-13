import { createHmac, timingSafeEqual } from "crypto";

const BASE_URL = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is missing");
  return key;
}

export interface PaystackInitResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackTransaction {
  status: string; // "success" | "failed" | "abandoned" | "pending" | ...
  reference: string;
  amount: number; // in pesewas
  currency: string;
  channel: string | null; // "card" | "mobile_money" | ...
}

/**
 * Starts a hosted Paystack checkout. Amount is in pesewas (GH₵1 = 100).
 * Restricted to the two channels the studio accepts: card and Mobile Money.
 */
export async function initializeTransaction(input: {
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResult> {
  const res = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountPesewas,
      currency: "GHS",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["card", "mobile_money"],
      metadata: input.metadata,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status || !json?.data?.authorization_url) {
    throw new Error(
      `Paystack initialize failed (${res.status}): ${json?.message ?? "no message"}`
    );
  }
  return json.data as PaystackInitResult;
}

/** Asks Paystack directly what happened to a transaction (never trust the browser). */
export async function verifyTransaction(
  reference: string
): Promise<PaystackTransaction> {
  const res = await fetch(
    `${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey()}` },
      cache: "no-store",
    }
  );

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status || !json?.data) {
    throw new Error(
      `Paystack verify failed (${res.status}): ${json?.message ?? "no message"}`
    );
  }
  return json.data as PaystackTransaction;
}

/** Webhook calls carry an HMAC-SHA512 of the raw body, signed with the secret key. */
export function isValidWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
