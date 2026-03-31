-- Migration: 003_auth_hook.sql
-- Custom access token hook that injects store_id and role into JWT app_metadata.
-- This hook must be registered in supabase/config.toml under [auth.hook.custom_access_token].
-- RLS policies (002_rls_policies.sql) rely on these JWT claims for tenant isolation.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  claims JSONB;
  user_store_id UUID;
  user_role TEXT;
BEGIN
  claims := event -> 'claims';

  -- Look up the store_id and role for the authenticated user
  SELECT s.store_id, s.role INTO user_store_id, user_role
  FROM public.staff s
  WHERE s.auth_user_id = (event ->> 'user_id')::UUID;

  -- Only inject claims if a matching staff record is found
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

-- Grant supabase_auth_admin permission to call the hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Prevent other roles from executing the hook directly
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Grant supabase_auth_admin SELECT on staff table so the hook can look up store_id
GRANT SELECT ON public.staff TO supabase_auth_admin;
