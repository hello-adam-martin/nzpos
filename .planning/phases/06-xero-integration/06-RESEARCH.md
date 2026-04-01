# Phase 6: Xero Integration - Research

**Researched:** 2026-04-01
**Domain:** Xero OAuth 2.0 API, Supabase Vault, Vercel Cron Jobs, NZ GST accounting
**Confidence:** MEDIUM (Xero API details verified via web search + npm registry; some API specifics require runtime verification)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Daily sales represented as a single Xero sales invoice per day (not journal entries, not per-order invoices).
- **D-02:** Invoice line items broken down by payment method: Cash sales total, EFTPOS sales total, Online (Stripe) sales total. Each line includes GST amount using the existing per-line GST formula.
- **D-03:** Owner configures Xero account codes from admin settings (not hardcoded defaults). Settings page allows mapping to their chart of accounts.
- **D-04:** Refunds synced as Xero credit notes against the original invoice day. Proper accounting treatment for GST reports.
- **D-05:** Xero connect/disconnect lives on a new "Integrations" section in admin settings. Not on the dashboard.
- **D-06:** Xero disconnection or token expiry triggers a persistent banner alert across all admin pages. Dismissible only by reconnecting.
- **D-07:** Tokens stored in Supabase Vault per XERO-06 requirement (not plain DB columns).
- **D-08:** Automated daily sync via Vercel Cron Job hitting an API route at ~2am NZST. Syncs previous calendar day (midnight-to-midnight NZST).
- **D-09:** On failure: retry 3x with exponential backoff (1min, 5min, 15min). After 3 failures, mark as failed in sync log. Owner sees failure on next admin visit.
- **D-10:** Manual sync button syncs today's sales so far (midnight NZST to now). If synced again later the same day, updates the existing Xero invoice rather than creating a duplicate.
- **D-11:** "Day" boundary is calendar day in NZ timezone (Pacific/Auckland), not cash session based.
- **D-12:** Sync log displayed on the same Integrations settings page as the Xero connect button. No separate page.
- **D-13:** Each sync log entry shows: date synced, period covered, status (success/failed/pending), total amount, Xero invoice number, error message if failed.

### Claude's Discretion

- Xero OAuth 2.0 scope selection (accounting.transactions, accounting.settings, etc.) — choose minimum required scopes
- Token refresh implementation details (automatic refresh before expiry vs on-demand)
- Sync log table pagination and retention period
- Cron job error notification mechanism (within the banner alert pattern)
- Invoice reference number format for Xero

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| XERO-01 | Owner can connect Xero via OAuth 2.0 flow | xero-node XeroClient + authorization code flow; callback API route; token stored via Supabase Vault |
| XERO-02 | Daily automated sync pushes previous day's sales as a single Xero invoice with GST breakdown | Vercel Cron Job + xero-node accountingApi.createInvoices; NZST midnight boundary via date-fns-tz |
| XERO-03 | Xero sync log tracks every attempt (success/fail/invoice ID/error) | New xero_sync_log table; written by both cron and manual sync Server Actions |
| XERO-04 | Owner can trigger manual sync from admin dashboard | Server Action on Integrations page; upserts invoice if same day already synced |
| XERO-05 | Token refresh handled automatically; admin notified if Xero disconnects | Pre-call refresh via xero.refreshToken(); error caught → xero_connections.status set to 'disconnected' → banner reads status |
| XERO-06 | Tokens stored in Supabase Vault (not plain DB columns) | vault.create_secret / vault.decrypted_secrets via service role RPC; xero_connections stores only secret_ids |
</phase_requirements>

---

## Summary

Phase 6 adds Xero accounting integration so the owner's books are updated automatically each night without manual data entry. The integration has three distinct sub-systems: (1) OAuth 2.0 connect/disconnect flow with token lifecycle management, (2) daily automated sync via Vercel Cron that builds a Xero ACCREC invoice aggregating sales by payment method with correct NZ GST, and (3) an Integrations admin page showing connection status, account code configuration, manual sync trigger, and sync log.

The primary technical challenges are: correct NZ timezone handling for "day" boundaries (Vercel runs in UTC; New Zealand is UTC+12/UTC+13 depending on DST), Xero rotating refresh tokens requiring atomic read-refresh-write to avoid token invalidation race conditions, and Supabase Vault access which requires the service role client and custom RPC functions rather than direct table access from application code.

