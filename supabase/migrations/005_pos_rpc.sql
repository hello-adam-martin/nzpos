-- Migration: 005_pos_rpc.sql
-- Adds 'split' payment method, cash_tendered_cents column, and atomic POS sale RPC.
-- The RPC locks stock rows with SELECT FOR UPDATE to prevent race conditions.

-- Add 'split' to payment_method CHECK constraint (covers cash + EFTPOS split payment)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('eftpos', 'cash', 'stripe', 'split'));

-- Add cash_tendered_cents column for D-10 (cash change calculation) and Phase 5 cash-up report
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_tendered_cents INTEGER;

-- Add store_id to order_items if not already present (required for RPC insert)
-- Note: 001_initial_schema.sql may not have included store_id on order_items
-- This is a safe no-op if the column already exists
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Atomic POS sale completion RPC
-- SECURITY DEFINER: runs as the DB owner — bypasses RLS to allow admin-key writes
-- Input p_items: JSONB array of { product_id, product_name, unit_price_cents, quantity, discount_cents, line_total_cents, gst_cents }
CREATE OR REPLACE FUNCTION complete_pos_sale(
  p_store_id UUID,
  p_staff_id UUID,
  p_payment_method TEXT,
  p_subtotal_cents INTEGER,
  p_gst_cents INTEGER,
  p_total_cents INTEGER,
  p_discount_cents INTEGER,
  p_cash_tendered_cents INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_current_stock INTEGER;
BEGIN
  -- 1. Lock and check stock for all items (SELECT FOR UPDATE prevents race conditions)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity INTO v_current_stock
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_item->>'product_id';
    END IF;

    IF v_current_stock < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'OUT_OF_STOCK:%:% has only % units',
        v_item->>'product_id',
        v_item->>'product_name',
        v_current_stock;
    END IF;
  END LOOP;

  -- 2. Insert order
  INSERT INTO orders (
    store_id, staff_id, channel, status, payment_method,
    subtotal_cents, gst_cents, total_cents, discount_cents,
    cash_tendered_cents, notes
  )
  VALUES (
    p_store_id, p_staff_id, 'pos', 'completed', p_payment_method,
    p_subtotal_cents, p_gst_cents, p_total_cents, p_discount_cents,
    p_cash_tendered_cents, p_notes
  )
  RETURNING id INTO v_order_id;

  -- 3. Insert order items and decrement stock atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, store_id, product_id, product_name,
      unit_price_cents, quantity, discount_cents, line_total_cents, gst_cents
    )
    VALUES (
      v_order_id,
      p_store_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'unit_price_cents')::INTEGER,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'discount_cents')::INTEGER,
      (v_item->>'line_total_cents')::INTEGER,
      (v_item->>'gst_cents')::INTEGER
    );

    UPDATE products
    SET
      stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER,
      updated_at = now()
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id;
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id);
END;
$$;
