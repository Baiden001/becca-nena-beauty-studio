-- =========================================================
-- FRESH START: clear all test sales and refunds, restart numbering
-- =========================================================
-- Run ONCE, just before the shop starts using the system for real.
-- Supabase → SQL Editor → New query → paste this whole file → Run.
--
-- What it does:
--   • Deletes every order (online and in-store) and its items
--   • Deletes every return/refund and its items
--   • Deletes the stock-history lines that came from those sales and refunds
--   • Deletes all customer records
--   • Restarts order numbers at BN-1000 and refund numbers at RT-1000
--
-- What it keeps:
--   • Products, prices, photos, categories, collections, promotions
--   • Current stock levels (left exactly as they are now — count the shelves
--     and set real stock on each product before opening)
--   • Manual stock adjustments in each product's history
--   • Staff accounts, newsletter sign-ups
--
-- THIS CANNOT BE UNDONE. Everything runs as one step: if anything fails,
-- nothing is changed.
-- =========================================================

begin;

-- Stock history lines created by sales and refunds. Removing these does NOT
-- change stock levels (stock only moves when a line is added).
delete from inventory_transactions where order_id is not null;

-- Refunds first (their items go with them), then orders (their items go too).
delete from returns;
delete from orders;

-- Customer records created during testing.
delete from customers;

-- Restart the numbering.
alter sequence order_number_seq restart with 1000;
alter sequence return_number_seq restart with 1000;

commit;

-- Check: every count should be 0, and the next numbers BN-1000 / RT-1000.
select
  (select count(*) from orders)     as orders_left,
  (select count(*) from returns)    as refunds_left,
  (select count(*) from customers)  as customers_left,
  'BN-' || (select last_value from order_number_seq)  as next_order_number,
  'RT-' || (select last_value from return_number_seq) as next_refund_number;
