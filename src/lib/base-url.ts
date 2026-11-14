import { headers } from "next/headers";

// Where Paystack should send the customer back to after paying. The address
// the customer is actually browsing on is the safest choice: it can't go
// stale, and the cart (stored in the browser per website address) is still
// there when they return. NEXT_PUBLIC_SITE_URL is only a fallback.
export function getBaseUrl(): string {
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

  if (host) {
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    return `${isLocal ? "http" : "https"}://${host}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  throw new Error("Could not work out the site address for the payment callback");
}
