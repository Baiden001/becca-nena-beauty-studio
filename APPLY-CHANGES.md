# How to apply these changes

1. Copy every file in this folder into your repo, keeping the same paths
   (they overwrite the old versions).
2. DELETE these two old files from the repo:
   - src/components/mobile-nav.tsx
   - src/components/promo-bar.tsx
3. In Supabase > SQL Editor, run supabase/payments-and-newsletter.sql once.
4. In Vercel > Project > Settings > Environment Variables, add
   PAYSTACK_SECRET_KEY (use your sk_test_... key first), then redeploy.
5. In the Paystack dashboard > Settings > API Keys & Webhooks, set the
   webhook URL to https://YOUR-DOMAIN/api/paystack/webhook

Developers can instead run: git apply becca-nena-changes.patch
