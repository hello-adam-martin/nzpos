-- Migration: 011_notifications.sql
-- Phase 9: Notifications — email receipt and pickup-ready triggers.
-- Adds opening_hours to stores for use in pickup-ready email (D-04).

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS opening_hours TEXT;
