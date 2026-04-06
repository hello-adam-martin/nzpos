-- Migration: 033_gift_cards.sql
-- Phase 35: Gift Cards Add-on
-- Creates gift_cards + gift_card_redemptions tables, atomic RPCs (issue, redeem, void),
-- RLS policies, indexes, and adds store_plans.has_gift_cards + stores.gift_card_denominations columns.
-- NZ Fair Trading Act 2024: 3-year minimum expiry enforced via DB CHECK constraint.

-- ============================================================
-- Section 1: Add has_gift_cards to store_plans
-- ============================================================
ALTER TABLE public.store_plans ADD COLUMN has_gift_cards BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.store_plans ADD COLUMN has_gift_cards_manual_override BOOLEAN;

-- ============================================================
-- Section 2: Add gift_card_denominations to stores
-- ============================================================
-- Per D-09: fixed denominations stored as integer cents array.
-- Default: $25 (2500), $50 (5000), $100 (10000).
ALTER TABLE public.stores ADD COLUMN gift_card_denominations JSONB DEFAULT '[2500, 5000, 10000]'::JSONB;

-- ============================================================
-- Section 3: Create gift_cards table
-- ============================================================
-- Per D-18, D-19: Completely separate from orders table (gift card issuance is deferred liability).
-- 3-year minimum expiry enforced by CHECK constraint (NZ Fair Trading Act 2024).
CREATE TABLE public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  code TEXT NOT NULL,
  original_value_cents INTEGER NOT NULL CHECK (original_value_cents > 0),
  balance_cents INTEGER NOT NULL CHECK (balance_cents >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'redeemed', 'expired', 'voided')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT gift_card_expiry_3yr CHECK (expires_at >= issued_at + INTERVAL '3 years'),
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  purchase_channel TEXT NOT NULL CHECK (purchase_channel IN ('pos', 'online')),
  buyer_email TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);

-- ============================================================
-- Section 4: Create gift_card_redemptions table
-- ============================================================
CREATE TABLE public.gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  balance_after_cents INTEGER NOT NULL CHECK (balance_after_cents >= 0),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT NOT NULL CHECK (channel IN ('pos', 'online')),
  order_id UUID REFERENCES public.orders(id),
  staff_id UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Section 5: Indexes
-- ============================================================
CREATE INDEX idx_gift_cards_store_id ON public.gift_cards(store_id);
CREATE INDEX idx_gift_cards_store_code ON public.gift_cards(store_id, code);
CREATE INDEX idx_gift_cards_store_status ON public.gift_cards(store_id, status);
CREATE INDEX idx_gift_card_redemptions_gift_card ON public.gift_card_redemptions(gift_card_id);
CREATE INDEX idx_gift_card_redemptions_store ON public.gift_card_redemptions(store_id);

-- ============================================================
-- Section 6: RLS policies
-- ============================================================

-- gift_cards: tenant isolation — authenticated users scoped to their store_id
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.gift_cards
  FOR SELECT USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