The xero-node SDK (v14.0.0, published 2026-03-05) is the standard Node.js client for Xero APIs. Note: the `/Employees` endpoint within the SDK is deprecated April 28, 2026 — this does not affect accounting invoice operations which are what this phase requires. The Vercel Hobby plan permits exactly 2 cron jobs running at most once per day, which fits this phase's single overnight sync exactly.

**Primary recommendation:** Use xero-node v14 for all Xero API calls. Store tokens exclusively via Supabase Vault (service role RPC pattern). Use date-fns-tz for NZST boundary calculations. Implement token refresh as a pre-call utility function that reads vault, refreshes if within 5 minutes of expiry, and writes back atomically.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| xero-node | 14.0.0 | Xero API client (OAuth, invoices, credit notes) | Official Xero SDK for Node.js. Handles token management, typed API models, multi-tenancy. |
| date-fns-tz | 3.2.0 (latest) | NZST timezone-aware date boundaries | Required for correct midnight-to-midnight NZ day calculation on UTC Vercel servers |
| @supabase/supabase-js | ^2.x (already installed) | Vault RPC + sync log DB writes | Already in project; service role client accesses vault |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.x (already installed) | Date arithmetic, formatting | Already installed; combine with date-fns-tz for NZ boundary calculation |
| zod | ^4.x (already installed) | Server Action input validation | Validate sync trigger inputs, Xero settings form |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| xero-node | Raw Xero REST API via fetch | xero-node provides TypeScript types, token refresh helpers, multi-tenant tenant ID handling. Raw fetch is viable but adds hand-rolled token management. |
| Vercel Cron | External cron service (cron-job.org) | Vercel Cron is zero-config for Next.js deployments. External cron adds vendor and config overhead. Hobby plan 1/day limit is sufficient. |
| date-fns-tz | Luxon, Temporal API | date-fns-tz integrates directly with the existing date-fns installation. Temporal API not yet fully available in Node 20. |

**Installation:**

```bash
npm install xero-node date-fns-tz
```

**Version verification (confirmed 2026-04-01):**
- xero-node: `14.0.0` (npm registry, published 2026-03-05)
- date-fns-tz: `3.2.0` (npm registry)

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── xero/
│   │   ├── client.ts        # XeroClient factory + token refresh utility
│   │   ├── vault.ts         # Vault read/write helpers (service role)
│   │   └── buildInvoice.ts  # Assemble ACCREC invoice from daily sales data
├── app/
│   ├── api/
│   │   ├── xero/
│   │   │   ├── connect/route.ts    # OAuth initiation (GET → Xero auth URL)
│   │   │   └── callback/route.ts   # OAuth callback handler (GET → exchanges code)
│   │   └── cron/
│   │       └── xero-sync/route.ts  # Vercel Cron target (GET, CRON_SECRET auth)
│   └── admin/
│       └── integrations/
│           └── page.tsx     # Xero connect status + account codes + sync log
├── actions/
│   └── xero/
│       ├── triggerManualSync.ts    # Server Action: manual sync
│       ├── saveXeroSettings.ts     # Server Action: save account code config
│       └── disconnectXero.ts      # Server Action: revoke + clear tokens
└── components/
    └── admin/
        └── integrations/
            ├── XeroConnectButton.tsx
            ├── XeroAccountCodeForm.tsx
            ├── XeroSyncLog.tsx
            └── XeroDisconnectBanner.tsx   # Rendered in admin layout
supabase/
└── migrations/
    └── 008_xero_integration.sql   # xero_connections + xero_sync_log + vault RPC
vercel.json                         # Cron job definition
```

### Pattern 1: Supabase Vault for Token Storage

Tokens are never stored in plain columns. The `xero_connections` table stores only the Vault secret UUID. Reading/writing tokens uses a `SECURITY DEFINER` RPC function accessible only to the service role.

```sql
-- Migration: RPC to read/write Xero tokens via Vault
CREATE OR REPLACE FUNCTION get_xero_tokens(p_store_id UUID)
RETURNS TABLE(access_token TEXT, refresh_token TEXT, expires_at TIMESTAMPTZ)
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

  v_payload := v_secret::JSONB;
  RETURN QUERY SELECT
    v_payload->>'access_token',
    v_payload->>'refresh_token',
    (v_payload->>'expires_at')::TIMESTAMPTZ;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_xero_tokens FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_xero_tokens TO service_role;
