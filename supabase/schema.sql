-- =========================================================
-- Becca Nena Beauty Studio — Core Database Schema
-- Target: Supabase (Postgres)
-- =========================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------- Enums ----------
create type product_status as enum ('published', 'draft', 'hidden');
create type discount_type as enum ('none', 'percentage', 'fixed');
create type stock_status as enum ('in_stock', 'low_stock', 'out_of_stock');

create type promotion_status as enum ('draft', 'scheduled', 'active', 'expired', 'archived');
create type promotion_cta_type as enum ('product', 'category', 'collection', 'shop', 'custom_page');

create type order_status as enum (
  'new', 'contacted', 'confirmed', 'out_for_delivery',
  'delivered', 'completed', 'cancelled'
);

create type user_role as enum ('owner_admin', 'sales_staff');

-- ---------- users (staff, not customers — customers never authenticate) ----------
create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete cascade unique,
  name text not null,
  email text not null unique,
  role user_role not null default 'sales_staff',
  created_at timestamptz not null default now()
);

-- ---------- categories ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  display_order integer not null default 0,
  status product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- collections ----------
create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  status product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- products ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  brand text,
  category_id uuid references categories (id) on delete set null,

  sku text unique,

  regular_price numeric(10, 2) not null check (regular_price >= 0),
  discount_type discount_type not null default 'none',
  discount_value numeric(10, 2) not null default 0 check (discount_value >= 0),
  discount_start timestamptz,
  discount_end timestamptz,
  -- sale_price is derived, but stored for fast reads / historical display consistency
  sale_price numeric(10, 2),

  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5,
  stock_status stock_status not null default 'out_of_stock',

  status product_status not null default 'draft',

  ingredients text,
  usage_instructions text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint discount_not_over_price check (
    discount_type != 'fixed' or discount_value <= regular_price
  ),
  constraint percentage_discount_range check (
    discount_type != 'percentage' or discount_value <= 100
  )
);

create index idx_products_category on products (category_id);
create index idx_products_status on products (status);

-- ---------- product variants (size / shade / etc.) ----------
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  variant_type text not null, -- e.g. 'size', 'shade'
  variant_value text not null, -- e.g. '30ml', 'Rose Nude'
  sku_suffix text,
  additional_price numeric(10, 2) not null default 0,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_product_variants_product on product_variants (product_id);

-- ---------- product images ----------
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  image_url text not null,
  display_order integer not null default 0
);

create index idx_product_images_product on product_images (product_id);

-- ---------- collection_products (join table) ----------
create table collection_products (
  collection_id uuid not null references collections (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  primary key (collection_id, product_id)
);

-- ---------- customers ----------
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  whatsapp text,
  email text,
  location text,
  created_at timestamptz not null default now()
);

create index idx_customers_phone on customers (phone);
create index idx_customers_email on customers (email);

-- ---------- orders ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique, -- e.g. BN-1047
  customer_id uuid not null references customers (id) on delete restrict,
  status order_status not null default 'new',
  subtotal numeric(10, 2) not null default 0,
  discount_total numeric(10, 2) not null default 0,
  estimated_total numeric(10, 2) not null default 0,
  delivery_location text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_customer on orders (customer_id);
create index idx_orders_status on orders (status);
create index idx_orders_created_at on orders (created_at desc);

-- ---------- order_items ----------
-- product_name and prices are captured at time of order so historical
-- orders remain accurate if the product is later edited or deleted.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  regular_price numeric(10, 2) not null,
  discount_amount numeric(10, 2) not null default 0,
  final_price numeric(10, 2) not null,
  subtotal numeric(10, 2) not null
);

create index idx_order_items_order on order_items (order_id);

-- ---------- inventory_transactions ----------
create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  quantity_change integer not null, -- positive = added, negative = removed
  reason text not null, -- e.g. 'Stock received', 'Order #BN-1047', 'Damaged item'
  order_id uuid references orders (id) on delete set null,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_inventory_tx_product on inventory_transactions (product_id);

-- ---------- promotions ----------
create table promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  cta_text text,
  cta_type promotion_cta_type not null default 'shop',
  cta_target text, -- product/category/collection slug or custom URL, depending on cta_type
  start_date timestamptz not null,
  end_date timestamptz not null,
  status promotion_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint promotion_dates_valid check (end_date > start_date)
);

