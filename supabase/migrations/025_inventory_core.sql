-- Migration: 025_inventory_core.sql
-- Phase 22: Inventory Add-on Core
-- Creates stock_adjustments, stocktake_sessions, stocktake_lines tables,
-- adds RLS policies, indexes, SECURITY DEFINER RPCs (adjust_stock, complete_stocktake),
-- updates restore_stock to log to audit trail,
-- and rewrites complete_pos_sale and complete_online_sale to INSERT stock_adjustments rows.

-- ============================================================
-- Section 1: stock_adjustments table (append-only audit log)
-- ============================================================
CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  reason TEXT NOT NULL CHECK (reason IN (
    'sale', 'refund', 'stocktake',
    'received', 'damaged', 'theft_shrinkage', 'correction', 'return_to_supplier', 'other'
  )),
  quantity_delta INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  notes TEXT,
  order_id UUID REFERENCES public.orders(id),
  stocktake_session_id UUID,
  staff_id UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Section 2: stocktake_sessions table
-- ============================================================
CREATE TABLE public.stocktake_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'committed', 'discarded')),
  scope TEXT NOT NULL DEFAULT 'full' CHECK (scope IN ('full', 'category')),
  category_id UUID REFERENCES public.categories(id),
  created_by UUID REFERENCES public.staff(id),
  committed_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Section 3: stocktake_lines table
-- ============================================================
CREATE TABLE public.stocktake_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_session_id UUID NOT NULL REFERENCES public.stocktake_sessions(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  system_snapshot_quantity INTEGER NOT NULL,
  counted_quantity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(stocktake_session_id, product_id)
);

-- ============================================================
-- Section 4: FK back-reference on stock_adjustments
-- ============================================================
ALTER TABLE public.stock_adjustments
  ADD CONSTRAINT fk_stocktake_session
  FOREIGN KEY (stocktake_session_id) REFERENCES public.stocktake_sessions(id);

-- ============================================================
-- Section 5: Indexes
-- ============================================================
CREATE INDEX idx_stock_adj_store ON public.stock_adjustments(store_id);
CREATE INDEX idx_stock_adj_product ON public.stock_adjustments(store_id, product_id);
CREATE INDEX idx_stock_adj_created ON public.stock_adjustments(store_id, created_at);
CREATE INDEX idx_stock_adj_reason ON public.stock_adjustments(store_id, reason);
CREATE INDEX idx_stocktake_store ON public.stocktake_sessions(store_id);
CREATE INDEX idx_stocktake_status ON public.stocktake_sessions(store_id, status);
CREATE INDEX idx_stocktake_lines_session ON public.stocktake_lines(stocktake_session_id);
CREATE INDEX idx_stocktake_lines_product ON public.stocktake_lines(store_id, product_id);

-- ============================================================
-- Section 6: RLS policies
-- ============================================================

