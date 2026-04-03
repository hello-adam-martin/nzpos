-- Migration 022: Drop anonymous order read policy (Phase 17 Gap Closure)
--
-- Fully closes Critical finding F-1.3 from SECURITY-AUDIT.md.
-- The orders_public_read_by_token policy (migration 021) only requires
-- lookup_token IS NOT NULL, which allows anonymous users to enumerate
-- all confirmed online orders via direct Supabase REST API.
--
-- Both order confirmation pages (order/[id]/page.tsx and
-- order/[id]/confirmation/page.tsx) use createSupabaseAdminClient()
-- which bypasses RLS entirely. No application code depends on the
-- anon SELECT policy. Dropping it removes the enumeration vector
-- without affecting functionality.

DROP POLICY IF EXISTS "orders_public_read_by_token" ON public.orders;