CREATE POLICY "tenant_insert" ON public.gift_cards
  FOR INSERT WITH CHECK (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

CREATE POLICY "tenant_update" ON public.gift_cards
  FOR UPDATE USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- gift_card_redemptions: append-only — INSERT + SELECT only, no UPDATE/DELETE
ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.gift_card_redemptions
  FOR SELECT USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

CREATE POLICY "tenant_insert" ON public.gift_card_redemptions
  FOR INSERT WITH CHECK (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
-- NOTE: No UPDATE or DELETE policies — redemption log is immutable for tenants.

-- ============================================================
-- Section 7: issue_gift_card RPC
-- ============================================================
-- Atomically inserts a gift card with expires_at = issued_at + 3 years.
-- The DB CHECK constraint gift_card_expiry_3yr enforces the minimum.
-- SECURITY DEFINER: called by service_role only (billing webhook, POS backend).
CREATE OR REPLACE FUNCTION public.issue_gift_card(
  p_store_id UUID,
  p_code TEXT,
  p_value_cents INTEGER,
  p_channel TEXT,
  p_buyer_email TEXT DEFAULT NULL,
  p_stripe_session_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_issued_at TIMESTAMPTZ := now();
  v_expires_at TIMESTAMPTZ;
  v_gift_card_id UUID;
BEGIN
  -- expires_at = issued_at + 3 years (satisfies NZ Fair Trading Act 2024 minimum)
  v_expires_at := v_issued_at + INTERVAL '3 years';

  INSERT INTO public.gift_cards (
    store_id, code, original_value_cents, balance_cents, status,
    issued_at, expires_at, purchase_channel, buyer_email, stripe_session_id
  ) VALUES (
    p_store_id, p_code, p_value_cents, p_value_cents, 'active',
    v_issued_at, v_expires_at, p_channel, p_buyer_email, p_stripe_session_id
  )
  RETURNING id INTO v_gift_card_id;

  RETURN jsonb_build_object(
    'gift_card_id', v_gift_card_id,
    'code', p_code,
    'value_cents', p_value_cents,
    'expires_at', v_expires_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.issue_gift_card FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_gift_card TO service_role;

-- ============================================================
-- Section 8: redeem_gift_card RPC
-- ============================================================
-- Atomically deducts from balance_cents with SELECT FOR UPDATE row lock.
-- Validates: card exists, status is 'active', not expired, sufficient balance.
-- Updates status to 'redeemed' if balance reaches 0.
-- SECURITY DEFINER: called by service_role only.
CREATE OR REPLACE FUNCTION public.redeem_gift_card(
  p_store_id UUID,
  p_gift_card_id UUID,
  p_amount_cents INTEGER,
  p_channel TEXT,
  p_order_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card RECORD;
  v_balance_after INTEGER;
  v_new_status TEXT;
BEGIN
  -- Lock the gift card row to prevent concurrent redemptions
  SELECT * INTO v_card
  FROM public.gift_cards
  WHERE id = p_gift_card_id AND store_id = p_store_id
  FOR UPDATE;

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'GIFT_CARD_NOT_FOUND:%', p_gift_card_id;
  END IF;

  IF v_card.status != 'active' THEN
    RAISE EXCEPTION 'GIFT_CARD_NOT_ACTIVE:%:status=%', p_gift_card_id, v_card.status;
  END IF;

  IF v_card.expires_at < now() THEN
    RAISE EXCEPTION 'GIFT_CARD_EXPIRED:%', p_gift_card_id;
  END IF;

  IF v_card.balance_cents < p_amount_cents THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE:%:balance=%:requested=%',
      p_gift_card_id, v_card.balance_cents, p_amount_cents;
  END IF;

  v_balance_after := v_card.balance_cents - p_amount_cents;
  v_new_status := CASE WHEN v_balance_after = 0 THEN 'redeemed' ELSE 'active' END;

  -- Deduct balance and update status
  UPDATE public.gift_cards
  SET
    balance_cents = v_balance_after,
    status = v_new_status,
    updated_at = now()
  WHERE id = p_gift_card_id AND store_id = p_store_id;

  -- Insert redemption record
  INSERT INTO public.gift_card_redemptions (
    store_id, gift_card_id, amount_cents, balance_after_cents,
    channel, order_id, staff_id
  ) VALUES (
    p_store_id, p_gift_card_id, p_amount_cents, v_balance_after,
    p_channel, p_order_id, p_staff_id
  );

  RETURN jsonb_build_object(
    'gift_card_id', p_gift_card_id,
    'amount_deducted_cents', p_amount_cents,
    'balance_after_cents', v_balance_after
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_gift_card FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_gift_card TO service_role;

-- ============================================================
-- Section 9: void_gift_card RPC
-- ============================================================
-- Atomically voids a gift card: sets status to 'voided', zeroes balance.
-- Only callable on active cards.
-- SECURITY DEFINER: called by service_role only (admin backend).
CREATE OR REPLACE FUNCTION public.void_gift_card(
  p_store_id UUID,
  p_gift_card_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card RECORD;
BEGIN
  SELECT * INTO v_card
  FROM public.gift_cards
  WHERE id = p_gift_card_id AND store_id = p_store_id
  FOR UPDATE;

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'GIFT_CARD_NOT_FOUND:%', p_gift_card_id;
  END IF;

  IF v_card.status != 'active' THEN
    RAISE EXCEPTION 'GIFT_CARD_NOT_ACTIVE:%:status=%', p_gift_card_id, v_card.status;
  END IF;

  UPDATE public.gift_cards
  SET
    status = 'voided',
    voided_at = now(),
    void_reason = p_reason,
    balance_cents = 0,
    updated_at = now()
  WHERE id = p_gift_card_id AND store_id = p_store_id;

  RETURN jsonb_build_object(
    'gift_card_id', p_gift_card_id,
    'status', 'voided',
    'reason', p_reason
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.void_gift_card FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_gift_card TO service_role;
