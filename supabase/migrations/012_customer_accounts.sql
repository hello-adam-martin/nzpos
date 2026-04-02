-- Migration: 012_customer_accounts.sql
-- Adds customer account infrastructure to the NZPOS system.
-- Creates the customers table (analogous to staff), extends the auth hook
-- to inject role='customer' and store_id into JWT, adds customer_id to orders,
-- replaces broad tenant_isolation RLS policies with role-guarded versions,
-- and provides an order-linking RPC for auto-linking past orders on signup.

-- =============================================================================
-- 1. Customers table
-- =============================================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  name TEXT,
  email TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{"email_receipts": true, "marketing_emails": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_auth_user_id ON public.customers(auth_user_id);
CREATE INDEX idx_customers_email ON public.customers(email);

-- Updated_at trigger for customers
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 2. Add customer_id column to orders
--    References auth.users(id) directly for simpler RLS (customer can check
--    customer_id = auth.uid() without a join to the customers table).
-- =============================================================================
ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);

-- =============================================================================
-- 3. Enable RLS on customers + access policies
-- =============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Customer can read and update their own profile row
CREATE POLICY "customer_own_profile" ON public.customers
  FOR ALL USING (auth_user_id = auth.uid());

-- Staff/owner can read customer records for admin purposes
CREATE POLICY "staff_read_customers" ON public.customers
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
    AND store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
  );

-- =============================================================================
-- 4. CRITICAL: Replace tenant_isolation on orders with role-guarded version
--    Pitfall: the old policy allowed ANY authenticated user with a matching
--    store_id to see ALL orders. Customers must only see their own orders.
-- =============================================================================
DROP POLICY "tenant_isolation" ON public.orders;

-- Staff and owner: full access to all orders in their store
CREATE POLICY "staff_owner_orders" ON public.orders
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

-- Customer: read-only access to their own orders
CREATE POLICY "customer_own_orders" ON public.orders
  FOR SELECT USING (
    customer_id = auth.uid()
    AND store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
  );

-- =============================================================================
-- 5. Replace tenant_isolation on order_items with role-guarded version
-- =============================================================================
DROP POLICY "tenant_isolation" ON public.order_items;

-- Staff and owner: full access to all order items in their store
CREATE POLICY "staff_owner_order_items" ON public.order_items
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

-- Customer: read-only access to items belonging to their own orders
CREATE POLICY "customer_own_order_items" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE customer_id = auth.uid()
    )
  );

-- =============================================================================
-- 6. Auth hook extension
--    CREATE OR REPLACE extends the existing hook from 003_auth_hook.sql.
--    After failing to find a staff record, it looks for a customers record
--    and injects role='customer' and store_id into the JWT app_metadata.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  claims JSONB;
  user_store_id UUID;
  user_role TEXT;
BEGIN
  claims := event -> 'claims';

  -- First: check if this is a staff or owner user
  SELECT s.store_id, s.role INTO user_store_id, user_role
  FROM public.staff s
  WHERE s.auth_user_id = (event ->> 'user_id')::UUID;

  -- If not staff/owner, check if this is a customer
  IF user_store_id IS NULL THEN
    SELECT c.store_id, 'customer' INTO user_store_id, user_role
    FROM public.customers c
    WHERE c.auth_user_id = (event ->> 'user_id')::UUID;
  END IF;

  -- Inject claims if a matching record was found
  IF user_store_id IS NOT NULL THEN
    -- Ensure app_metadata object exists
    IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;

    -- Inject store_id and role into app_metadata
    claims := jsonb_set(claims, '{app_metadata,store_id}', to_jsonb(user_store_id::TEXT));
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant supabase_auth_admin SELECT on customers so the hook can look up store_id
GRANT SELECT ON public.customers TO supabase_auth_admin;

-- =============================================================================
-- 7. Order-linking RPC
--    Called after customer signup (D-11): links all past orders where
--    customer_email matches the new account's email. SECURITY DEFINER so
--    it can update orders on behalf of the caller without the customer
--    needing direct UPDATE access on orders.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.link_customer_orders(
  p_auth_user_id UUID,
  p_email TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_linked_count INTEGER;
BEGIN
  UPDATE public.orders
  SET customer_id = p_auth_user_id
  WHERE customer_email = p_email
    AND customer_id IS NULL;
  GET DIAGNOSTICS v_linked_count = ROW_COUNT;
  RETURN v_linked_count;
END;
$$;