-- stock_adjustments: append-only — INSERT + SELECT only, NO UPDATE/DELETE policies
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_insert" ON public.stock_adjustments
  FOR INSERT WITH CHECK (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
CREATE POLICY "tenant_select" ON public.stock_adjustments
  FOR SELECT USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
-- NOTE: No UPDATE or DELETE policies — intentional. Audit log is immutable for tenants.

-- stocktake_sessions: standard tenant isolation
ALTER TABLE public.stocktake_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.stocktake_sessions
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- stocktake_lines: standard tenant isolation
ALTER TABLE public.stocktake_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.stocktake_lines
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- ============================================================
-- Section 7: adjust_stock RPC
-- ============================================================
-- Atomically updates products.stock_quantity AND inserts an audit row.
-- Called by the adjustStock server action (STOCK-01, STOCK-02).
-- Returns the new stock quantity as JSONB.
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_store_id UUID,
  p_product_id UUID,
  p_quantity_delta INTEGER,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO v_current_stock
  FROM public.products
  WHERE id = p_product_id AND store_id = p_store_id AND product_type = 'physical'
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', p_product_id;
  END IF;

  v_new_stock := v_current_stock + p_quantity_delta;

  UPDATE public.products
  SET stock_quantity = v_new_stock, updated_at = now()
  WHERE id = p_product_id AND store_id = p_store_id;

  INSERT INTO public.stock_adjustments (
    store_id, product_id, reason, quantity_delta, quantity_after,
    notes, staff_id, order_id
  ) VALUES (
    p_store_id, p_product_id, p_reason, p_quantity_delta, v_new_stock,
    p_notes, p_staff_id, p_order_id
  );

  RETURN jsonb_build_object('new_quantity', v_new_stock);
END;
$$;

-- ============================================================
-- Section 8: complete_stocktake RPC
-- ============================================================
-- Atomically processes all counted lines in a stocktake session,
-- updates products.stock_quantity to counted values,
-- inserts stock_adjustments rows, and marks the session committed.
-- Only processes lines where counted_quantity IS NOT NULL.
-- Called by the commitStocktake server action (TAKE-04).
CREATE OR REPLACE FUNCTION public.complete_stocktake(
  p_session_id UUID,
  p_store_id UUID,
  p_staff_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_line RECORD;
  v_delta INTEGER;
  v_new_stock INTEGER;
  v_lines_committed INTEGER := 0;
BEGIN
  -- Verify session exists, belongs to store, is in_progress
  IF NOT EXISTS (
    SELECT 1 FROM public.stocktake_sessions
    WHERE id = p_session_id AND store_id = p_store_id AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'INVALID_SESSION:%', p_session_id;
  END IF;

  -- Process only lines where counted_quantity IS NOT NULL
  FOR v_line IN
    SELECT * FROM public.stocktake_lines
    WHERE stocktake_session_id = p_session_id
      AND counted_quantity IS NOT NULL
    FOR UPDATE
  LOOP
    -- Get current stock quantity
    SELECT stock_quantity INTO v_new_stock
    FROM public.products WHERE id = v_line.product_id AND store_id = p_store_id;

    -- Delta from current stock to counted quantity
    v_delta := v_line.counted_quantity - v_new_stock;

    -- Update product stock to counted quantity
    UPDATE public.products
    SET stock_quantity = v_line.counted_quantity, updated_at = now()
    WHERE id = v_line.product_id AND store_id = p_store_id;

    -- Insert audit row for every counted line (delta may be 0)
    INSERT INTO public.stock_adjustments (
      store_id, product_id, reason, quantity_delta, quantity_after,
      stocktake_session_id, staff_id
    ) VALUES (
      p_store_id, v_line.product_id, 'stocktake', v_delta, v_line.counted_quantity,
      p_session_id, p_staff_id
    );

    v_lines_committed := v_lines_committed + 1;
  END LOOP;

  -- Mark session committed
  UPDATE public.stocktake_sessions
  SET status = 'committed', committed_at = now(), updated_at = now()
  WHERE id = p_session_id AND store_id = p_store_id;

  RETURN jsonb_build_object('lines_committed', v_lines_committed);
END;
$$;

-- ============================================================
-- Section 9: Update restore_stock RPC to log to audit trail
-- ============================================================
-- Upgrades from sql to plpgsql to support DECLARE/BEGIN/END.
-- Now also inserts a stock_adjustments row with reason='refund'.
-- GRANT to service_role already set in migration 021 — no new GRANT needed.
CREATE OR REPLACE FUNCTION public.restore_stock(p_product_id UUID, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_stock INTEGER;
  v_store_id UUID;
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_product_id
  RETURNING stock_quantity, store_id INTO v_new_stock, v_store_id;

  INSERT INTO public.stock_adjustments (
    store_id, product_id, reason, quantity_delta, quantity_after
  ) VALUES (
    v_store_id, p_product_id, 'refund', p_quantity, v_new_stock
  );
END;
$$;

-- ============================================================
-- Section 10: Update complete_pos_sale to log stock_adjustments on decrement
-- ============================================================
-- CRITICAL: Signature preserved EXACTLY from 024_service_product_type.sql.
-- The GRANT in 021_security_audit_fixes.sql is tied to this exact signature.
-- Any signature change orphans the GRANT. No REVOKE/GRANT issued here.
-- Change from 024: Add INSERT INTO stock_adjustments after each stock decrement.
CREATE OR REPLACE FUNCTION public.complete_pos_sale(
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
  v_new_stock INTEGER;
  v_product_type TEXT;
BEGIN
  -- 1. Lock and check stock for all items (SELECT FOR UPDATE prevents race conditions)
  --    Service products skip the stock check entirely.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity, product_type INTO v_current_stock, v_product_type
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_item->>'product_id';
    END IF;

    IF v_product_type = 'physical' THEN
      IF v_current_stock < (v_item->>'quantity')::INTEGER THEN
        RAISE EXCEPTION 'OUT_OF_STOCK:%:% has only % units',
          v_item->>'product_id',
          v_item->>'product_name',
          v_current_stock;
      END IF;
    END IF;
  END LOOP;

  -- 2. Insert order (preserves all existing columns unchanged)
  INSERT INTO public.orders (
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

  -- 3. Insert order items, decrement stock, and log stock adjustments
  --    Service products skip stock decrement and audit logging.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
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

    SELECT product_type INTO v_product_type
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id;

    IF v_product_type = 'physical' THEN
      UPDATE public.products
      SET
        stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER,
        updated_at = now()
      WHERE id = (v_item->>'product_id')::UUID
        AND store_id = p_store_id
      RETURNING stock_quantity INTO v_new_stock;

      INSERT INTO public.stock_adjustments (
        store_id, product_id, reason, quantity_delta, quantity_after, order_id
      ) VALUES (
        p_store_id,
        (v_item->>'product_id')::UUID,
        'sale',
        -(v_item->>'quantity')::INTEGER,
        v_new_stock,
        v_order_id
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id);
END;
$$;

-- ============================================================
-- Section 11: Update complete_online_sale to log stock_adjustments on decrement
-- ============================================================
-- CRITICAL: Signature preserved EXACTLY from 024_service_product_type.sql.
-- The GRANT in 021_security_audit_fixes.sql is tied to this exact signature.
-- Any signature change orphans the GRANT. No REVOKE/GRANT issued here.
-- Change from 024: Add INSERT INTO stock_adjustments after each stock decrement.
CREATE OR REPLACE FUNCTION public.complete_online_sale(
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
  v_new_stock INTEGER;
  v_product_type TEXT;
BEGIN
  -- 1. Lock and check stock for all items (SELECT FOR UPDATE prevents race conditions)
  --    Service products skip the stock check entirely.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity, product_type INTO v_current_stock, v_product_type
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_item->>'product_id';
    END IF;

    IF v_product_type = 'physical' THEN
      IF v_current_stock < (v_item->>'quantity')::INTEGER THEN
        RAISE EXCEPTION 'Insufficient stock for product %', v_item->>'product_id';
      END IF;
    END IF;
  END LOOP;

  -- 2. Decrement stock for each physical item and log stock adjustments
  --    Service products skip the stock decrement and audit logging.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT product_type INTO v_product_type
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id;

    IF v_product_type = 'physical' THEN
      UPDATE public.products
      SET
        stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER,
        updated_at = now()
      WHERE id = (v_item->>'product_id')::UUID
        AND store_id = p_store_id
      RETURNING stock_quantity INTO v_new_stock;

      INSERT INTO public.stock_adjustments (
        store_id, product_id, reason, quantity_delta, quantity_after, order_id
      ) VALUES (
        p_store_id,
        (v_item->>'product_id')::UUID,
        'sale',
        -(v_item->>'quantity')::INTEGER,
        v_new_stock,
        p_order_id
      );
    END IF;
  END LOOP;

  -- 3. Update existing PENDING order to COMPLETED with Stripe details (UNCHANGED)
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

-- ============================================================
-- Section 12: GRANTs for new RPCs
-- ============================================================
GRANT EXECUTE ON FUNCTION public.adjust_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stocktake TO authenticated;
