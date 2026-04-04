-- Migration: 024_service_product_type.sql
-- Phase 21: Service Product Type & Free-Tier Simplification
-- Adds product_type column, inventory feature gating to store_plans,
-- updates auth hook to inject inventory JWT claim,
-- and rewrites both sale RPCs to skip stock for service products.

-- ============================================================
-- Section 1: Add product_type column to products
-- ============================================================
-- Uses CHECK constraint (not ENUM) for easy future extension.
-- Default 'physical' so all existing products remain physical (D-02).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'physical'
  CHECK (product_type IN ('physical', 'service'));

-- ============================================================
-- Section 2: Add inventory feature columns to store_plans
-- ============================================================
-- has_inventory: set true when merchant subscribes to inventory add-on
-- has_inventory_manual_override: super admin comp override (mirrors existing pattern)
-- Both default false — all existing stores start without inventory add-on.
ALTER TABLE public.store_plans
  ADD COLUMN IF NOT EXISTS has_inventory BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_inventory_manual_override BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- Section 3: Auth hook update — inject inventory JWT claim
-- ============================================================
-- Full CREATE OR REPLACE preserving all existing logic from 019_billing_claims.sql.
-- Adds v_has_inventory variable, includes has_inventory in the store_plans SELECT,
-- and injects it as app_metadata.inventory boolean claim.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  claims JSONB;
  user_store_id UUID;
  user_role TEXT;
  v_is_super_admin BOOLEAN := false;
  v_has_xero BOOLEAN := false;
  v_has_email_notifications BOOLEAN := false;
  v_has_custom_domain BOOLEAN := false;
  v_has_inventory BOOLEAN := false;
BEGIN
  claims := event -> 'claims';

  -- 1. Check super admin first (cross-tenant, no store_id needed)
  SELECT true INTO v_is_super_admin
  FROM public.super_admins
  WHERE auth_user_id = (event ->> 'user_id')::UUID;

  -- 2. Check staff (owner/staff role)
  SELECT s.store_id, s.role INTO user_store_id, user_role
  FROM public.staff s
  WHERE s.auth_user_id = (event ->> 'user_id')::UUID;

  -- 3. If not staff/owner, check customer
  IF user_store_id IS NULL THEN
    SELECT c.store_id, 'customer' INTO user_store_id, user_role
    FROM public.customers c
    WHERE c.auth_user_id = (event ->> 'user_id')::UUID;
  END IF;

  -- 4. Inject claims if any role found
  IF v_is_super_admin OR user_store_id IS NOT NULL THEN
    -- Ensure app_metadata object exists
    IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;

    -- Inject store_id and role if found
    IF user_store_id IS NOT NULL THEN
      claims := jsonb_set(claims, '{app_metadata,store_id}', to_jsonb(user_store_id::TEXT));
      claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
    END IF;

    -- Inject super admin flag
    IF v_is_super_admin THEN
      claims := jsonb_set(claims, '{app_metadata,is_super_admin}', 'true'::JSONB);
    END IF;
  END IF;

  -- 5. Feature flags from store_plans (billing)
  --    Inject boolean claims for each paid add-on feature.
  --    COALESCE to false if store_plans row doesn't exist or columns are null.
  IF user_store_id IS NOT NULL THEN
    SELECT sp.has_xero, sp.has_email_notifications, sp.has_custom_domain, sp.has_inventory
    INTO v_has_xero, v_has_email_notifications, v_has_custom_domain, v_has_inventory
    FROM public.store_plans sp
    WHERE sp.store_id = user_store_id;

    -- Ensure app_metadata exists before setting feature flags
    IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;

    claims := jsonb_set(claims, '{app_metadata,xero}', to_jsonb(COALESCE(v_has_xero, false)));
    claims := jsonb_set(claims, '{app_metadata,email_notifications}', to_jsonb(COALESCE(v_has_email_notifications, false)));
    claims := jsonb_set(claims, '{app_metadata,custom_domain}', to_jsonb(COALESCE(v_has_custom_domain, false)));
    claims := jsonb_set(claims, '{app_metadata,inventory}', to_jsonb(COALESCE(v_has_inventory, false)));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- ============================================================
-- Section 4: Rewrite complete_pos_sale to skip stock for service products
-- ============================================================
-- CRITICAL: Signature preserved EXACTLY from 010_checkout_speed.sql.
-- The GRANT in 021_security_audit_fixes.sql is tied to this exact signature.
-- Any signature change orphans the GRANT. No REVOKE/GRANT issued here.
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
  v_product_type TEXT;
BEGIN
  -- 1. Lock and check stock for all items (SELECT FOR UPDATE prevents race conditions)
  --    Service products skip the stock check entirely.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity, product_type INTO v_current_stock, v_product_type
    FROM products
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
  --    Service products skip the stock decrement.
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

    SELECT product_type INTO v_product_type
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id;

    IF v_product_type = 'physical' THEN
      UPDATE products
      SET
        stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER,
        updated_at = now()
      WHERE id = (v_item->>'product_id')::UUID
        AND store_id = p_store_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id);
END;
$$;

-- ============================================================
-- Section 5: Rewrite complete_online_sale to skip stock for service products
-- ============================================================
-- CRITICAL: Signature preserved EXACTLY from 006_online_store.sql.
-- The GRANT in 021_security_audit_fixes.sql is tied to this exact signature.
-- Any signature change orphans the GRANT. No REVOKE/GRANT issued here.
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

  -- 2. Decrement stock for each item
  --    Service products skip the stock decrement.
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
        AND store_id = p_store_id;
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
-- Section 6: Re-grant store_plans access (idempotent)
-- ============================================================
-- Already granted in 019_billing_claims.sql — safe to re-grant.
-- Ensures the two new columns (has_inventory, has_inventory_manual_override)
-- are accessible to the auth hook running as supabase_auth_admin.
GRANT SELECT ON public.store_plans TO supabase_auth_admin;
