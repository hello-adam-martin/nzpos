-- Performance indexes for critical query paths (Phase 18, QUAL-04)

-- POS product list: SELECT * FROM products WHERE store_id=$1 AND is_active=true
-- Partial index on active products only — reduces index size and improves POS product grid queries
CREATE INDEX IF NOT EXISTS idx_products_store_active
  ON products (store_id, is_active)
  WHERE is_active = true;

-- Dashboard order reports: SELECT * FROM orders WHERE store_id=$1 AND status IN (...)
-- Note: idx_orders_status already covers (store_id, status) from migration 001.
-- This alias index is safe to create (IF NOT EXISTS) and signals intent for this query pattern.
CREATE INDEX IF NOT EXISTS idx_orders_store_status
  ON orders (store_id, status);

-- Xero sync date range queries: WHERE store_id=$1 AND created_at BETWEEN ...
-- Note: idx_orders_created already covers (store_id, created_at) from migration 001.
-- Adding DESC ordering hint for most-recent-first query patterns.
CREATE INDEX IF NOT EXISTS idx_orders_store_created
  ON orders (store_id, created_at DESC);
