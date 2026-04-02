-- Migration: 010_checkout_speed.sql
-- Phase 8: Checkout Speed — receipt data foundation.
-- Adds store contact/compliance columns, receipt_data + customer_email to orders,
-- and updates complete_pos_sale RPC to accept both new parameters.

-- 1. Add contact/compliance columns to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- 2. Add receipt_data JSONB and customer_email to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS receipt_data JSONB,
  ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- 3. UPDATE complete_pos_sale RPC: add p_receipt_data and p_customer_email params
-- Full CREATE OR REPLACE — preserves all existing logic (stock locking, order insert,
-- order_items insert, stock decrement) and adds two new columns to the INSERT.
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
  p_items JSONB DEFAULT '[]'::JSONB,
  p_receipt_data JSONB DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL
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

  -- 2. Insert order (now includes receipt_data and customer_email)
  INSERT INTO orders (
    store_id, staff_id, channel, status, payment_method,
    subtotal_cents, gst_cents, total_cents, discount_cents,
    cash_tendered_cents, notes, receipt_data, customer_email
  )
  VALUES (
    p_store_id, p_staff_id, 'pos', 'completed', p_payment_method,
    p_subtotal_cents, p_gst_cents, p_total_cents, p_discount_cents,
    p_cash_tendered_cents, p_notes, p_receipt_data, p_customer_email
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
