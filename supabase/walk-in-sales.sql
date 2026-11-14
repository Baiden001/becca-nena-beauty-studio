-- =========================================================
-- Walk-in (in-store) sales + product barcodes
-- Run once in the Supabase SQL editor, AFTER schema.sql and
-- payments-and-newsletter.sql.
-- =========================================================

-- ---------- Barcode / serial number on products ----------
alter table products add column barcode text;

-- Two products can't share a barcode (blank barcodes are fine).
create unique index idx_products_barcode_unique
  on products (barcode) where barcode is not null;

-- ---------- Where a sale happened and how it was paid ----------
create type sales_channel as enum ('online', 'walk_in');
create type payment_method as enum
  ('cash', 'mobile_money', 'card', 'pos_terminal', 'bank_transfer');

alter table orders
  add column channel sales_channel not null default 'online',
  add column payment_method payment_method,
  add column sold_by uuid references users (id) on delete set null;

create index idx_orders_channel on orders (channel);

-- ---------- Record a walk-in sale in ONE all-or-nothing step ----------
-- Locks the products, checks stock, creates the order and its items, logs a
-- stock movement per item (who, what, when) and reduces stock. If anything
-- fails, nothing is saved. Two tills selling the last item at the same moment
-- cannot both succeed.
create or replace function fn_record_walk_in_sale(
  p_customer_id uuid,
  p_sold_by uuid,
  p_payment_method payment_method,
  p_notes text,
  p_lines jsonb  -- [{ product_id, quantity, regular_price, final_price }]
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
revoke all on function fn_record_walk_in_sale(uuid, uuid, payment_method, text, jsonb)
  from public, anon, authenticated;
grant execute on function fn_record_walk_in_sale(uuid, uuid, payment_method, text, jsonb)
  to service_role;
