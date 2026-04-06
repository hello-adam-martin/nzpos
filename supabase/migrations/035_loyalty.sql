-- Migration: 035_loyalty.sql
-- Phase 37: Loyalty Points Add-on
-- Creates loyalty_settings, loyalty_points, loyalty_transactions tables,
-- atomic RPCs (earn_loyalty_points, redeem_loyalty_points), RLS policies, indexes,
-- and adds store_plans.has_loyalty_points column.

-- ============================================================
-- Section 1: Add has_loyalty_points to store_plans
-- ============================================================
ALTER TABLE public.store_plans
  ADD COLUMN IF NOT EXISTS has_loyalty_points BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- Section 2: Create loyalty_settings table (Option B — separate table)
-- ============================================================
-- earn_rate_cents: cents per point earned (e.g. 100 = earn 1 pt per $1 spent).
--   NULL = not configured.
-- redeem_rate_cents: cents value per point (e.g. 1 = 1 pt = $0.01, 100 pts = $1).
--   NULL = not configured.
-- is_active: merchant pause toggle (D-15). Default true so once rates are saved, earning starts.
-- D-10 gate: both earn_rate_cents AND redeem_rate_cents must be non-null for system to activate.
CREATE TABLE public.loyalty_settings (
  store_id UUID PRIMARY KEY REFERENCES public.stores(id),
  earn_rate_cents INTEGER NULL,
  redeem_rate_cents INTEGER NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Section 3: Create loyalty_points table (denormalized balance ledger)
-- ============================================================
-- One row per (store_id, customer_id) pair. Denormalized for fast balance lookups.
-- points_balance CHECK (>= 0) prevents negative balances at DB level.
CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  loyalty_banner_dismissed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, customer_id)
);

-- ============================================================
-- Section 4: Create loyalty_transactions table (append-only audit log)
-- ============================================================
-- points_delta: positive = earn, negative = redeem, any sign = adjustment
-- balance_after: snapshot of balance after this transaction (CHECK >= 0)
-- transaction_type: 'earn' | 'redeem' | 'adjustment'
-- channel: 'pos' | 'online' (nullable for adjustments)
-- staff_id: nullable — online transactions have no staff
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  points_delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'adjustment')),
  order_id UUID REFERENCES public.orders(id),
  channel TEXT CHECK (channel IN ('pos', 'online')),
  staff_id UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Section 5: Indexes
-- ============================================================
CREATE INDEX idx_loyalty_points_store_customer ON public.loyalty_points(store_id, customer_id);
CREATE INDEX idx_loyalty_transactions_customer ON public.loyalty_transactions(store_id, customer_id, created_at DESC);
CREATE INDEX idx_loyalty_transactions_order ON public.loyalty_transactions(order_id);

-- ============================================================
-- Section 6: RLS policies
-- ============================================================
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- loyalty_settings: tenant isolation via app.store_id custom claim
CREATE POLICY loyalty_settings_store ON public.loyalty_settings
  FOR ALL USING (store_id = (current_setting('app.store_id', true))::uuid);

-- loyalty_points: tenant isolation
CREATE POLICY loyalty_points_store ON public.loyalty_points
  FOR ALL USING (store_id = (current_setting('app.store_id', true))::uuid);

-- loyalty_transactions: tenant isolation (append-only enforced at RPC layer)
CREATE POLICY loyalty_transactions_store ON public.loyalty_transactions
  FOR ALL USING (store_id = (current_setting('app.store_id', true))::uuid);