```

Application usage:
```typescript
// src/lib/xero/vault.ts
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function getXeroTokens(storeId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('get_xero_tokens', { p_store_id: storeId })
  if (error || !data?.length) return null
  return data[0] // { access_token, refresh_token, expires_at }
}
```

### Pattern 2: Pre-Call Token Refresh

Access tokens expire after 30 minutes. Xero uses rotating refresh tokens — each refresh returns a new refresh token and the old one expires. A grace period of 30 minutes exists for retrying a failed refresh with the same token.

```typescript
// src/lib/xero/client.ts
import { XeroClient } from 'xero-node'
import { getXeroTokens, saveXeroTokens } from './vault'

export async function getAuthenticatedXeroClient(storeId: string): Promise<XeroClient | null> {
  const tokens = await getXeroTokens(storeId)
  if (!tokens) return null

  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.settings', 'offline_access'],
  })

  // Load existing token set
  await xero.setTokenSet({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at).getTime() / 1000,
  })

  // Refresh if within 5 minutes of expiry
  const expiresAt = new Date(tokens.expires_at).getTime()
  const fiveMinutes = 5 * 60 * 1000
  if (Date.now() + fiveMinutes >= expiresAt) {
    const refreshed = await xero.refreshToken()
    await saveXeroTokens(storeId, refreshed)
  }

  await xero.updateTenants()
  return xero
}
```

### Pattern 3: NZ Timezone Day Boundaries

Vercel serverless functions run in UTC. "Previous calendar day in NZ timezone" must be computed explicitly.

```typescript
// src/lib/xero/buildInvoice.ts
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'

const NZ_TZ = 'Pacific/Auckland'

export function getNZDayBoundaries(targetDate?: Date): { from: Date; to: Date; label: string } {
  const now = targetDate ?? new Date()
  const nzNow = toZonedTime(now, NZ_TZ)

  // Previous calendar day in NZ time
  const nzYesterday = new Date(nzNow)
  nzYesterday.setDate(nzNow.getDate() - 1)
  nzYesterday.setHours(0, 0, 0, 0)

  const nzYesterdayEnd = new Date(nzYesterday)
  nzYesterdayEnd.setHours(23, 59, 59, 999)

  return {
    from: fromZonedTime(nzYesterday, NZ_TZ),   // UTC equivalent of NZ midnight
    to: fromZonedTime(nzYesterdayEnd, NZ_TZ),  // UTC equivalent of NZ 23:59:59
    label: format(nzYesterday, 'yyyy-MM-dd', { timeZone: NZ_TZ }),
  }
}
```

### Pattern 4: Vercel Cron Configuration

Vercel Cron runs once per day maximum on the Hobby plan. The cron fires an HTTP GET to the specified path. Secure with `CRON_SECRET` environment variable — Vercel automatically sends it as `Authorization: Bearer <CRON_SECRET>`.

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/xero-sync",
      "schedule": "0 13 * * *"
    }
  ]
}
```

`0 13 * * *` = 1:00 PM UTC = ~2:00 AM NZST (UTC+13 in summer). Adjust to `0 14 * * *` for NZST winter (UTC+12). Since NZ observes DST, this is approximate — the cron runs within the configured hour, so ~1:00–2:00 AM NZST is always before business opening. The Hobby plan cron may fire up to 59 minutes after the scheduled time.

```typescript
// src/app/api/cron/xero-sync/route.ts
export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... sync logic
}
```

### Pattern 5: Xero Invoice Structure (NZ GST)

ACCREC invoice with line items per payment method. Each line uses the GST-inclusive amount and specifies `TaxType: 'OUTPUT2'` (NZ GST on income). A Contact is required — create a generic "NZPOS Daily Sales" contact on first use or during setup.

```typescript
// Invoice structure (xero-node types)
import { Invoice, LineItem, Contact } from 'xero-node'

const invoice: Invoice = {
  type: Invoice.TypeEnum.ACCREC,
  contact: { contactID: xeroContactId }, // pre-created "NZPOS Daily Sales" contact
  date: '2026-03-31',                     // YYYY-MM-DD, the NZ calendar day
  dueDate: '2026-03-31',
  invoiceNumber: `NZPOS-2026-03-31`,      // Format: NZPOS-YYYY-MM-DD (unique per day)
  reference: 'Daily sales sync',
  status: Invoice.StatusEnum.AUTHORISED,
  lineAmountTypes: LineAmountTypesEnum.Inclusive,  // amounts include GST
  lineItems: [
    {
      description: 'Cash Sales — 31 Mar 2026',
      quantity: 1,
      unitAmount: cashTotalDollars,        // GST-inclusive, in dollars (NOT cents)
      accountCode: settings.cashAccountCode,
      taxType: 'OUTPUT2',                 // NZ GST on income
    },
    {
      description: 'EFTPOS Sales — 31 Mar 2026',
      quantity: 1,
      unitAmount: eftposTotalDollars,
      accountCode: settings.eftposAccountCode,
      taxType: 'OUTPUT2',
    },
    {
      description: 'Online (Stripe) Sales — 31 Mar 2026',
      quantity: 1,
      unitAmount: onlineTotalDollars,
      accountCode: settings.onlineAccountCode,
      taxType: 'OUTPUT2',
    },
  ],
}
```

