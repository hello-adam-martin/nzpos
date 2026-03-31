-- Migration: 002_rls_policies.sql
-- Enables Row Level Security on all tables.
-- Tenant isolation: store_id must match JWT app_metadata.store_id claim.
-- Public read policies allow anonymous access to active products and promo codes
-- (required for online storefront).

-- Enable RLS on all tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

-- Stores: owner can see their own store (id matches JWT store_id claim)
CREATE POLICY "owner_isolation" ON public.stores
  FOR ALL USING (id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- Staff: store_id must match JWT claim
CREATE POLICY "tenant_isolation" ON public.staff
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- Categories: store_id must match JWT claim
CREATE POLICY "tenant_isolation" ON public.categories
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- Products: store_id must match JWT claim (authenticated access)
CREATE POLICY "tenant_isolation" ON public.products
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- Products: public read for active products (online storefront — anon role)
-- NOTE: FOR SELECT uses USING only. WITH CHECK is invalid on SELECT policies.
CREATE POLICY "public_read_active" ON public.products
  FOR SELECT USING (is_active = true);

-- Orders: store_id must match JWT claim
CREATE POLICY "tenant_isolation" ON public.orders
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- Order items: store_id must match JWT claim
CREATE POLICY "tenant_isolation" ON public.order_items
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- Promo codes: store_id must match JWT claim (authenticated access)
CREATE POLICY "tenant_isolation" ON public.promo_codes
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- Promo codes: public read for active, non-expired codes (online storefront validation)
-- NOTE: FOR SELECT uses USING only. WITH CHECK is invalid on SELECT policies.
CREATE POLICY "public_read_active" ON public.promo_codes
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Stripe events: store_id must match JWT claim
CREATE POLICY "tenant_isolation" ON public.stripe_events
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- Cash sessions: store_id must match JWT claim
CREATE POLICY "tenant_isolation" ON public.cash_sessions
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