-- ============================================================
-- Section 7: earn_loyalty_points RPC
-- ============================================================
-- Atomically earns points for a customer on a completed sale.
-- D-10 gate: only earns if loyalty_settings exists, is_active=true, AND both rates non-null.
-- Returns { points_earned, balance_after } or { points_earned: 0, reason: 'not_configured' }.
-- SECURITY DEFINER: callable by service_role only (called after complete_pos_sale/complete_online_sale).
CREATE OR REPLACE FUNCTION public.earn_loyalty_points(
  p_store_id UUID,
  p_customer_id UUID,
  p_order_id UUID DEFAULT NULL,
  p_net_amount_cents INTEGER DEFAULT 0,
  p_channel TEXT DEFAULT 'pos',
  p_staff_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings RECORD;
  v_points_earned INTEGER;
  v_current_balance INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Look up loyalty settings (D-10 gate)
  SELECT * INTO v_settings
  FROM public.loyalty_settings
  WHERE store_id = p_store_id;

  -- Gate: settings must exist, be active, and both rates must be configured
  IF v_settings IS NULL
    OR v_settings.is_active = false
    OR v_settings.earn_rate_cents IS NULL
    OR v_settings.redeem_rate_cents IS NULL
  THEN
    RETURN jsonb_build_object('points_earned', 0, 'reason', 'not_configured');
  END IF;

  -- Nothing to earn on zero or negative amounts
  IF p_net_amount_cents <= 0 THEN
    RETURN jsonb_build_object('points_earned', 0, 'reason', 'zero_amount');
  END IF;

  -- Calculate points earned: FLOOR(net_amount_cents / earn_rate_cents)
  v_points_earned := FLOOR(p_net_amount_cents::NUMERIC / v_settings.earn_rate_cents);

  -- If no points earned (order below earn threshold), return early
  IF v_points_earned <= 0 THEN
    RETURN jsonb_build_object('points_earned', 0, 'reason', 'below_threshold');
  END IF;

  -- UPSERT loyalty_points balance
  INSERT INTO public.loyalty_points (store_id, customer_id, points_balance, updated_at)
  VALUES (p_store_id, p_customer_id, v_points_earned, now())
  ON CONFLICT (store_id, customer_id)
  DO UPDATE SET
    points_balance = loyalty_points.points_balance + v_points_earned,
    updated_at = now()
  RETURNING points_balance INTO v_balance_after;

  -- Insert transaction record
  INSERT INTO public.loyalty_transactions (
    store_id, customer_id, points_delta, balance_after,
    transaction_type, order_id, channel, staff_id
  ) VALUES (
    p_store_id, p_customer_id, v_points_earned, v_balance_after,
    'earn', p_order_id, p_channel, p_staff_id
  );

  RETURN jsonb_build_object(
    'points_earned', v_points_earned,
    'balance_after', v_balance_after
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.earn_loyalty_points FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.earn_loyalty_points TO service_role;

-- ============================================================
-- Section 8: redeem_loyalty_points RPC
-- ============================================================
-- Atomically deducts points from a customer's balance and calculates discount.
-- Uses SELECT FOR UPDATE row lock to prevent concurrent redemptions (same pattern as redeem_gift_card).
-- Validates: loyalty_points row exists, sufficient balance, settings active.
-- Returns { discount_cents, balance_after }.
-- SECURITY DEFINER: callable by service_role only.
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_store_id UUID,
  p_customer_id UUID,
  p_points_to_redeem INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_channel TEXT DEFAULT 'pos',
  p_staff_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings RECORD;
  v_points_row RECORD;
  v_discount_cents INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Validate input
  IF p_points_to_redeem <= 0 THEN
    RAISE EXCEPTION 'INVALID_POINTS_AMOUNT:%', p_points_to_redeem;
  END IF;

  -- Look up loyalty settings
  SELECT * INTO v_settings
  FROM public.loyalty_settings
  WHERE store_id = p_store_id;

  IF v_settings IS NULL OR v_settings.is_active = false OR v_settings.redeem_rate_cents IS NULL THEN
    RAISE EXCEPTION 'LOYALTY_NOT_CONFIGURED:%', p_store_id;
  END IF;

  -- Lock the loyalty_points row to prevent concurrent redemptions (SELECT FOR UPDATE)
  SELECT * INTO v_points_row
  FROM public.loyalty_points
  WHERE store_id = p_store_id AND customer_id = p_customer_id
  FOR UPDATE;

  IF v_points_row IS NULL THEN
    RAISE EXCEPTION 'LOYALTY_POINTS_NOT_FOUND:%', p_customer_id;
  END IF;

  IF v_points_row.points_balance < p_points_to_redeem THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS:%:balance=%:requested=%',
      p_customer_id, v_points_row.points_balance, p_points_to_redeem;
  END IF;

  -- Calculate discount: points * redeem_rate_cents (e.g. 100 pts * 1 cent = $1.00)
  v_discount_cents := p_points_to_redeem * v_settings.redeem_rate_cents;
  v_balance_after := v_points_row.points_balance - p_points_to_redeem;

  -- Deduct points from balance
  UPDATE public.loyalty_points
  SET
    points_balance = v_balance_after,
    updated_at = now()
  WHERE store_id = p_store_id AND customer_id = p_customer_id;

  -- Insert transaction record (negative delta for redemption)
  INSERT INTO public.loyalty_transactions (
    store_id, customer_id, points_delta, balance_after,
    transaction_type, order_id, channel, staff_id
  ) VALUES (
    p_store_id, p_customer_id, -p_points_to_redeem, v_balance_after,
    'redeem', p_order_id, p_channel, p_staff_id
  );

  RETURN jsonb_build_object(
    'discount_cents', v_discount_cents,
    'balance_after', v_balance_after
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_points FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points TO service_role;
