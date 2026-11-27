-- =========================================================
-- Discounts on in-store sales
-- e.g. a GH₵240 sale with a GH₵20 discount: the customer pays GH₵220, and the
-- sale records how much, why and which staff member gave it.
--
-- Run ONCE in Supabase → SQL Editor, AFTER split-payments.sql and BEFORE the
-- website update that uses it. The current till keeps working after running it.
-- (If Supabase asks about RLS, choose "Run without RLS": no new tables here.)
-- =========================================================

alter table orders
  add column if not exists manual_discount numeric(10, 2) not null default 0
    check (manual_discount >= 0),
  add column if not exists discount_reason text,
  add column if not exists discount_approved_by uuid references users (id) on delete set null;

-- ---------- The sale function, now with a discount ----------
drop function if exists fn_record_walk_in_sale(uuid, uuid, payment_method, text, jsonb, jsonb);

create or replace function fn_record_walk_in_sale(
  p_customer_id uuid,
  p_sold_by uuid,
  p_payment_method payment_method,
  p_notes text,
  p_lines jsonb,                       -- [{ product_id, quantity, regular_price, final_price }]
  p_payments jsonb default null,       -- [{ method, amount, reference }]
  p_manual_discount numeric default 0, -- whole-sale discount in GH₵
  p_discount_reason text default null,
  p_discount_approved_by uuid default null  -- staff member who gave the discount
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
  v_items_total numeric(10, 2) := 0;
  v_discount numeric(10, 2) := round(coalesce(p_manual_discount, 0), 2);
  v_total numeric(10, 2);
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
    v_items_total := v_items_total + (v_line ->> 'final_price')::numeric * v_qty;
  end loop;

  -- The discount: never negative, never more than the sale, always with a
  -- reason and the staff member who gave it.
  if v_discount < 0 then
    raise exception 'The discount cannot be negative.';
  end if;
  if v_discount > v_items_total then
    raise exception 'The discount (GH₵%) is more than the sale (GH₵%).', v_discount, v_items_total;
  end if;
  if v_discount > 0 and (coalesce(trim(p_discount_reason), '') = '' or p_discount_approved_by is null) then
    raise exception 'A discount needs a reason.';
  end if;

  v_total := v_items_total - v_discount;

  -- Split payments must add up to what the customer pays, to the pesewa.
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
    payment_status, paid_at, sold_by,
    manual_discount, discount_reason, discount_approved_by
  ) values (
    -- discount_total = product price reductions + the discount given
    p_customer_id, 'completed', v_subtotal, (v_subtotal - v_items_total) + v_discount, v_total,
    'In store', p_notes, 'walk_in', p_payment_method,
    'paid', now(), p_sold_by,
    v_discount, nullif(trim(coalesce(p_discount_reason, '')), ''),
    case when v_discount > 0 then p_discount_approved_by end
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

revoke all on function fn_record_walk_in_sale(uuid, uuid, payment_method, text, jsonb, jsonb, numeric, text, uuid)
  from public, anon, authenticated;
grant execute on function fn_record_walk_in_sale(uuid, uuid, payment_method, text, jsonb, jsonb, numeric, text, uuid)
  to service_role;

-- ---------- Refunds respect the discount ----------
-- A returned item from a discounted sale is refunded at its share of what
-- the customer actually paid, never more.
create or replace function fn_record_return(
  p_order_id uuid,
  p_processed_by uuid,
  p_refund_method payment_method,
  p_reason text,
  p_notes text,
  p_lines jsonb  -- [{ order_item_id, quantity, restock }]
)
returns table (out_return_id uuid, out_return_number text, out_refund_total numeric)
language plpgsql
as $$
declare
  v_order orders%rowtype;
  v_line jsonb;
  v_item order_items%rowtype;
  v_qty integer;
  v_restock boolean;
  v_already integer;
  v_ratio numeric := 1;
  v_refund numeric(10, 2);
  v_total numeric(10, 2) := 0;
  v_return_id uuid;
  v_return_number text;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Choose at least one item to return.';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Choose a reason for the return.';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'That sale could not be found.';
  end if;
  if v_order.payment_status <> 'paid' or v_order.status = 'cancelled' then
    raise exception 'Only paid sales can be returned.';
  end if;

  -- Share of the item prices the customer really paid after the discount.
  if coalesce(v_order.manual_discount, 0) > 0 and v_order.estimated_total + v_order.manual_discount > 0 then
    v_ratio := v_order.estimated_total / (v_order.estimated_total + v_order.manual_discount);
  end if;

  v_return_number := 'RT-' || nextval('return_number_seq');

  insert into returns (return_number, order_id, processed_by, refund_method, reason, notes)
  values (v_return_number, p_order_id, p_processed_by, p_refund_method, trim(p_reason), nullif(trim(p_notes), ''))
  returning returns.id into v_return_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_line ->> 'quantity')::integer;
    v_restock := coalesce((v_line ->> 'restock')::boolean, true);
    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity.';
    end if;

    select * into v_item
    from order_items
    where id = (v_line ->> 'order_item_id')::uuid and order_id = p_order_id
    for update;
    if not found then
      raise exception 'An item does not belong to this sale.';
    end if;

    select coalesce(sum(ri.quantity), 0) into v_already
    from return_items ri where ri.order_item_id = v_item.id;

    if v_qty > v_item.quantity - v_already then
      raise exception 'Only % of % can still be returned.', v_item.quantity - v_already, v_item.product_name;
    end if;

    v_refund := round(v_item.final_price * v_qty * v_ratio, 2);
    v_total := v_total + v_refund;

    insert into return_items (
      return_id, order_item_id, product_id, product_name,
      quantity, unit_price, refund_amount, restocked
    ) values (
      v_return_id, v_item.id, v_item.product_id, v_item.product_name,
      v_qty, round(v_item.final_price * v_ratio, 2), v_refund, v_restock
    );

    if v_restock and v_item.product_id is not null then
      insert into inventory_transactions (
        product_id, quantity_change, reason, order_id, created_by
      ) values (
        v_item.product_id, v_qty,
        'Return ' || v_return_number || ' (sale #' || v_order.order_number || ')',
        p_order_id, p_processed_by
      );
    end if;
  end loop;

  update returns set refund_total = v_total where id = v_return_id;

  return query select v_return_id, v_return_number, v_total;
end;
$$;

revoke all on function fn_record_return(uuid, uuid, payment_method, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function fn_record_return(uuid, uuid, payment_method, text, text, jsonb)
  to service_role;

-- Check: the new columns exist (all zero for past sales).
select count(*) as sales, coalesce(sum(manual_discount), 0) as discounts_given
from orders;
