-- Migration: 018_setup_wizard.sql
-- Setup wizard schema additions for Phase 14 store-setup-wizard-marketing.
-- Adds: setup_completed_steps, setup_wizard_dismissed columns to stores.
-- Creates: store-logos storage bucket with public read / authenticated write policies.

-- ============================================================
-- 1. Add setup wizard tracking columns to stores (D-01)
-- ============================================================
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS setup_completed_steps INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_wizard_dismissed BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. Create store-logos storage bucket (public)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Storage policies for store-logos bucket
-- ============================================================

CREATE POLICY "Public read access for store logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-logos');

CREATE POLICY "Authenticated users can upload store logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'store-logos');

CREATE POLICY "Authenticated users can update store logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'store-logos');

CREATE POLICY "Authenticated users can delete store logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'store-logos');
