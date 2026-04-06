-- Migration: 030_analytics_snapshot.sql
-- Phase 27 — Stripe analytics snapshot tables for super-admin MRR/churn metrics
-- Two tables: platform_analytics_snapshots (one row per subscription item per month)
--             analytics_sync_metadata (tracks last sync time for rate limiting)

-- platform_analytics_snapshots: one row per subscription item per month
CREATE TABLE public.platform_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.stores(id),
  stripe_subscription_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  plan_interval TEXT NOT NULL CHECK (plan_interval IN ('month', 'year')),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  mrr_cents INTEGER NOT NULL DEFAULT 0,
  addon_type TEXT,
  canceled_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  snapshot_month TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- analytics_sync_metadata: single row tracks last sync timestamp for rate limiting
CREATE TABLE public.analytics_sync_metadata (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01'::TIMESTAMPTZ
);

-- Seed the metadata row (ON CONFLICT DO NOTHING for idempotency)
INSERT INTO public.analytics_sync_metadata (id, last_synced_at)
VALUES (1, '1970-01-01'::TIMESTAMPTZ)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security on both tables
ALTER TABLE public.platform_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sync_metadata ENABLE ROW LEVEL SECURITY;

-- RLS: super-admin read-only access (all writes via service role / admin client)
-- Follows Phase 16 super_admin_actions RLS pattern
CREATE POLICY "snapshots_read_super_admin" ON public.platform_analytics_snapshots
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

CREATE POLICY "sync_metadata_read_super_admin" ON public.analytics_sync_metadata
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- No UPDATE/INSERT/DELETE policies — all writes via admin client (service role)
-- This prevents any client-side writes while allowing cron/server action writes via service role
