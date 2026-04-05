-- Phase 25: Add is_active to customers table (CUST-04 disable flow)
-- and expand stores table for business details and receipt customization (SETTINGS-01/02/03)

-- Add is_active to customers table
ALTER TABLE public.customers
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Expand stores table for business details and receipt customization
ALTER TABLE public.stores
  ADD COLUMN business_address TEXT,
  ADD COLUMN ird_gst_number TEXT,
  ADD COLUMN receipt_header TEXT,
  ADD COLUMN receipt_footer TEXT;