**Critical:** Xero Invoice API amounts are in dollars (not cents). Divide all `_cents` values by 100 before sending. Xero handles its own GST calculation when `TaxType: 'OUTPUT2'` and `LineAmountTypes: 'INCLUSIVE'` are set — the NZ GST breakdown will appear correctly in Xero reports without needing to pass gst_cents separately.

### Pattern 6: Upsert Invoice for Same-Day Manual Sync

D-10 requires that re-syncing today updates the existing invoice rather than creating a duplicate. Implementation: store the Xero InvoiceID in xero_sync_log when first created; on subsequent sync for the same date, PUT to that InvoiceID.

```typescript
// Check if invoice already exists for this date
const existingLog = await supabase
  .from('xero_sync_log')
  .select('xero_invoice_id')
  .eq('store_id', storeId)
  .eq('sync_date', dateLabel)
  .eq('status', 'success')
  .maybeSingle()

if (existingLog?.data?.xero_invoice_id) {
  // Update existing invoice
  invoice.invoiceID = existingLog.data.xero_invoice_id
  await xero.accountingApi.updateInvoice(tenantId, invoice.invoiceID, { invoices: [invoice] })
} else {
  // Create new invoice
  const result = await xero.accountingApi.createInvoices(tenantId, { invoices: [invoice] })
  // Store result.body.invoices[0].invoiceID in sync log
}
```

### Pattern 7: Disconnection Banner in Admin Layout

D-06 requires a persistent banner across all admin pages when Xero is disconnected/expired. The admin layout (`src/app/admin/layout.tsx`) is a Server Component — check `xero_connections.status` at render time.

```typescript
// admin/layout.tsx — add Xero status check
const { data: xeroConn } = await supabase
  .from('xero_connections')
  .select('status')
  .eq('store_id', storeId)
  .maybeSingle()

const showXeroBanner = xeroConn?.status === 'disconnected' || xeroConn?.status === 'token_expired'
```

Render `<XeroDisconnectBanner />` only when `showXeroBanner` is true. Banner contains a link to `/admin/integrations`. Not dismissible from banner — dismisses only when status returns to 'connected'.

### Anti-Patterns to Avoid

- **Storing tokens in plain DB columns:** Any row containing `access_token TEXT` or `refresh_token TEXT` directly violates D-07 and XERO-06. Use Vault exclusively.
- **Ignoring rotating refresh tokens:** After a successful refresh, the old refresh token is invalidated. Always write the new token set back to Vault immediately. If refresh fails due to race condition, catch the error and mark connection as 'disconnected' rather than retrying with stale token.
- **Not storing InvoiceID after create:** Required for the upsert pattern (D-10). Write InvoiceID to sync log immediately after Xero responds.
- **Calculating GST separately for Xero lines:** Xero calculates GST from line amounts when `TaxType: 'OUTPUT2'` and `LineAmountTypes: 'INCLUSIVE'` are set. Passing an explicit `taxAmount` alongside these causes validation errors.
- **Using server-side Supabase client for Vault:** Vault RPC requires service role key (`createSupabaseAdminClient`), not the user session client.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token refresh | Custom HTTP POST to Xero token endpoint | `xero.refreshToken()` from xero-node | Handles token set serialization, rotating token storage, error classification |
| OAuth state parameter | Custom PKCE/state generation | `xero.buildConsentUrl()` | Generates state, nonce, PKCE automatically; matches expected callback format |
| Xero API typed models | TypeScript interfaces for Invoice/Contact | `Invoice`, `LineItem` from `xero-node` types | SDK types match Xero API exactly; avoid type drift |
| NZ timezone arithmetic | Manual UTC offset (±12/13) | `date-fns-tz` with `'Pacific/Auckland'` | DST transitions make manual offset wrong ~2 months/year |
| Vault encryption | Direct use of pgsodium functions | `vault.create_secret()` / `vault.decrypted_secrets` | pgsodium is being deprecated; Vault API is stable and abstracts key management |
| Cron security | IP allowlist or custom HMAC | `CRON_SECRET` env var + Bearer header check | Vercel automatically sends CRON_SECRET; no additional infrastructure needed |

