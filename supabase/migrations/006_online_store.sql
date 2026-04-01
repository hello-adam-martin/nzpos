-- Migration: 006_online_store.sql
-- Adds slug column to products, creates complete_online_sale RPC,
-- adds stripe_events index, and public RLS policies for storefront.

-- 1. Add slug column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(store_id, slug);

-- 2. Backfill slugs for existing products (URL-safe lowercase with hyphens)
UPDATE public.products
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
WHERE slug IS NULL;

-- 3. Add index on stripe_events for store queries (idempotency per D-21)
-- stripe_events table already has correct structure from 001:
--   id TEXT PRIMARY KEY (Stripe event ID), store_id UUID, type TEXT, processed_at TIMESTAMPTZ
CREATE INDEX IF NOT EXISTS idx_stripe_events_store ON public.stripe_events(store_id);

-- 4. Create complete_online_sale RPC
-- Updates a PENDING order to COMPLETED after Stripe payment confirmation.
-- Locks stock rows with SELECT FOR UPDATE to prevent overselling.
-- SECURITY DEFINER: runs as DB owner — bypasses RLS (webhook uses service key anyway).
CREATE OR REPLACE FUNCTION complete_online_sale(
  p_store_id UUID,
  p_order_id UUID,
  p_stripe_session_id TEXT,
  p_stripe_payment_intent_id TEXT,
  p_customer_email TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_current_stock INTEGER;
BEGIN
  -- 1. Lock and check stock for all items (SELECT FOR UPDATE prevents race conditions)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity INTO v_current_stock
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_item->>'product_id';
    END IF;

    IF v_current_stock < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_item->>'product_id';
    END IF;
  END LOOP;

  -- 2. Decrement stock for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE public.products
    SET
      stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER,
      updated_at = now()
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id;
  END LOOP;

  -- 3. Update existing PENDING order to COMPLETED with Stripe details
  UPDATE public.orders
  SET
    status = 'completed',
    payment_method = 'stripe',
    stripe_session_id = p_stripe_session_id,
    stripe_payment_intent_id = p_stripe_payment_intent_id,
    customer_email = COALESCE(p_customer_email, customer_email),
    updated_at = now()
  WHERE id = p_order_id
    AND store_id = p_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND:%', p_order_id;
  END IF;
END;
$$;

-- 5. Public RLS policy: allow anonymous reads of active products for storefront
-- The existing policy requires authenticated JWT with matching store_id.
-- The storefront Server Component additionally filters by store_id via env var.
CREATE POLICY "Public can read active products" ON public.products
  FOR SELECT USING (is_active = true);

-- 6. Public RLS policy: allow reading online orders by ID for order confirmation page
-- Orders are looked up by ID directly — no auth required for guest checkout confirmation.
CREATE POLICY "Public can read orders by id" ON public.orders
  FOR SELECT USING (channel = 'online');
