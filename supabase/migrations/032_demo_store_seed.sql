-- Migration: 032_demo_store_seed.sql
-- Phase 32: Demo Store Seed
-- Creates a realistic NZ retail demo store for the /demo/pos route.
-- Idempotent: all INSERTs use ON CONFLICT ... DO NOTHING with fixed UUIDs.
-- No owner auth required — synthetic auth.users row satisfies FK constraint.

-- UUIDs
-- DEMO auth user:  00000000-0000-4000-a000-000000000099
-- DEMO store:      00000000-0000-4000-a000-000000000099  (same UUID, intentional)
-- Categories:      00000000-0000-4000-b000-000000000001 to ...005
-- Products:        00000000-0000-4000-c000-000000000001 to ...020

-- ============================================================
-- 1. Synthetic auth user (satisfies stores.owner_auth_id FK)
-- ============================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role, aud)
VALUES (
  '00000000-0000-4000-a000-000000000099',
  'demo@nzpos.internal',
  '',
  now(), now(), now(),
  'authenticated', 'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Demo store
-- ============================================================
INSERT INTO public.stores (
  id, name, slug, owner_auth_id, is_active,
  logo_url, store_description, primary_color,
  business_address, ird_gst_number,
  receipt_header, receipt_footer,
  setup_wizard_dismissed, setup_completed_steps
)
VALUES (
  '00000000-0000-4000-a000-000000000099',
  'Aroha Home & Gift',
  'aroha-demo',
  '00000000-0000-4000-a000-000000000099',
  true,
  '/demo/store-logo.svg',
  'A curated collection of NZ-made gifts and homewares',
  '#1E293B',
  '12 Lambton Quay, Wellington 6011',
  '123-456-789',
  'Aroha Home & Gift | 12 Lambton Quay, Wellington 6011',
  'Thank you for shopping local. GST included in all prices.',
  true,
  0
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. store_plans row (all add-ons false)
-- ============================================================
INSERT INTO public.store_plans (store_id)
VALUES ('00000000-0000-4000-a000-000000000099')
ON CONFLICT (store_id) DO NOTHING;

-- ============================================================
-- 4. Categories (5 categories, fixed UUIDs)
-- ============================================================
INSERT INTO public.categories (id, store_id, name, sort_order) VALUES
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000099', 'Candles & Fragrance', 0),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000099', 'Homewares', 1),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000099', 'Prints & Art', 2),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000099', 'Kitchen & Dining', 3),
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000099', 'Jewellery & Accessories', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Products (20 products across 5 categories)
--    All prices tax-inclusive NZD cents. product_type = 'physical'.
-- ============================================================
INSERT INTO public.products (
  id, store_id, category_id, name, sku,
  price_cents, stock_quantity, reorder_threshold,
  image_url, is_active, product_type
) VALUES
  -- Candles & Fragrance (CAN-) — category 001
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000001', 'Manuka Honey Candle',      'CAN-001', 2999,  50, 10, '/demo/placeholder-candles.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000001', 'Pohutukawa Soy Candle',    'CAN-002', 3499,  40, 10, '/demo/placeholder-candles.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000001', 'Lavender Reed Diffuser',   'CAN-003', 4999,  30,  8, '/demo/placeholder-candles.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000001', 'NZ Pine & Cedar Candle',   'CAN-004', 2499,  45, 10, '/demo/placeholder-candles.svg',   true, 'physical'),
  -- Homewares (HOM-) — category 002
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000002', 'Ceramic Mug Kiwi',         'HOM-001', 2299,  60, 15, '/demo/placeholder-homewares.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000006', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000002', 'Linen Cushion Cover',      'HOM-002', 4999,  25,  5, '/demo/placeholder-homewares.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000007', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000002', 'Woven Basket Small',       'HOM-003', 3999,  20,  5, '/demo/placeholder-homewares.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000008', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000002', 'Wool Throw Blanket',       'HOM-004', 8999,  15,  3, '/demo/placeholder-homewares.svg', true, 'physical'),
  -- Prints & Art (PRT-) — category 003
  ('00000000-0000-4000-c000-000000000009', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000003', 'NZ Fern Print A4',         'PRT-001', 1999,  80, 20, '/demo/placeholder-prints.svg',    true, 'physical'),
  ('00000000-0000-4000-c000-000000000010', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000003', 'Kiwi Bird Art Card Pack',  'PRT-002',  999, 100, 25, '/demo/placeholder-prints.svg',    true, 'physical'),
  ('00000000-0000-4000-c000-000000000011', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000003', 'Pohutukawa Print A3',      'PRT-003', 3499,  40, 10, '/demo/placeholder-prints.svg',    true, 'physical'),
  ('00000000-0000-4000-c000-000000000012', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000003', 'Wellington Skyline Print', 'PRT-004', 4999,  30,  8, '/demo/placeholder-prints.svg',    true, 'physical'),
  -- Kitchen & Dining (KIT-) — category 004
  ('00000000-0000-4000-c000-000000000013', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000004', 'Rimu Wood Cheese Board',   'KIT-001', 5999,  20,  5, '/demo/placeholder-kitchen.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000014', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000004', 'Handthrown Bowl Set',      'KIT-002', 7999,  15,  3, '/demo/placeholder-kitchen.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000015', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000004', 'Ceramic Butter Dish',      'KIT-003', 3499,  35,  8, '/demo/placeholder-kitchen.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000016', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000004', 'NZ Honey 500g',            'KIT-004', 1699,  60, 15, '/demo/placeholder-kitchen.svg',   true, 'physical'),
  -- Jewellery & Accessories (JWL-) — category 005
  ('00000000-0000-4000-c000-000000000017', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000005', 'Pounamu Drop Earrings',    'JWL-001', 5999,  25,  5, '/demo/placeholder-jewellery.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000018', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000005', 'Silver Fern Bracelet',     'JWL-002', 4499,  20,  5, '/demo/placeholder-jewellery.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000019', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000005', 'Bone Koru Pendant',        'JWL-003', 3999,  30,  8, '/demo/placeholder-jewellery.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000020', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000005', 'Leather Cuff Bracelet',    'JWL-004', 2999,  35,  8, '/demo/placeholder-jewellery.svg', true, 'physical')
ON CONFLICT (id) DO NOTHING;