**Key insight:** Xero token management has multiple sharp edges (rotation, race conditions, 30-minute expiry). xero-node's token helpers exist precisely because hand-rolling this is fragile.

---

## Common Pitfalls

### Pitfall 1: UTC Cron vs NZST Day Boundary

**What goes wrong:** Cron runs at a UTC time that maps to the wrong NZ calendar day. `0 13 * * *` UTC = 1 AM NZST summer, but = 1 AM NZST+1 winter — always before business opening, so this is fine. The risk is in the day boundary calculation: if the server computes "yesterday" in UTC, days that cross the International Date Line produce wrong results.

**Why it happens:** NZ is UTC+12 (winter) or UTC+13 (summer). "Yesterday in NZ" starting at 13:00 UTC means the server date is already the next calendar day in UTC.

**How to avoid:** Always convert to `'Pacific/Auckland'` timezone before computing day boundaries. Use `toZonedTime(new Date(), 'Pacific/Auckland')` as the anchor, not `new Date()`.

**Warning signs:** Sync log shows dates one day off; empty invoices (zero sales) because query window misses actual transactions.

### Pitfall 2: Xero Rotating Refresh Token Race Condition

**What goes wrong:** Two concurrent requests both read the same refresh token, both try to refresh. The second refresh fails because the token was already rotated by the first request. The connection appears broken.

**Why it happens:** Manual sync triggered by owner at same time cron runs; or retry logic fires before the first attempt completes.

**How to avoid:** For v1 with a single-store, single-user scenario, this risk is very low. Mitigation: catch Xero refresh errors specifically (`OAUTHException` with `token_revoked` or similar), mark connection as 'disconnected', and prompt reconnect rather than retrying. Do NOT silently retry with the same token.

**Warning signs:** Connection shows 'disconnected' immediately after cron runs; logs show token refresh errors.

### Pitfall 3: Xero TaxType / AccountCode Mismatch

**What goes wrong:** Invoice fails validation with "The TaxType code 'OUTPUT2' cannot be used with account code [X]." Some Xero account types (e.g. bank accounts, liability accounts) only accept certain tax types.

**Why it happens:** Owner configures the wrong account code for a payment method line. For example, mapping the cash line to the bank clearing account instead of an income account.

**How to avoid:** Document in the account code settings UI that the owner should use income account codes (typically 200-series in Xero NZ default chart of accounts). Catch Xero API `ValidationException` and write the full error message to the sync log `error_message` field so the owner can diagnose.

**Warning signs:** Xero API returns 400 with ValidationException; error message contains "TaxType code".

### Pitfall 4: Vercel Hobby Cron Timing Imprecision

**What goes wrong:** Cron fires anywhere within the scheduled hour. A `0 13 * * *` schedule may fire at 13:47 UTC = 2:47 AM NZST, which is still fine for overnight sync. However, if the sync window is computed as "from 24 hours ago to now" rather than "previous NZ calendar day", boundary drift accumulates.

**Why it happens:** Vercel distributes cron load across the hour on Hobby plans.

**How to avoid:** Always compute sync window as NZ calendar day (00:00:00–23:59:59 NZST) based on the NZ date when the cron runs — not a rolling 24-hour window.

**Warning signs:** Sync log shows overlapping or gapped periods over multiple days.

### Pitfall 5: Xero Contact Required for Invoice

**What goes wrong:** Invoice creation fails with "Contact is required" because the xero_connections record doesn't store a Xero Contact ID.

**Why it happens:** Xero ACCREC invoices require a Contact. There is no anonymous/generic invoice option.

**How to avoid:** During the OAuth callback (after first connect), create or find a Xero Contact named "NZPOS Daily Sales" and store the ContactID in the `xero_connections` table (plain column — not sensitive). This is a one-time setup, not a secret.

**Warning signs:** First sync after OAuth connect fails with Xero validation error about contact.

### Pitfall 6: Supabase Vault Not Available in anon/user Role

**What goes wrong:** `vault.decrypted_secrets` returns empty or permission denied when called from a non-service-role client.

**Why it happens:** Vault restricts access to `service_role` by design. The standard `createSupabaseServerClient()` uses the anon key and honours RLS — it cannot read vault.

**How to avoid:** All vault operations must use `createSupabaseAdminClient()` (service role key). Never use the session client for token read/write. If calling from a Server Action that already has a session client, instantiate a separate admin client just for vault operations.

---

## Code Examples

