-- Migration: 001_initial_schema.sql
-- Creates all v1 tables with multi-tenant store_id isolation.
-- All monetary values use INTEGER (cents) — no DECIMAL, NUMERIC, or FLOAT.
-- Every table has id, created_at, updated_at (where applicable).

-- Stores (tenant root)
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_auth_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff (includes owner as role='owner')
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  auth_user_id UUID REFERENCES auth.users(id),  -- only for owners
  name TEXT NOT NULL,
  pin_hash TEXT,                                 -- bcrypt hash of 4-digit PIN
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reorder_threshold INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, sku)
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  staff_id UUID REFERENCES public.staff(id),
  channel TEXT NOT NULL CHECK (channel IN ('pos', 'online')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'refunded', 'expired', 'pending_pickup', 'ready', 'collected')),
  subtotal_cents INTEGER NOT NULL,
  gst_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('eftpos', 'cash', 'stripe')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  customer_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order Line Items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,          -- snapshot at time of sale
  unit_price_cents INTEGER NOT NULL,   -- snapshot at time of sale
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  discount_cents INTEGER NOT NULL DEFAULT 0,
  line_total_cents INTEGER NOT NULL,
  gst_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Promo Codes
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL,     -- percentage (e.g. 10 = 10%) or fixed cents
  min_order_cents INTEGER DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);

-- Stripe Events (idempotency dedup)
CREATE TABLE public.stripe_events (
  id TEXT PRIMARY KEY,                 -- Stripe event ID
  store_id UUID NOT NULL REFERENCES public.stores(id),
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cash Sessions (for end-of-day cash-up)
CREATE TABLE public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  opened_by UUID NOT NULL REFERENCES public.staff(id),
  closed_by UUID REFERENCES public.staff(id),
  opening_float_cents INTEGER NOT NULL,
  closing_cash_cents INTEGER,
  expected_cash_cents INTEGER,
  variance_cents INTEGER,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_products_store ON public.products(store_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_sku ON public.products(store_id, sku);
CREATE INDEX idx_orders_store ON public.orders(store_id);
CREATE INDEX idx_orders_created ON public.orders(store_id, created_at);
CREATE INDEX idx_orders_status ON public.orders(store_id, status);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_staff_store ON public.staff(store_id);
CREATE INDEX idx_staff_auth ON public.staff(auth_user_id);
CREATE INDEX idx_categories_store ON public.categories(store_id);
CREATE INDEX idx_promo_codes_store ON public.promo_codes(store_id, code);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
