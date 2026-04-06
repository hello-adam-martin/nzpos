-- Migration: 031_free_email_notifications.sql
-- Phase 29: Backend & Billing Cleanup — Free Email Notifications
-- Makes email notifications free for all stores by:
-- 1. Enabling has_email_notifications for all existing stores
-- 2. Changing the column default to true for new stores
-- 3. Removing email_notifications from the auth hook JWT claims

-- ============================================================
-- Section 1: Data migration — enable for all existing stores (GATE-03)
-- ============================================================
-- All existing stores that have not yet been enabled get email notifications now.
UPDATE public.store_plans SET has_email_notifications = true WHERE has_email_notifications = false;

-- ============================================================
-- Section 2: Column default change (GATE-04)
-- ============================================================
-- New stores provisioned via provision_store get email notifications enabled by default.
ALTER TABLE public.store_plans ALTER COLUMN has_email_notifications SET DEFAULT true;

-- ============================================================
-- Section 3: Auth hook rewrite — remove email_notifications JWT claim (GATE-02)
-- ============================================================
-- Rewrites the function from 024_service_product_type.sql with these changes ONLY:
--   - Removed: v_has_email_notifications BOOLEAN := false
--   - Removed: sp.has_email_notifications from SELECT
--   - Removed: v_has_email_notifications from INTO
--   - Removed: jsonb_set for app_metadata,email_notifications
-- All other variables, claims, and logic are preserved unchanged.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  claims JSONB;
  user_store_id UUID;
  user_role TEXT;
  v_is_super_admin BOOLEAN := false;
  v_has_xero BOOLEAN := false;
  v_has_custom_domain BOOLEAN := false;
  v_has_inventory BOOLEAN := false;
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
  --    NOTE: email_notifications is now free (always enabled at DB level).
  --    It is no longer injected as a JWT claim — no gate check needed.
  IF user_store_id IS NOT NULL THEN
    SELECT sp.has_xero, sp.has_custom_domain, sp.has_inventory
    INTO v_has_xero, v_has_custom_domain, v_has_inventory
    FROM public.store_plans sp
    WHERE sp.store_id = user_store_id;

    -- Ensure app_metadata exists before setting feature flags
    IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;

    claims := jsonb_set(claims, '{app_metadata,xero}', to_jsonb(COALESCE(v_has_xero, false)));
    claims := jsonb_set(claims, '{app_metadata,custom_domain}', to_jsonb(COALESCE(v_has_custom_domain, false)));
    claims := jsonb_set(claims, '{app_metadata,inventory}', to_jsonb(COALESCE(v_has_inventory, false)));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
