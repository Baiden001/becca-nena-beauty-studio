-- =========================================================
-- Storage — product image uploads
-- Run after schema.sql. Safe to re-run (uses on-conflict / drop-if-exists).
-- =========================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public can view images (the storefront needs this — anon, no session).
drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Only signed-in staff can upload, replace, or delete. Reuses the same
-- fn_is_staff() helper defined in schema.sql.
drop policy if exists "staff upload product-images" on storage.objects;
create policy "staff upload product-images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and fn_is_staff());

drop policy if exists "staff update product-images" on storage.objects;
create policy "staff update product-images"
  on storage.objects for update
  using (bucket_id = 'product-images' and fn_is_staff());

drop policy if exists "staff delete product-images" on storage.objects;
create policy "staff delete product-images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and fn_is_staff());
