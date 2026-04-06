-- Migration: 034_cogs.sql
-- Phase 36: Advanced Reporting (COGS) Add-on
-- Adds has_advanced_reporting to store_plans and cost_price_cents to products.
-- Enables profit/margin reporting when the Advanced Reporting add-on is active.

-- ============================================================
-- Section 1: Add has_advanced_reporting to store_plans
-- ============================================================
ALTER TABLE public.store_plans
  ADD COLUMN has_advanced_reporting BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- Section 2: Add cost_price_cents to products
-- ============================================================
-- Nullable — NULL means "not set" (merchant has not entered a cost price).
-- Per D-03: cost price is GST-exclusive (supplier cost before tax).
-- CHECK constraint ensures non-negative values only.
ALTER TABLE public.products
  ADD COLUMN cost_price_cents INTEGER NULL
  CHECK (cost_price_cents IS NULL OR cost_price_cents >= 0);

-- ============================================================
-- Section 3: Index for COGS report queries
-- ============================================================
-- Partial index covers products that have a cost price set —
-- used by COGS report queries (products with cost prices in a store).
CREATE INDEX idx_products_cost_price ON public.products(store_id)
  WHERE cost_price_cents IS NOT NULL;