Verified patterns from official sources and SDK analysis:

### OAuth Initiation Route

```typescript
// src/app/api/xero/connect/route.ts
import { XeroClient } from 'xero-node'

export async function GET() {
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.settings', 'offline_access'],
  })
  const consentUrl = await xero.buildConsentUrl()
  return Response.redirect(consentUrl)
}
```

### OAuth Callback Route

```typescript
// src/app/api/xero/callback/route.ts
export async function GET(req: Request) {
  const url = new URL(req.url)
  const xero = new XeroClient({ /* same config */ })
  const tokenSet = await xero.apiCallback(url.toString())
  await xero.updateTenants()
  const tenantId = xero.tenants[0].tenantId

  // Store token in Vault, tenantId in xero_connections
  const supabase = createSupabaseAdminClient()
  const tokenJson = JSON.stringify({
    access_token: tokenSet.access_token,
    refresh_token: tokenSet.refresh_token,
    expires_at: new Date(tokenSet.expires_at! * 1000).toISOString(),
  })
  const { data: secretId } = await supabase.rpc('upsert_xero_token', {
    p_store_id: storeId,
    p_token_json: tokenJson,
  })
  // upsert xero_connections row with tenant_id, status='connected', vault_secret_id=secretId
}
```

### Daily Sales Aggregation Query

```typescript
// Query orders for a date range, grouped by payment method
const { data: orders } = await supabase
  .from('orders')
  .select('total_cents, payment_method, channel, status')
  .eq('store_id', storeId)
  .in('status', ['completed', 'collected']) // exclude refunded, pending, expired
  .gte('created_at', fromISO)
  .lte('created_at', toISO)

const cashTotal = orders
  .filter(o => o.payment_method === 'cash')
  .reduce((sum, o) => sum + o.total_cents, 0)

const eftposTotal = orders
  .filter(o => o.payment_method === 'eftpos')
  .reduce((sum, o) => sum + o.total_cents, 0)

const onlineTotal = orders
  .filter(o => o.channel === 'online')
  .reduce((sum, o) => sum + o.total_cents, 0)
```

### Xero Scopes (Minimum Required)

Based on phase requirements:
- `openid profile email` — required for identity (connection display name)
- `accounting.transactions` — create/update invoices and credit notes
- `accounting.settings` — read chart of accounts (for account code validation)
- `offline_access` — obtain refresh token (REQUIRED for automated sync without user present)

Do NOT add `payroll.*`, `files.*`, or `assets.*` — principle of least privilege.

---

## Database Schema

New migration (008_xero_integration.sql) needs these tables:

