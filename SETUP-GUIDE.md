# Becca Nena: Payments, Newsletter, Header & Popup Setup Guide

## 1. What was added
- Paystack checkout (Mobile Money + card) after the customer fills in details
- Payment confirmed server-side; staff get a "PAID" email; admin shows Paid / Awaiting payment
- Minimal header (menu left, logo centre, search + bag right)
- Promo popup on site open (blurred background, X, button to /promotions); once per visit
- Newsletter signup at the top of the footer (saved to Supabase)
- New "How ordering works" steps
- Delivery is NOT charged on the site: customers pay the courier separately

## 2. Apply the files
1. Copy every file from the zip into the repo, same paths (overwrite).
2. DELETE: src/components/mobile-nav.tsx and src/components/promo-bar.tsx
3. Commit and push. Vercel redeploys automatically.

## 3. Supabase (once)
SQL Editor > paste supabase/payments-and-newsletter.sql > Run.
It adds payment columns to orders and the newsletter_subscribers table.
View subscribers later in Table Editor > newsletter_subscribers.

## 4. Paystack (the client's own account)
1. Sign up at paystack.com, country Ghana, with the owner's own details.
2. Settings > API Keys & Webhooks > copy the TEST secret key (sk_test_...).
3. Same page, set Webhook URL to: https://YOUR-SITE/api/paystack/webhook
4. Optional: add the business name and logo in the Paystack dashboard
   settings so customers see the brand on the payment page.

## 5. Vercel environment variables
Project > Settings > Environment Variables. Redeploy after changing any.

| Name | Value |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | already set |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | already set |
| SUPABASE_SERVICE_ROLE_KEY | already set |
| RESEND_API_KEY | already set |
| ORDER_NOTIFICATION_EMAIL | staff email that receives paid-order alerts |
| NEXT_PUBLIC_WHATSAPP_NUMBER | already set |
| NEXT_PUBLIC_SITE_URL | the live site URL, no trailing slash |
| PAYSTACK_SECRET_KEY | sk_test_... now, sk_live_... at go-live |

## 6. Test checklist (test key)
1. Add a product to the cart and check out; email is required.
2. You land on Paystack. Pay using Paystack's test card / test Mobile Money
   details (shown in Paystack's docs under "test payments").
3. You return to /order-confirmation/BN-xxxx showing "Payment received"
   and the order number. The cart empties.
4. Admin > Orders: the order shows Paid; the staff email arrives.
5. Start a checkout and close the Paystack page: the cart stays, the order
   shows Awaiting payment, and "Pay now" on the confirmation page retries.
6. Footer: subscribe with an email, then check the Supabase table.
7. Promo popup: needs a promotion with status Active whose start/end dates
   include today. Open the site in a fresh private tab to see it.

## 7. Go live
1. Paystack account activated (ID, TIN, payout account; names must match).
2. Domain connected in Vercel (Settings > Domains).
3. Update NEXT_PUBLIC_SITE_URL to the new domain.
4. Update the Paystack webhook URL to the new domain (set it in LIVE mode too).
5. Replace PAYSTACK_SECRET_KEY with the sk_live_ key (paste it straight into
   Vercel, never share it in chat or email). Redeploy.
6. Optional: verify the domain in Resend and set RESEND_FROM_EMAIL
   (e.g. "Becca Nena <orders@theirdomain.com>"). Resend's default sender can
   only email your own Resend account address, so customer emails need this.
7. Supabase > Authentication > URL settings: add the new domain.
8. Make one real small payment, confirm it shows Paid, then refund it.

## 8. Troubleshooting
- Paid on Paystack but order says Awaiting payment: webhook URL wrong or
  PAYSTACK_SECRET_KEY mismatched (test key with live payments or the reverse).
  The confirmation page also re-checks with Paystack on return.
- "We could not start your payment": PAYSTACK_SECRET_KEY missing or wrong;
  check Vercel > Logs.
- No staff email: check RESEND_API_KEY and ORDER_NOTIFICATION_EMAIL.
- Popup never shows: no Active promotion in date range, or already seen this
  visit (sessionStorage); try a private tab.
- Customer returns to the wrong website: NEXT_PUBLIC_SITE_URL still old.

## 9. Floating header and hero video
- The header has no background. On the homepage it floats over the hero in
  white, then turns brown once you scroll past it. Other pages: brown on cream.
- Hero video: save the file as public/videos/hero.mp4 (folder name "videos",
  plural). The hero picks it up automatically; hero.jpg shows until then.
  Use a short, muted, compressed clip (under about 5 MB) so mobile loads fast.
