-- Migration: 014_multi_tenant_schema.sql
-- Multi-tenant SaaS schema additions for v2.0
-- Adds: stores.slug, branding columns, is_active, stripe_customer_id
--       store_plans table (feature flags + billing), super_admins table
-- TENANT-02: Database foundation for multi-tenant infrastructure

-- ============================================================
-- 1. Add slug to stores (D-07: tenant resolution via slug)
-- ============================================================
-- Add with DEFAULT to satisfy NOT NULL for existing rows, then drop default
-- so future inserts must explicitly provide a slug.
ALTER TABLE public.stores ADD COLUMN slug TEXT UNIQUE NOT NULL DEFAULT 'demo';
ALTER TABLE public.stores ALTER COLUMN slug DROP DEFAULT;
CREATE INDEX idx_stores_slug ON public.stores(slug);

-- ============================================================
-- 2. Add branding columns to stores (D-09)
-- ============================================================
ALTER TABLE public.stores ADD COLUMN logo_url TEXT;
ALTER TABLE public.stores ADD COLUMN store_description TEXT;
ALTER TABLE public.stores ADD COLUMN primary_color TEXT DEFAULT '#1e3a5f';

-- ============================================================
-- 3. Add is_active to stores (D-10)
-- ============================================================
-- NOTE: created_at already exists from 001_initial_schema.sql — NOT added here
ALTER TABLE public.stores ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 4. Add stripe_customer_id to stores (D-11)
-- ============================================================
ALTER TABLE public.stores ADD COLUMN stripe_customer_id TEXT;

-- ============================================================
-- 5. Create store_plans table (D-08: feature flags + billing)
-- ============================================================
CREATE TABLE public.store_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) UNIQUE,
  has_xero BOOLEAN NOT NULL DEFAULT false,
  has_email_notifications BOOLEAN NOT NULL DEFAULT false,
  has_custom_domain BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for store_plans will be created in Plan 03 alongside all other policies.

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.store_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. Create super_admins table (D-12: platform super-admin access)
-- ============================================================
-- No RLS on super_admins — only accessed via auth hook (service role) and admin client.
CREATE TABLE public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grant SELECT to supabase_auth_admin so the auth hook can check super-admin status
GRANT SELECT ON public.super_admins TO supabase_auth_admin;
