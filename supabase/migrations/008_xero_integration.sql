-- Migration 008: Xero Integration
-- Creates xero_connections and xero_sync_log tables with Vault RPC functions
-- for secure token storage (D-07, XERO-06).

-- xero_connections: stores Xero tenant info and a Vault secret UUID (never plain tokens)
CREATE TABLE public.xero_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES public.stores(id),
  tenant_id TEXT NOT NULL,
  tenant_name TEXT,
  vault_secret_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'disconnected', 'token_expired')),
  xero_contact_id TEXT,
  account_code_cash TEXT,
  account_code_eftpos TEXT,
  account_code_online TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.xero_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON public.xero_connections
  FOR ALL
  USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

-- xero_sync_log: records every automated or manual sync attempt
CREATE TABLE public.xero_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  sync_date TEXT NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('auto', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  period_from TIMESTAMPTZ,
  period_to TIMESTAMPTZ,
  total_cents INTEGER,
  xero_invoice_id TEXT,
  xero_invoice_number TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.xero_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON public.xero_sync_log
  FOR ALL
  USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

CREATE INDEX idx_xero_sync_log_store_date ON public.xero_sync_log(store_id, sync_date);

-- Updated_at trigger for xero_connections
CREATE OR REPLACE FUNCTION update_xero_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER xero_connections_updated_at
  BEFORE UPDATE ON public.xero_connections
  FOR EACH ROW EXECUTE FUNCTION update_xero_connections_updated_at();

-- ============================================================
-- Vault RPC functions (SECURITY DEFINER, service_role only)
-- Tokens are NEVER stored in plain columns — only in Vault.
-- ============================================================

-- get_xero_tokens: reads the Vault secret and returns the token fields
CREATE OR REPLACE FUNCTION get_xero_tokens(p_store_id UUID)
RETURNS TABLE(access_token TEXT, refresh_token TEXT, expires_at TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret_id UUID;
  v_secret TEXT;
  v_payload JSONB;
BEGIN
  SELECT vault_secret_id INTO v_secret_id
  FROM public.xero_connections
  WHERE store_id = p_store_id AND status = 'connected';

  IF v_secret_id IS NULL THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = v_secret_id;

  IF v_secret IS NULL THEN
    RETURN;
  END IF;

  v_payload := v_secret::JSONB;
  RETURN QUERY SELECT
    v_payload->>'access_token',
    v_payload->>'refresh_token',
    v_payload->>'expires_at';
END;
$$;

REVOKE EXECUTE ON FUNCTION get_xero_tokens(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_xero_tokens(UUID) TO service_role;

-- upsert_xero_token: creates or updates a Vault secret and updates xero_connections
CREATE OR REPLACE FUNCTION upsert_xero_token(p_store_id UUID, p_token_json TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_secret_id UUID;
  v_new_secret_id UUID;
BEGIN
  -- Check if a connection already exists for this store
  SELECT vault_secret_id INTO v_existing_secret_id
  FROM public.xero_connections
  WHERE store_id = p_store_id;

  IF v_existing_secret_id IS NOT NULL THEN
    -- Update existing vault secret in place
    UPDATE vault.secrets
    SET secret = p_token_json
    WHERE id = v_existing_secret_id;

    -- Ensure connection status is 'connected'
    UPDATE public.xero_connections
    SET status = 'connected', updated_at = now()
    WHERE store_id = p_store_id;

    RETURN v_existing_secret_id;
  ELSE
    -- Create new vault secret
    v_new_secret_id := vault.create_secret(p_token_json, 'xero_token_' || p_store_id);

    -- Upsert the xero_connections row (vault_secret_id is required so INSERT is needed here,
    -- but tenant_id/tenant_name are set separately by the OAuth callback)
    -- This function is only called after the connection row exists (set by OAuth callback).
    UPDATE public.xero_connections
    SET vault_secret_id = v_new_secret_id, status = 'connected', updated_at = now()
    WHERE store_id = p_store_id;

    RETURN v_new_secret_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION upsert_xero_token(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_xero_token(UUID, TEXT) TO service_role;

-- delete_xero_tokens: deletes the Vault secret and marks the connection as disconnected
CREATE OR REPLACE FUNCTION delete_xero_tokens(p_store_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  SELECT vault_secret_id INTO v_secret_id
  FROM public.xero_connections
  WHERE store_id = p_store_id;

  IF v_secret_id IS NOT NULL THEN
    -- Delete the vault secret
    DELETE FROM vault.secrets WHERE id = v_secret_id;

    -- Mark as disconnected and clear vault reference
    UPDATE public.xero_connections
    SET
      status = 'disconnected',
      vault_secret_id = '00000000-0000-0000-0000-000000000000',
      updated_at = now()
    WHERE store_id = p_store_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_xero_tokens(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_xero_tokens(UUID) TO service_role;
