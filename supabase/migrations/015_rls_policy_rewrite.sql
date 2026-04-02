-- Migration: 015_rls_policy_rewrite.sql
-- D-14: Full RLS policy rewrite — clean slate with unified patterns.
-- All policies use auth.jwt() -> 'app_metadata' path (never current_setting).
-- Super admin: SELECT only across all tenants (D-13).
-- Customer isolation: can only see own orders/profile.
-- Public read preserved for products and promo_codes (storefront anon).
-- Refund/refund_items policies FIXED (013 used wrong JWT path).
-- store_plans: owner-read and super-admin-read only.

-- =====================================================
-- SECTION 1: Drop ALL existing RLS policies
-- This is the D-14 full rewrite — clean slate
-- =====================================================

-- From 002_rls_policies.sql
DROP POLICY IF EXISTS "owner_isolation" ON public.stores;
DROP POLICY IF EXISTS "tenant_isolation" ON public.staff;
DROP POLICY IF EXISTS "tenant_isolation" ON public.categories;
DROP POLICY IF EXISTS "tenant_isolation" ON public.products;
DROP POLICY IF EXISTS "public_read_active" ON public.products;
DROP POLICY IF EXISTS "tenant_isolation" ON public.orders;
DROP POLICY IF EXISTS "tenant_isolation" ON public.order_items;
DROP POLICY IF EXISTS "tenant_isolation" ON public.promo_codes;
DROP POLICY IF EXISTS "public_read_active" ON public.promo_codes;
DROP POLICY IF EXISTS "tenant_isolation" ON public.stripe_events;
DROP POLICY IF EXISTS "tenant_isolation" ON public.cash_sessions;

-- From 006_online_store.sql (additional public policies)
DROP POLICY IF EXISTS "Public can read active products" ON public.products;
DROP POLICY IF EXISTS "Public can read orders by id" ON public.orders;

-- From 012_customer_accounts.sql
DROP POLICY IF EXISTS "customer_own_profile" ON public.customers;
DROP POLICY IF EXISTS "staff_read_customers" ON public.customers;
DROP POLICY IF EXISTS "staff_owner_orders" ON public.orders;
DROP POLICY IF EXISTS "customer_own_orders" ON public.orders;
DROP POLICY IF EXISTS "staff_owner_order_items" ON public.order_items;
DROP POLICY IF EXISTS "customer_own_order_items" ON public.order_items;

-- From 013_partial_refunds.sql (BROKEN policies using wrong JWT path)
DROP POLICY IF EXISTS "Staff can view refunds for their store" ON public.refunds;
DROP POLICY IF EXISTS "Staff can insert refunds for their store" ON public.refunds;
DROP POLICY IF EXISTS "Staff can view refund items via refund" ON public.refund_items;

-- =====================================================
-- SECTION 2: Unified policies
-- Naming: {table}_{role}_{access_type}
-- Pattern: auth.jwt() -> 'app_metadata' ->> 'store_id'
-- Super admin: SELECT only (D-13: read-all, write-own)
-- =====================================================

-- STORES: owner can manage their own store
CREATE POLICY "stores_owner_access" ON public.stores
  FOR ALL USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner')
  );

-- STORES: super admin can read all stores
CREATE POLICY "stores_super_admin_read" ON public.stores
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- STAFF: owner/staff can manage staff in their store
CREATE POLICY "staff_tenant_access" ON public.staff
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

CREATE POLICY "staff_super_admin_read" ON public.staff
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- CATEGORIES: owner/staff full access
CREATE POLICY "categories_tenant_access" ON public.categories
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

CREATE POLICY "categories_super_admin_read" ON public.categories
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- PRODUCTS: owner/staff full access
CREATE POLICY "products_tenant_access" ON public.products
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

-- PRODUCTS: public read for active products (storefront anon access)
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (is_active = true);

-- PRODUCTS: super admin read all
CREATE POLICY "products_super_admin_read" ON public.products
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- ORDERS: owner/staff full access within store
CREATE POLICY "orders_staff_access" ON public.orders
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

-- ORDERS: customer read own orders only
CREATE POLICY "orders_customer_read" ON public.orders
  FOR SELECT USING (
    customer_id = auth.uid()
    AND store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
  );

-- ORDERS: public read for online orders by channel (guest checkout confirmation)
CREATE POLICY "orders_public_read" ON public.orders
  FOR SELECT USING (channel = 'online');

CREATE POLICY "orders_super_admin_read" ON public.orders
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- ORDER ITEMS: owner/staff full access
CREATE POLICY "order_items_staff_access" ON public.order_items
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

-- ORDER ITEMS: customer read items from their own orders
CREATE POLICY "order_items_customer_read" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "order_items_super_admin_read" ON public.order_items
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- PROMO CODES: owner/staff full access
CREATE POLICY "promo_codes_tenant_access" ON public.promo_codes
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

-- PROMO CODES: public read for active, non-expired codes (storefront validation)
CREATE POLICY "promo_codes_public_read" ON public.promo_codes
  FOR SELECT USING (
    is_active = true AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "promo_codes_super_admin_read" ON public.promo_codes
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- STRIPE EVENTS: owner/staff access
CREATE POLICY "stripe_events_tenant_access" ON public.stripe_events
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

CREATE POLICY "stripe_events_super_admin_read" ON public.stripe_events
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- CASH SESSIONS: owner/staff access
CREATE POLICY "cash_sessions_tenant_access" ON public.cash_sessions
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

CREATE POLICY "cash_sessions_super_admin_read" ON public.cash_sessions
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- CUSTOMERS: customer can manage their own profile
CREATE POLICY "customers_own_profile" ON public.customers
  FOR ALL USING (auth_user_id = auth.uid());

-- CUSTOMERS: staff/owner can read customers in their store
CREATE POLICY "customers_staff_read" ON public.customers
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
    AND store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
  );

CREATE POLICY "customers_super_admin_read" ON public.customers
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- REFUNDS: owner/staff access (FIXED from 013 — now uses app_metadata path)
CREATE POLICY "refunds_staff_access" ON public.refunds
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

CREATE POLICY "refunds_super_admin_read" ON public.refunds
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- REFUND ITEMS: staff read via refund join (FIXED from 013)
CREATE POLICY "refund_items_staff_read" ON public.refund_items
  FOR SELECT USING (
    refund_id IN (
      SELECT id FROM public.refunds
      WHERE store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    )
  );

-- REFUND ITEMS: staff can insert refund items for their store's refunds
CREATE POLICY "refund_items_staff_insert" ON public.refund_items
  FOR INSERT WITH CHECK (
    refund_id IN (
      SELECT id FROM public.refunds
      WHERE store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    )
  );

CREATE POLICY "refund_items_super_admin_read" ON public.refund_items
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- STORE PLANS: owner can read their store's plan (billing info — owner only, not staff)
CREATE POLICY "store_plans_owner_read" ON public.store_plans
  FOR SELECT USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
  );

-- STORE PLANS: super admin can read all
CREATE POLICY "store_plans_super_admin_read" ON public.store_plans
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- No INSERT/UPDATE policies on store_plans — written by service role only (billing webhook)
