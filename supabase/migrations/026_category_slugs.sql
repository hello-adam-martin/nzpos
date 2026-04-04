-- Add slug column to categories for friendly storefront URLs
ALTER TABLE categories ADD COLUMN slug text;

-- Generate slugs from existing category names (lowercase, hyphens for spaces, strip special chars)
UPDATE categories
SET slug = lower(regexp_replace(regexp_replace(trim(name), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));

-- Make slug NOT NULL after backfill
ALTER TABLE categories ALTER COLUMN slug SET NOT NULL;

-- Unique slug per store (different stores can reuse slugs)
ALTER TABLE categories ADD CONSTRAINT categories_store_slug_unique UNIQUE (store_id, slug);

-- Public read policy for storefront (anonymous users need to see categories)
CREATE POLICY categories_public_read ON categories
  FOR SELECT
  USING (true);