```sql
-- Xero OAuth connections (one per store)
CREATE TABLE public.xero_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES public.stores(id),
  tenant_id TEXT NOT NULL,              -- Xero organisation tenant ID
  tenant_name TEXT,                     -- Display: "Acme Ltd"
  vault_secret_id UUID NOT NULL,        -- Points to vault.secrets row
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'disconnected', 'token_expired')),
  xero_contact_id TEXT,                 -- NZPOS Daily Sales contact ID
  -- Account code configuration (plain columns — not sensitive)
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

-- Sync log
CREATE TABLE public.xero_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  sync_date TEXT NOT NULL,              -- YYYY-MM-DD (NZ calendar day synced)
  sync_type TEXT NOT NULL CHECK (sync_type IN ('auto', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  period_from TIMESTAMPTZ,
  period_to TIMESTAMPTZ,
  total_cents INTEGER,
  xero_invoice_id TEXT,                 -- Stored after successful create for upsert
  xero_invoice_number TEXT,             -- Human-readable e.g. NZPOS-2026-03-31
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.xero_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON public.xero_sync_log
  FOR ALL
  USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| xero-node v4 (OAuth 1.0a) | xero-node v14 (OAuth 2.0) | ~2020 | All new integrations must use OAuth 2.0; OAuth 1.0a deprecated |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 | Already using correct package in this project |
| Tailwind config JS file | CSS-native @theme | 2024 (Tailwind v4) | Already using in this project |
| pgsodium direct API | `vault.create_secret()` / `vault.decrypted_secrets` | Ongoing (pgsodium pending deprecation) | Use Vault API, not raw pgsodium functions |

**Deprecated/outdated:**
- xero-node `/Employees` endpoint: deprecated, removed April 28, 2026 — does not affect this phase (accounting only)
- Xero OAuth 1.0a: fully deprecated, cannot create new integrations with it

---

## Open Questions

1. **Xero OUTPUT2 vs dynamic TaxType lookup**
   - What we know: `OUTPUT2` is the standard NZ GST on income tax type code. Some Xero accounts only accept specific tax types.
   - What's unclear: Whether hardcoding `OUTPUT2` is always correct or if some NZ Xero organisations have customised their tax rates with different codes.
   - Recommendation: Hardcode `OUTPUT2` for v1 (correct for standard NZ GST-registered businesses). Document in the settings page. If an owner gets a TaxType validation error, they can raise a support ticket.

2. **Xero Contact creation during OAuth callback**
   - What we know: ACCREC invoices require a Contact. A generic "NZPOS Daily Sales" contact should be created once.
   - What's unclear: Whether to create the contact during OAuth callback or during first sync. If the owner connects Xero but never syncs, a dangling contact exists.
   - Recommendation: Create the contact during OAuth callback (one-time, clearly associated with the connect action). If contact creation fails, still complete OAuth and flag in xero_connections that contact setup is needed.

3. **Retry implementation inside Vercel serverless function**
   - What we know: D-09 requires 3x retry with exponential backoff (1min, 5min, 15min). Vercel serverless functions time out after 10s (Hobby) or 60s (Pro).
   - What's unclear: Vercel Hobby functions have a 10-second timeout — retrying with 1-minute delays inside a single function invocation is impossible.
   - Recommendation: Implement retries as separate sync log entries with a `attempt_count` field. The cron fires once; if it fails, mark the sync log entry as 'failed' with attempt_count=1. A second cron is not available on Hobby plan. **Revise D-09 for Hobby plan constraints:** on failure, mark as failed immediately and show banner. The owner can manually re-trigger. This is a planning decision to surface to the user.

4. **date-fns-tz v3 API compatibility**
   - What we know: date-fns-tz v3 has API changes from v2 (`utcToZonedTime` renamed to `toZonedTime`).
   - What's unclear: Whether the installed date-fns v4 is compatible with date-fns-tz v3.
   - Recommendation: date-fns-tz v3 is designed for date-fns v3+; date-fns v4 should be compatible. Verify at install time.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| xero-node | Xero API client | ✗ (not installed) | — | None — must install |
| date-fns-tz | NZ timezone boundaries | ✗ (not installed) | — | None — must install |
| date-fns | Date arithmetic | ✓ | 4.1.0 | — |
| Vercel Cron | Overnight auto-sync | ✓ (deploy-time config) | N/A | External cron service |
| Supabase Vault | Token storage | ✓ (enabled by default on all Supabase projects) | Built-in | None — required by XERO-06 |
| XERO_CLIENT_ID / XERO_CLIENT_SECRET | OAuth | ✗ (env vars not set) | — | Owner must create Xero app at developer.xero.com |
| CRON_SECRET | Cron endpoint security | ✗ (not configured) | — | Generate random string, add to Vercel env |

**Missing dependencies with no fallback:**
- `xero-node` package — must be installed before any Xero code is written
- `date-fns-tz` package — must be installed for correct NZ timezone handling
- `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` / `XERO_REDIRECT_URI` — owner must register an app at developer.xero.com and provide credentials

**Missing dependencies with fallback:**
- `CRON_SECRET` — generate locally with `openssl rand -hex 32`; add to `.env.local` and Vercel project settings

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.mts` (exists) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| XERO-01 | OAuth callback exchanges code and stores token in Vault | manual-only | N/A — requires live Xero OAuth redirect | ❌ |
| XERO-02 | Daily sync aggregates sales by payment method and builds correct invoice | unit | `npm test -- src/lib/xero/buildInvoice.test.ts` | ❌ Wave 0 |
| XERO-02 | NZ timezone day boundary calculation | unit | `npm test -- src/lib/xero/buildInvoice.test.ts` | ❌ Wave 0 |
| XERO-03 | Sync log entry written on success and failure | integration/manual | N/A — requires live Xero + Supabase | ❌ |
| XERO-04 | Manual sync upserts invoice when same-day entry exists in log | unit | `npm test -- src/lib/xero/buildInvoice.test.ts` | ❌ Wave 0 |
| XERO-05 | Token refresh occurs before expiry | unit | `npm test -- src/lib/xero/client.test.ts` | ❌ Wave 0 |
| XERO-06 | Tokens never stored in plain DB columns | code review | N/A — architectural check only | — |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/xero/buildInvoice.test.ts` — covers XERO-02: day boundary calculation with NZ DST cases, invoice line item amounts in dollars, empty day (zero sales), correct GST-inclusive total
- [ ] `src/lib/xero/client.test.ts` — covers XERO-05: token refresh triggers when within 5 minutes of expiry, skips refresh when token is fresh
- [ ] Install packages: `npm install xero-node date-fns-tz`

---

## Project Constraints (from CLAUDE.md)

Directives the planner must verify compliance with:

- **Tech stack non-negotiable:** Next.js App Router + Supabase + Stripe + Tailwind CSS. All Xero integration code must use these, not introduce alternatives.
- **No floats for money:** All monetary values stored as integer cents. Convert to dollars (divide by 100) only when calling Xero API (which expects decimal dollars).
- **Zod validation on all Server Actions:** `saveXeroSettings`, `triggerManualSync`, `disconnectXero` must all use `z.safeParse()` before touching DB.
- **GST formula:** `Math.round(cents * 3 / 23)` per D-09 from Phase 1. Xero handles its own GST display — we do NOT need to pass calculated GST to Xero when using `TaxType: OUTPUT2` + `LineAmountTypes: INCLUSIVE`.
- **DESIGN.md compliance:** Integrations page must follow design system (navy sidebar, amber CTAs, warm stone white background, DM Sans body, Satoshi headings).
- **server-only guard:** Import `'server-only'` in `src/lib/xero/client.ts` and `src/lib/xero/vault.ts` — these files contain secrets and must never run client-side.
- **Admin client for Vault:** All vault operations use `createSupabaseAdminClient()` (service role key). Never use the user session client for vault.
- **No Prisma / raw pg:** Supabase JS client is the data layer. Vault access is via RPC functions, not raw SQL from application code.
- **RLS pattern:** New tables (`xero_connections`, `xero_sync_log`) must use the `auth.jwt() -> 'app_metadata' ->> 'store_id'` pattern, not user table joins.

---

## Sources

### Primary (HIGH confidence)

- npm registry `xero-node` — v14.0.0, published 2026-03-05 (verified via `npm view xero-node`)
- npm registry `date-fns-tz` — v3.2.0 (verified via `npm view date-fns-tz`)
- [Supabase Vault docs](https://supabase.com/docs/guides/database/vault) — vault.create_secret, vault.decrypted_secrets, service role pattern
- [Xero OAuth 2.0 overview](https://developer.xero.com/documentation/guides/oauth2/overview/) — authorization flow, scopes
- [Xero Token Types](https://developer.xero.com/documentation/guides/oauth2/token-types) — 30min access token expiry, rotating refresh tokens, 60-day unused expiry
- [Vercel Cron Jobs docs](https://vercel.com/docs/cron-jobs) — Hobby plan: 2 jobs max, once per day, CRON_SECRET pattern
- Existing project code: `src/lib/gst.ts`, `src/lib/supabase/admin.ts`, `src/app/admin/layout.tsx`, `src/components/admin/AdminSidebar.tsx`

### Secondary (MEDIUM confidence)

- [Xero Scopes](https://developer.xero.com/documentation/guides/oauth2/scopes/) — `accounting.transactions`, `accounting.settings`, `offline_access` confirmed via web search
- [Xero Invoices API](https://developer.xero.com/documentation/api/accounting/invoices) — ACCREC type, Contact required, InvoiceNumber field, update via PUT
- [Tax in Xero API](https://developer.xero.com/documentation/api-guides/tax-in-xero) — OUTPUT2 for NZ GST on income, LineAmountTypes INCLUSIVE
- [Vercel Cron Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Hobby = once/day, 2 jobs, fires within the hour

### Tertiary (LOW confidence — flag for validation)

- xero-node deprecation: "migrate before April 28, 2026" mentioned in multiple web search results but applies to the Employees endpoint, NOT accounting endpoints — verify at developer.xero.com before assuming SDK is deprecated
- OUTPUT2 tax type compatibility: reported errors in some community posts where OUTPUT2 is incompatible with non-income account codes — verify with owner's actual Xero chart of accounts

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — xero-node v14 confirmed on npm; date-fns-tz v3 confirmed
- Architecture: MEDIUM — patterns based on SDK docs + existing project conventions; specific Vault RPC syntax needs runtime validation
- Pitfalls: MEDIUM — Vercel timeout constraint for retries is HIGH confidence (documented limits); token rotation pitfall is MEDIUM (documented behaviour, low-risk for single-user v1)
- NZ GST / TaxType: MEDIUM — OUTPUT2 confirmed as NZ standard, but account code compatibility requires runtime validation against owner's actual Xero org

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (xero-node is active; Vercel pricing tier subject to change)
