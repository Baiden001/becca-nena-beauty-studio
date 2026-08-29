# Becca Nena Beauty Studio

Next.js + TypeScript + Tailwind + Supabase, built from the PRD. This
README walks through everything needed to get the project running
from this zip — Supabase setup, environment variables, your first
admin login, and running it locally.

## 1. Prerequisites

- [Node.js](https://nodejs.org) 18.18 or newer
- A free [Supabase](https://supabase.com) account
- (Optional, for later) a [Resend](https://resend.com) account for
  order-notification emails, and a WhatsApp Business number

## 2. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick any name/region/password — the password is only for direct
   Postgres connections, not needed for this app.
3. Wait for the project to finish provisioning (~2 minutes).

## 3. Run the SQL files

In your Supabase project, go to the **SQL Editor** (left sidebar) →
**New query**. Run these files **in this exact order**, pasting each
one's full contents and clicking Run before moving to the next:

| Order | File | What it does |
|---|---|---|
| 1 | `supabase/schema.sql` | Creates every table, enum, trigger, and RLS policy. |
| 2 | `supabase/storage.sql` | Creates the `product-images` storage bucket and its access policies. |
| 3 | `supabase/seed.sql` | Adds sample categories, a collection, one product, one promotion — safe to skip if you'd rather start empty. |

`create-staff.sql` is **not** run yet — that comes after you have a
real user account (step 6).

## 4. Get your API keys

In Supabase: **Project Settings** (gear icon) → **API**. You'll need:

- **Project URL**
- **anon / public key**
- **service_role key** (click "Reveal" — keep this one secret, it
  bypasses all security rules)

## 5. Configure environment variables

In the unzipped project folder:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The rest (`RESEND_API_KEY`, `ORDER_NOTIFICATION_EMAIL`,
`NEXT_PUBLIC_WHATSAPP_NUMBER`) can stay blank for now — the app
still runs without them, it just skips sending order emails and the
WhatsApp links won't have a number attached until you set one.

## 6. Create your first admin account

There's no signup page by design — staff accounts are created by an
existing admin. For your very first account, do it manually:

1. In Supabase: **Authentication** → **Users** → **Add user** →
   **Create new user**. Set an email and password you'll remember,
   and toggle **Auto Confirm User** on.
2. Copy that user's **UID** (shown in the users table).
3. Back in the **SQL Editor**, open `supabase/create-staff.sql`,
   replace the placeholder UUID/name/email with your real ones, set
   the role to `'owner_admin'`, and run it.

You now have one owner account. Every account after this one can be
created normally, from inside the app — see step 9.

## 7. Install and run

```bash
npm install
npm run dev
```

- Storefront: [localhost:3000](http://localhost:3000)
- Admin login: [localhost:3000/admin/login](http://localhost:3000/admin/login)

Sign in with the email/password from step 6. If you ran
`seed.sql`, the homepage should show 5 category pills and one
product; if you skipped it, the site will still load, just empty
until you add products from the admin dashboard.

## 8. Add images

- **Product photos**: Admin → Products → Add/Edit product → the
  photo uploader in the form uploads directly to the
  `product-images` bucket created in step 3 — no separate storage
  step needed.
- **Layout/editorial images** (hero, about section, Instagram grid,
  collection tiles): drop files into `public/images/` with the exact
  names listed in `public/images/README.md`. No code changes needed
  — until a file exists, that slot just shows a brand-colored
  placeholder instead of breaking.

## 9. Invite the rest of your team

**Admin → Team & Access** (only visible to `owner_admin`) → fill in
name, email, and role, **Send invite**. Supabase emails them a link
to set their own password. Sales staff accounts only see Dashboard,
Orders, and Customers; owner/admin sees everything.

## 10. Going live (when you're ready)

- Push this project to a GitHub repo.
- Deploy on [Vercel](https://vercel.com): import the repo, add the
  same environment variables from `.env.local` in Vercel's project
  settings, deploy.
- Add your production domain's URL to Supabase: **Authentication →
  URL Configuration → Site URL / Redirect URLs** (needed for staff
  invite emails to link back correctly).
- Set `RESEND_API_KEY` and `ORDER_NOTIFICATION_EMAIL` once you want
  order emails going to the boss's real inbox.
- Set `NEXT_PUBLIC_WHATSAPP_NUMBER` to the real business number
  (international format, digits only, e.g. `233241234567`).

## What's in the project

- `supabase/schema.sql` — full database schema: products (with
  derived sale price + stock status via triggers), categories,
  collections, variants, images, customers, orders/order_items
  (price captured at time of sale), inventory_transactions
  (auto-adjusts product stock), promotions, staff users, RLS
  policies (public can read published/active content and create
  guest orders; staff have full access via a `fn_is_staff()` check).
- `supabase/storage.sql` — the `product-images` bucket and its
  policies (public read, staff-only write).
- `supabase/seed.sql` — sample data for local testing.
- `supabase/create-staff.sql` — bootstraps your first owner account.
- `src/lib/supabase/` — three clients: `client.ts` (browser),
  `server.ts` (Server Components / Route Handlers, cookie-aware),
  `admin.ts` (service-role, server-only — for the order-notification
  email and staff invites, both of which must bypass RLS).
- `src/lib/supabase/require-staff.ts` — `getCurrentStaff()` and
  `requireOwnerAdmin()`, the session/role guards used across `/admin`.
- `src/middleware.ts` — refreshes the Supabase auth session cookie on
  `/admin/*` routes.
- `src/types/database.ts` — hand-written types matching the schema.
  Swap for real generated types once the project exists:
  `npx supabase gen types typescript --project-id <ref> > src/types/database.ts`.
  Note: `@supabase/supabase-js` and `@supabase/ssr` are pinned to
  exact versions in `package.json` — a caret range pulls in a newer
  `postgrest-js` with an incompatible generic shape that breaks
  these hand-written types. Don't loosen those to `^` without
  re-verifying the build.
- `tailwind.config.ts` — brand palette from the PRD (dusty rose,
  cream, deep brown, taupe, blush, sage).
- **Storefront** (`src/app/`) — home, shop (search/filter/sort),
  product detail, cart, guest checkout, order confirmation,
  promotions/about/contact. Cart is client-side (persisted to
  localStorage); checkout calls a `placeOrder` server action.
- **Admin dashboard** (`src/app/admin/`) — protected by a
  `(dashboard)` route group so `/admin/login` sits outside the auth
  guard (avoids a redirect loop). Dashboard overview, orders
  (status changes — confirming an order auto-decrements stock),
  products (pricing/discount/variants/photo upload, stock
  adjustment + history), categories, collections (with a product
  picker), promotions, customers, and Team & Access (invite staff,
  change roles, remove staff). Products/Categories/Collections/
  Promotions/Team are gated to `owner_admin`; sales staff can access
  Dashboard, Orders, and Customers per the PRD's permission table
  (section 27).

## Not built yet (next steps)

- Order-notification email is wired to Resend but untested against a
  real account — confirm formatting once `RESEND_API_KEY` is set
- Reviews section on the homepage (PRD mentions it but it isn't in
  the section 32 schema or the MVP scope list — would need a
  `reviews` table plus an approval step in the admin dashboard if
  you want it)
- Fine-grained per-module permissions beyond the owner/sales-staff
  split (PRD section 27 calls this "configurable if required")

Order numbers are generated automatically by the database
(`BN-1000`, `BN-1001`, ...) — no application-level logic needed for
that part.
