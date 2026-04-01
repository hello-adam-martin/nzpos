-- Migration 007: Reconcile cash_sessions schema
-- The types in database.ts used wrong column names (staff_id, closing_float_cents, actual_cash_cents).
-- This migration drops and recreates cash_sessions to match 001_initial_schema.sql ground truth.
-- Safe to drop as no production data exists (cash-up was never implemented).

DROP TABLE IF EXISTS public.cash_sessions;

CREATE TABLE public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  opened_by UUID NOT NULL REFERENCES public.staff(id),
  closed_by UUID REFERENCES public.staff(id),
  opening_float_cents INTEGER NOT NULL,
  closing_cash_cents INTEGER,
  expected_cash_cents INTEGER,
  variance_cents INTEGER,
  notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.cash_sessions
  FOR ALL
  USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
