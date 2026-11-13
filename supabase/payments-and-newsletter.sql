-- Run this once in the Supabase SQL editor (after schema.sql).
-- Adds online-payment tracking to orders and a newsletter subscribers table.

-- ---------- Payments ----------
create type payment_status as enum ('pending', 'paid', 'failed');

alter table orders
  add column payment_status payment_status not null default 'pending',
  add column payment_reference text,
  add column payment_channel text,
  add column paid_at timestamptz;

create index idx_orders_payment_status on orders (payment_status);

-- ---------- Newsletter ----------
create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'footer',
  created_at timestamptz not null default now()
);

create unique index idx_newsletter_email_unique on newsletter_subscribers (lower(email));

-- Subscribing goes through a server action using the service-role key, so the
-- public never needs direct table access. Only staff can read/manage the list.
alter table newsletter_subscribers enable row level security;

create policy "staff full access newsletter_subscribers" on newsletter_subscribers
  for all using (fn_is_staff()) with check (fn_is_staff());
