-- Migration 009: Post-ship security and data integrity fixes
-- Addresses: IDOR (lookup_token), promo tracking (promo_id), atomic RPCs,
-- rate limiting, refund audit trail.

-- 1. Add lookup_token to orders for IDOR protection on public order pages
ALTER TABLE public.orders ADD COLUMN lookup_token TEXT;

-- 2. Add promo_id to orders so webhook can increment promo uses after payment
ALTER TABLE public.orders ADD COLUMN promo_id UUID REFERENCES public.promo_codes(id);

-- 3. Add stripe_refund_id to orders for refund audit trail
ALTER TABLE public.orders ADD COLUMN stripe_refund_id TEXT;

-- 4. Atomic promo increment RPC (prevents read-then-write race)
CREATE OR REPLACE FUNCTION public.increment_promo_uses(p_promo_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = p_promo_id;
$$;

-- 5. Atomic stock restore RPC (prevents read-then-write race on refund)
CREATE OR REPLACE FUNCTION public.restore_stock(p_product_id UUID, p_quantity INT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.products
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_product_id;
$$;

-- 6. Rate limits table for server-side rate limiting (replaces in-memory Map)
CREATE TABLE public.rate_limits (
  ip TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_start)
);

-- Auto-cleanup old entries (no RLS needed — accessed via RPC only)

-- 7. Atomic rate limit check RPC
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_ip TEXT,
  p_max INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Truncate to window boundary
  v_window_start := date_trunc('minute', now());

  -- Upsert: increment if exists, insert if not
  INSERT INTO public.rate_limits (ip, window_start, count)
  VALUES (p_ip, v_window_start, 1)
  ON CONFLICT (ip, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Clean up old windows (older than 5 minutes)
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '5 minutes';

  RETURN v_count <= p_max;
END;
$$;
