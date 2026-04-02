-- Migration: 016_super_admin.sql
-- Extends the auth hook to check super_admins table and inject
-- is_super_admin=true into JWT app_metadata. Super admins get
-- cross-tenant SELECT via RLS policies in 015.
--
-- Super admin check runs before staff/customer lookup (D-12).
-- A user can be both super_admin AND store owner (dual claims, D-13).
-- A super admin who is also a store owner still gets their store_id injected.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  claims JSONB;
  user_store_id UUID;
  user_role TEXT;
  v_is_super_admin BOOLEAN := false;
BEGIN
  claims := event -> 'claims';

  -- 1. Check super admin first (cross-tenant, no store_id needed)
  SELECT true INTO v_is_super_admin
  FROM public.super_admins
  WHERE auth_user_id = (event ->> 'user_id')::UUID;

  -- 2. Check staff (owner/staff role)
  SELECT s.store_id, s.role INTO user_store_id, user_role
  FROM public.staff s
  WHERE s.auth_user_id = (event ->> 'user_id')::UUID;

  -- 3. If not staff/owner, check customer
  IF user_store_id IS NULL THEN
    SELECT c.store_id, 'customer' INTO user_store_id, user_role
    FROM public.customers c
    WHERE c.auth_user_id = (event ->> 'user_id')::UUID;
  END IF;

  -- 4. Inject claims if any role found
  IF v_is_super_admin OR user_store_id IS NOT NULL THEN
    -- Ensure app_metadata object exists
    IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;

    -- Inject store_id and role if found
    IF user_store_id IS NOT NULL THEN
      claims := jsonb_set(claims, '{app_metadata,store_id}', to_jsonb(user_store_id::TEXT));
      claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
    END IF;

    -- Inject super admin flag
    IF v_is_super_admin THEN
      claims := jsonb_set(claims, '{app_metadata,is_super_admin}', 'true'::JSONB);
    END IF;
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant supabase_auth_admin SELECT on super_admins table
-- (Already granted in 014 — safe to re-grant)
GRANT SELECT ON public.super_admins TO supabase_auth_admin;
