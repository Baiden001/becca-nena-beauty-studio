-- =========================================================
-- Split payments for walk-in sales
-- e.g. a GH₵240 sale paid GH₵100 by Mobile Money and GH₵140 in cash.
--
-- Run ONCE in Supabase → SQL Editor, BEFORE the website update that uses it.
-- Safe for the current till: sales recorded the old way keep working, and
-- each gets one payment line automatically.
-- =========================================================

-- One row per part of a payment. A sale paid one way has one row.
create table if not exists order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  method payment_method not null,
  amount numeric(10, 2) not null check (amount > 0),
  -- MoMo transaction ID, card slip number, etc. Optional.
  reference text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_payments_order on order_payments (order_id);

alter table order_payments enable row level security;

drop policy if exists "staff full access order_payments" on order_payments;
create policy "staff full access order_payments" on order_payments
  for all using (fn_is_staff()) with check (fn_is_staff());

-- Existing walk-in sales: one payment line each, so reports treat old and
-- new sales the same way.
insert into order_payments (order_id, method, amount, created_at)
select o.id, o.payment_method, o.estimated_total, coalesce(o.paid_at, o.created_at)
from orders o
where o.channel = 'walk_in'
  and o.payment_method is not null
  and o.estimated_total > 0
  and not exists (select 1 from order_payments p where p.order_id = o.id);

-- ---------- The sale function, now with split payments ----------
-- p_payments: [{ method, amount, reference }]. Leave it out (null) for a sale
-- paid one way: the whole total is recorded against p_payment_method.
-- The payments must add up to exactly the sale total, or nothing is saved.
drop function if exists fn_record_walk_in_sale(uuid, uuid, payment_method, text, jsonb);

create or replace function fn_record_walk_in_sale(
  p_customer_id uuid,
  p_sold_by uuid,
  p_payment_method payment_method,
  p_notes text,
  p_lines jsonb,            -- [{ product_id, quantity, regular_price, final_price }]
  p_payments jsonb default null
)
returns table (out_order_id uuid, out_order_number text)
language plpgsql
as $$
declare
  v_line jsonb;
  v_product products%rowtype;
  v_qty integer;
  v_regular numeric(10, 2);
  v_final numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_total numeric(10, 2) := 0;
  v_paid numeric(10, 2) := 0;
  v_pay jsonb;
  v_order_id uuid;
  v_order_number text;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'There are no items in this sale.';
  end if;

  -- Pass 1: lock every product, check stock, add up the totals.
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_line ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity.';
    end if;

    select * into v_product
    from products
    where id = (v_line ->> 'product_id')::uuid
    for update;

    if not found then
      raise exception 'A product in this sale no longer exists.';
    end if;

    if v_product.stock_quantity < v_qty then
      raise exception 'Not enough stock for %: only % left.', v_product.name, v_product.stock_quantity;
    end if;

    v_subtotal := v_subtotal + (v_line ->> 'regular_price')::numeric * v_qty;
    v_total := v_total + (v_line ->> 'final_price')::numeric * v_qty;
  end loop;

  -- Split payments must add up to the total, to the pesewa.
  if p_payments is not null and jsonb_array_length(p_payments) > 0 then
    for v_pay in select * from jsonb_array_elements(p_payments) loop
      if coalesce((v_pay ->> 'amount')::numeric, 0) <= 0 then
        raise exception 'Each payment must be more than zero.';
      end if;
      v_paid := v_paid + (v_pay ->> 'amount')::numeric;
    end loop;
    if abs(v_paid - v_total) > 0.009 then
      raise exception 'The payments (GH₵%) do not add up to the sale total (GH₵%).', v_paid, v_total;
    end if;
  end if;

  insert into orders (
    customer_id, status, subtotal, discount_total, estimated_total,
    delivery_location, notes, channel, payment_method,
    payment_status, paid_at, sold_by
  ) values (
    p_customer_id, 'completed', v_subtotal, v_subtotal - v_total, v_total,
    'In store', p_notes, 'walk_in', p_payment_method,
    'paid', now(), p_sold_by
  )
  returning orders.id, orders.order_number into v_order_id, v_order_number;

  -- How it was paid.
  if p_payments is not null and jsonb_array_length(p_payments) > 0 then
    insert into order_payments (order_id, method, amount, reference)
    select v_order_id,
           (p ->> 'method')::payment_method,
           (p ->> 'amount')::numeric,
           nullif(trim(coalesce(p ->> 'reference', '')), '')
    from jsonb_array_elements(p_payments) as p;
  elsif v_total > 0 then
    insert into order_payments (order_id, method, amount)
    values (v_order_id, p_payment_method, v_total);
  end if;

  -- Pass 2: items + stock movements (the existing trigger lowers stock).
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_line ->> 'quantity')::integer;
    v_regular := (v_line ->> 'regular_price')::numeric;
    v_final := (v_line ->> 'final_price')::numeric;

    select * into v_product
    from products where id = (v_line ->> 'product_id')::uuid;

    insert into order_items (
      order_id, product_id, product_name, quantity,
      regular_price, discount_amount, final_price, subtotal
    ) values (
      v_order_id, v_product.id, v_product.name, v_qty,
      v_regular, (v_regular - v_final) * v_qty, v_final, v_final * v_qty
    );

    insert into inventory_transactions (
      product_id, quantity_change, reason, order_id, created_by
    ) values (
      v_product.id, -v_qty, 'In-store sale #' || v_order_number, v_order_id, p_sold_by
    );
  end loop;

  return query select v_order_id, v_order_number;
end;
$$;

-- Only the server (service role) may call it, never the public API.
revoke all on function fn_record_walk_in_sale(uuid, uuid, payment_method, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function fn_record_walk_in_sale(uuid, uuid, payment_method, text, jsonb, jsonb)
  to service_role;

-- Check: should list the new table and how many sales now have payment lines.
select
  (select count(*) from order_payments) as payment_lines,
  (select count(*) from orders where channel = 'walk_in') as walk_in_sales;
