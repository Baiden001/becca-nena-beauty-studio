-- =========================================================
-- Returns / refunds
-- Run once in the Supabase SQL editor, AFTER walk-in-sales.sql.
-- =========================================================

create sequence if not exists return_number_seq start 1000;

create table returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  order_id uuid not null references orders (id) on delete cascade,
  processed_by uuid references users (id) on delete set null,
  refund_method payment_method not null,
  reason text not null,
  notes text,
  refund_total numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references returns (id) on delete cascade,
  order_item_id uuid not null references order_items (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null,
  refund_amount numeric(10, 2) not null,
  restocked boolean not null default true
);

create index idx_returns_order on returns (order_id);
create index idx_returns_created on returns (created_at desc);
create index idx_return_items_return on return_items (return_id);
create index idx_return_items_order_item on return_items (order_item_id);

alter table returns enable row level security;
alter table return_items enable row level security;

create policy "staff full access returns" on returns
  for all using (fn_is_staff()) with check (fn_is_staff());
create policy "staff full access return_items" on return_items
  for all using (fn_is_staff()) with check (fn_is_staff());

-- ---------- Record a return in ONE all-or-nothing step ----------
-- Checks each item really was sold and isn't being returned more than once,
-- works out the refund from the price actually paid, saves the return, and
-- (for items that go back on the shelf) puts the stock back with a stock
-- movement naming who did it.
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

    v_refund := v_item.final_price * v_qty;
    v_total := v_total + v_refund;

    insert into return_items (
      return_id, order_item_id, product_id, product_name,
      quantity, unit_price, refund_amount, restocked
    ) values (
      v_return_id, v_item.id, v_item.product_id, v_item.product_name,
      v_qty, v_item.final_price, v_refund, v_restock
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
