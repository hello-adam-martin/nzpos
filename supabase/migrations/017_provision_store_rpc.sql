-- Migration: 017_provision_store_rpc.sql
-- Atomic store provisioning RPC for merchant self-serve signup (Phase 13).
-- Per D-04: single transaction creates store + staff (owner role) + store_plans row.
-- SECURITY DEFINER: runs as DB owner — bypasses RLS since the signing user has no
-- store_id JWT claims yet at signup time (same pattern as complete_pos_sale in 005).

CREATE OR REPLACE FUNCTION provision_store(
  p_auth_user_id UUID,
  p_store_name TEXT,
  p_slug TEXT,
  p_owner_email TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  -- 1. Create the store row
  INSERT INTO public.stores (name, slug, owner_auth_id, is_active)
  VALUES (p_store_name, p_slug, p_auth_user_id, true)
  RETURNING id INTO v_store_id;

  -- 2. Create the owner staff row
  INSERT INTO public.staff (store_id, auth_user_id, name, role)
  VALUES (v_store_id, p_auth_user_id, p_owner_email, 'owner');

  -- 3. Create the store_plans row (all add-ons default false)
  INSERT INTO public.store_plans (store_id)
  VALUES (v_store_id);

  RETURN jsonb_build_object('store_id', v_store_id, 'slug', p_slug);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'SLUG_TAKEN:%', p_slug;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'PROVISION_FAILED:%', SQLERRM;
END;
$$;

-- Only service_role may call this function.
-- authenticated/anon/public must never call provision_store directly.
GRANT EXECUTE ON FUNCTION provision_store(UUID, TEXT, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION provision_store(UUID, TEXT, TEXT, TEXT) FROM authenticated, anon, public;
