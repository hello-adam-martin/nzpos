-- Migration: 013_partial_refunds.sql
-- Adds partial refund support: refunds table, refund_items table,
-- partially_refunded order status, and xero_invoice_id on orders.

-- 1. Drop and recreate orders status CHECK constraint to add 'partially_refunded'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'completed', 'refunded', 'partially_refunded',
                    'expired', 'pending_pickup', 'ready', 'collected'));

-- 2. Add xero_invoice_id nullable TEXT column to orders (per D-10)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS xero_invoice_id TEXT;

-- 3. Create refunds table (per D-06)
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  reason TEXT NOT NULL CHECK (reason IN ('customer_request', 'damaged', 'wrong_item', 'other')),
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  stripe_refund_id TEXT,
  created_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_notified BOOLEAN NOT NULL DEFAULT false
);

-- 4. Create refund_items join table (per D-06)
CREATE TABLE public.refund_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id),
  quantity_refunded INTEGER NOT NULL CHECK (quantity_refunded > 0),
  line_total_refunded_cents INTEGER NOT NULL
);

-- 5. Create indexes for performance
CREATE INDEX idx_refunds_order ON public.refunds(order_id);
CREATE INDEX idx_refunds_store ON public.refunds(store_id);
CREATE INDEX idx_refund_items_refund ON public.refund_items(refund_id);
CREATE INDEX idx_refund_items_order_item ON public.refund_items(order_item_id);

-- 6. Enable RLS on both tables
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for refunds
CREATE POLICY "Staff can view refunds for their store"
  ON public.refunds FOR SELECT
  USING (store_id = (current_setting('request.jwt.claims', true)::json->>'store_id')::uuid);

CREATE POLICY "Staff can insert refunds for their store"
  ON public.refunds FOR INSERT
  WITH CHECK (store_id = (current_setting('request.jwt.claims', true)::json->>'store_id')::uuid);

-- 8. RLS policies for refund_items
CREATE POLICY "Staff can view refund items via refund"
  ON public.refund_items FOR SELECT
  USING (refund_id IN (
    SELECT id FROM public.refunds
    WHERE store_id = (current_setting('request.jwt.claims', true)::json->>'store_id')::uuid
  ));