create index idx_promotions_status on promotions (status);

-- =========================================================
-- Derived-field automation
-- =========================================================

-- Recalculate sale_price and stock_status whenever a product is inserted/updated
create or replace function fn_products_before_write()
returns trigger
language plpgsql
as $$
begin
  -- Sale price calculation
  if new.discount_type = 'percentage' and new.discount_value > 0 then
    new.sale_price := round(new.regular_price * (1 - new.discount_value / 100), 2);
  elsif new.discount_type = 'fixed' and new.discount_value > 0 then
    new.sale_price := greatest(new.regular_price - new.discount_value, 0);
  else
    new.sale_price := null;
  end if;

  -- Stock status
  if new.stock_quantity <= 0 then
    new.stock_status := 'out_of_stock';
  elsif new.stock_quantity <= new.low_stock_threshold then
    new.stock_status := 'low_stock';
  else
    new.stock_status := 'in_stock';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_products_before_write
before insert or update on products
for each row execute function fn_products_before_write();

-- Keep products.stock_quantity in sync with inventory_transactions
create or replace function fn_apply_inventory_transaction()
returns trigger
language plpgsql
as $$
begin
  update products
  set stock_quantity = greatest(stock_quantity + new.quantity_change, 0)
  where id = new.product_id;
  return new;
end;
$$;

create trigger trg_apply_inventory_transaction
after insert on inventory_transactions
for each row execute function fn_apply_inventory_transaction();

-- Generic updated_at bumper for tables that need it
create or replace function fn_bump_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_categories_updated_at before update on categories
for each row execute function fn_bump_updated_at();

create trigger trg_collections_updated_at before update on collections
for each row execute function fn_bump_updated_at();

create trigger trg_orders_updated_at before update on orders
for each row execute function fn_bump_updated_at();

create trigger trg_promotions_updated_at before update on promotions
for each row execute function fn_bump_updated_at();

-- =========================================================
-- Order number generator (BN-1000, BN-1001, ...)
-- =========================================================
create sequence if not exists order_number_seq start 1000;

create or replace function fn_generate_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number := 'BN-' || nextval('order_number_seq');
  end if;
  return new;
end;
$$;

create trigger trg_orders_generate_number
before insert on orders
for each row execute function fn_generate_order_number();

-- =========================================================
-- Row Level Security
-- =========================================================

alter table products enable row level security;
alter table categories enable row level security;
alter table collections enable row level security;
alter table collection_products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table promotions enable row level security;

alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table inventory_transactions enable row level security;
alter table users enable row level security;

-- Public (anon) read access — storefront only ever reads published/active content.
create policy "public read published products"
  on products for select
  using (status = 'published');

create policy "public read categories"
  on categories for select
  using (status = 'published');

create policy "public read collections"
  on collections for select
  using (status = 'published');

create policy "public read collection_products"
  on collection_products for select
  using (true);

create policy "public read product_images"
  on product_images for select
  using (true);

create policy "public read product_variants"
  on product_variants for select
  using (true);

create policy "public read active promotions"
  on promotions for select
  using (status = 'active');

-- Guest checkout: anon can INSERT customers/orders/order_items, never read/update/delete.
create policy "public can create customer"
  on customers for insert
  with check (true);

create policy "public can create order"
  on orders for insert
  with check (true);

create policy "public can create order_items"
  on order_items for insert
  with check (true);

-- Authenticated staff: full access, gated by a helper that checks the users table.
create or replace function fn_is_staff()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from users where auth_user_id = auth.uid()
  );
$$;

create policy "staff full access products" on products
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff full access categories" on categories
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff full access collections" on collections
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff full access collection_products" on collection_products
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff full access product_images" on product_images
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff full access product_variants" on product_variants
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff full access promotions" on promotions
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff full access customers" on customers
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff full access orders" on orders
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff full access order_items" on order_items
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff full access inventory_transactions" on inventory_transactions
  for all using (fn_is_staff()) with check (fn_is_staff());

create policy "staff can read users" on users
  for select using (fn_is_staff());

create policy "owner can manage users" on users
  for all using (
    exists (
      select 1 from users u
      where u.auth_user_id = auth.uid() and u.role = 'owner_admin'
    )
  );
