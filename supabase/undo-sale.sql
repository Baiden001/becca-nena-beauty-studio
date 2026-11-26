-- =========================================================
-- UNDO ONE IN-STORE SALE (put stock back, delete it, fix numbering)
-- =========================================================
-- 1. Change BN-1000 on the line marked  <<< SALE NUMBER  to the sale to undo.
-- 2. Supabase → SQL Editor → New query → paste this whole file → Run.
--
-- What it does:
--   • Puts back the stock the sale took (and undoes any refund restock on it)
--   • Deletes the sale, its items, payment lines and any refund on it
--   • Removes the customer record if it was only used by this sale
--   • Sets the numbering so the next sale continues from the highest
--     remaining number (undo the latest sale → its number is used again)
--
-- Only in-store (walk-in) sales can be undone with this. All in one step:
-- if anything fails, nothing changes. THIS CANNOT BE UNDONE.
-- =========================================================

begin;

create temp table _undo on commit drop as
select id, order_number, customer_id
from orders
where order_number = 'BN-1000'   -- <<< SALE NUMBER
  and channel = 'walk_in';

do $$
begin
  if not exists (select 1 from _undo) then
    raise exception 'No in-store sale with that number. Check the number (e.g. BN-1000) and try again.';
  end if;
end $$;

-- Put stock back: reverse every stock movement this sale caused.
update products p
set stock_quantity = greatest(p.stock_quantity - t.net, 0)
from (
  select product_id, sum(quantity_change) as net
  from inventory_transactions
  where order_id in (select id from _undo)
  group by product_id
) t
where p.id = t.product_id;

-- Remove its stock-history lines, then the sale (items, payments and any
-- refund on it are removed with it).
delete from inventory_transactions where order_id in (select id from _undo);
delete from orders where id in (select id from _undo);

-- The customer record, if nothing else uses it.
delete from customers c
where c.id in (select customer_id from _undo)
  and not exists (select 1 from orders o where o.customer_id = c.id);

-- Numbering continues from the highest number still in use.
select setval(
  'order_number_seq',
  coalesce((select max(substring(order_number from 'BN-(\d+)')::int) from orders), 999),
  true
);
select setval(
  'return_number_seq',
  coalesce((select max(substring(return_number from 'RT-(\d+)')::int) from returns), 999),
  true
);

commit;

-- Check: the next sale and refund numbers.
select
  'BN-' || ((select last_value from order_number_seq) + 1) as next_order_number,
  'RT-' || ((select last_value from return_number_seq) + 1) as next_refund_number,
  (select count(*) from orders) as sales_left;
