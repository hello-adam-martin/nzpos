-- Migration: 020_super_admin_panel.sql
-- Super admin panel data layer for Phase 16
-- Adds: suspended_at, suspension_reason on stores
--       manual_override columns on store_plans
--       super_admin_actions audit table with RLS

-- ============================================================
-- 1. Suspension columns on stores (D-11)
-- ============================================================
ALTER TABLE public.stores
  ADD COLUMN suspended_at TIMESTAMPTZ,
  ADD COLUMN suspension_reason TEXT;

-- ============================================================
-- 2. Manual override tracking on store_plans (D-16, Option A)
-- ============================================================
ALTER TABLE public.store_plans
  ADD COLUMN has_xero_manual_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_email_notifications_manual_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_custom_domain_manual_override BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 3. Super admin audit table (D-17)
-- ============================================================
CREATE TABLE public.super_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('suspend', 'unsuspend', 'activate_addon', 'deactivate_addon')),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admin_actions ENABLE ROW LEVEL SECURITY;

-- Read policy: super admins only (via app_metadata JWT claim)
-- No INSERT policy — writes via admin client (service role) only
CREATE POLICY "super_admin_actions_read" ON public.super_admin_actions
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );
