-- Migration: 019_billing_claims.sql
-- Extends the custom_access_token_hook to inject feature flag JWT claims
-- from store_plans table. This enables fast, DB-free feature gating in
-- requireFeature() on every request.
--
-- Features injected as boolean claims in app_metadata:
--   xero, email_notifications, custom_domain
--
-- Approach: Full CREATE OR REPLACE of the hook function (same pattern as 016).
-- Keeps ALL existing logic from 016 and adds the feature flag block after
-- store_id is injected.

-- Grant supabase_auth_admin SELECT on store_plans so the auth hook can read
-- feature flags (Research Pitfall 5: without this the hook silently fails).
GRANT SELECT ON public.store_plans TO supabase_auth_admin;

-- Full replacement of custom_access_token_hook with feature flag support.
-- Preserves all existing logic from 016_super_admin.sql.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  claims JSONB;
  user_store_id UUID;
  user_role TEXT;
  v_is_super_admin BOOLEAN := false;
  v_has_xero BOOLEAN := false;
  v_has_email_notifications BOOLEAN := false;
  v_has_custom_domain BOOLEAN := false;
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

  -- 5. Feature flags from store_plans (billing)
  --    Inject boolean claims for each paid add-on feature.
  --    COALESCE to false if store_plans row doesn't exist or columns are null.
  IF user_store_id IS NOT NULL THEN
    SELECT sp.has_xero, sp.has_email_notifications, sp.has_custom_domain
    INTO v_has_xero, v_has_email_notifications, v_has_custom_domain
    FROM public.store_plans sp
    WHERE sp.store_id = user_store_id;

    -- Ensure app_metadata exists before setting feature flags
    IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;

    claims := jsonb_set(claims, '{app_metadata,xero}', to_jsonb(COALESCE(v_has_xero, false)));
    claims := jsonb_set(claims, '{app_metadata,email_notifications}', to_jsonb(COALESCE(v_has_email_notifications, false)));
    claims := jsonb_set(claims, '{app_metadata,custom_domain}', to_jsonb(COALESCE(v_has_custom_domain, false)));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Re-grant for super_admins (already granted in 016 — safe to re-grant idempotently)
GRANT SELECT ON public.super_admins TO supabase_auth_admin;
