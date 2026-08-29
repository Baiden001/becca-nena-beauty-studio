-- Sample seed data for local development

insert into categories (name, slug, display_order, status) values
  ('Makeup', 'makeup', 1, 'published'),
  ('Skincare', 'skincare', 2, 'published'),
  ('Body Care', 'body-care', 3, 'published'),
  ('Hair Care', 'hair-care', 4, 'published'),
  ('Fragrance', 'fragrance', 5, 'published');

insert into collections (name, slug, status) values
  ('New Arrivals', 'new-arrivals', 'published'),
  ('Best Sellers', 'best-sellers', 'published'),
  ('The Pink Edit', 'the-pink-edit', 'published');

insert into products (name, slug, description, brand, category_id, sku, regular_price, discount_type, discount_value, stock_quantity, low_stock_threshold, status)
select
  'Matte Rose Lipstick', 'matte-rose-lipstick',
  'Long-wearing matte lipstick in a soft dusty rose shade.',
  'Becca Nena', c.id, 'BN-LIP-001', 250.00, 'percentage', 20, 18, 5, 'published'
from categories c where c.slug = 'makeup';

insert into promotions (title, description, cta_text, cta_type, cta_target, start_date, end_date, status) values
  ('Christmas Beauty Edit', 'Special prices on selected beauty essentials.', 'Shop the Collection', 'collection', 'the-pink-edit', now(), now() + interval '14 days', 'active');
