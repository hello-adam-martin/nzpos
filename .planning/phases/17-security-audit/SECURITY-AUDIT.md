# NZPOS Security Audit Report
**Date:** 2026-04-04
**Auditor:** Systematic code inspection — Phase 17 Plan 01
**Scope:** All security-relevant files in the NZPOS codebase (HEAD only, per D-10)
**Methodology:** Per D-01 (blast-radius order), D-05 (no fixes during discovery)

---

## Summary

### Findings by Severity

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High     | 14 |
| Low      | 7  |
| **Total**| **23** |

### SEC Requirements Status

| Req | Description | Verdict |
|-----|-------------|---------|
| SEC-01 | RLS policies on all tables with correct store_id filtering | PASS WITH FINDINGS |
| SEC-02 | Storage bucket policies prevent cross-tenant file access | PASS WITH FINDINGS |
| SEC-03 | SECURITY DEFINER RPCs restrict EXECUTE grants | PASS WITH FINDINGS |
| SEC-04 | Owner auth verifies JWT server-side | PASS |
| SEC-05 | Staff PIN lockout and 8h session expiry | PASS WITH FINDINGS |
| SEC-06 | Super admin routes inaccessible to regular users | PASS |
| SEC-07 | Customer JWT cannot access owner/staff Server Actions | PASS WITH FINDINGS |
| SEC-08 | All Server Actions use Zod validation before DB access | PASS WITH FINDINGS |
| SEC-09 | No secrets in source, .env.example complete | FAIL |
| SEC-10 | service_role files guarded by server-only | PASS WITH FINDINGS |
| SEC-11 | Stripe webhook handlers verify signatures | PASS |
| SEC-12 | CSP headers configured for all routes | FAIL |
| SEC-13 | Rate limiting on signup and PIN login | PASS WITH FINDINGS |
| SEC-14 | Sensitive mutations logged in immutable audit trail | PASS WITH FINDINGS |

### Prioritized Remediation Order

1. **Critical (fix immediately):** F-1.3 (orders_public_read IDOR), F-7.1 (13 env vars missing from .env.example)
2. **High (fix in Plan 02/03):** F-2.1/F-2.2 (storage cross-tenant writes), F-3.1/F-3.2 (SECURITY DEFINER missing grants), F-6.1/F-6.2/F-6.3 (Server Actions lacking Zod), F-6.4/F-6.5 (raw DB error leak), F-7.2 (6 admin-client files missing server-only), F-8.1 (no CSP headers)
3. **Low (fix in Plan 04):** F-1.1, F-1.2, F-1.4 (RLS pattern gaps), F-5.1 (PIN IP rate limit), F-9.1 (non-admin mutations not logged), F-7.3 (deprecated env vars), F-3.3 (rate_limits table no RLS documentation)

---

## Domain 1: RLS Tenant Isolation
### Requirement: SEC-01

### Overview of RLS Coverage

Migration 015 (`015_rls_policy_rewrite.sql`) performs a clean-slate rewrite of all RLS policies, dropping all policies from 002, 006, 012, and 013, then replacing them with a unified pattern. All policies use the canonical path:
```sql
auth.jwt() -> 'app_metadata' ->> 'store_id'
```
Migration 016 confirmed: the JWT claims hook writes to `app_metadata`, not `user_metadata`. The priority order is super_admin → staff → customer, ensuring the correct role hierarchy.

**Tables covered by migration 015 (with super admin read):**
stores, staff, categories, products, orders, order_items, promo_codes, stripe_events, cash_sessions, customers, refunds, refund_items, store_plans

### Findings

- **F-1.1**: `xero_connections` and `xero_sync_log` not rewritten in migration 015
  - Severity: Low
  - File: `supabase/migrations/008_xero_integration.sql`
  - Evidence:
    ```sql
    CREATE POLICY "owner_only" ON public.xero_connections
      FOR ALL
      USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
    ```
    The policy uses the correct `app_metadata` JWT path but lacks: (a) role check (`IN ('owner', 'staff')`), meaning any JWT with a matching store_id — including a customer JWT — can read Xero tokens; (b) no super admin read policy, so super admins cannot query these tables.
  - Recommendation: Add role check (`AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner')`) and a separate super admin SELECT policy matching the 015 pattern.

- **F-1.2**: `super_admin_actions` only has a SELECT policy; no super admin INSERT policy (by design)
  - Severity: Low
  - File: `supabase/migrations/020_super_admin_panel.sql`
  - Evidence:
    ```sql
    -- No INSERT policy — writes via admin client (service role) only
    CREATE POLICY "super_admin_actions_read" ON public.super_admin_actions
      FOR SELECT USING (
        (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
      );
    ```
  - This is intentional design: immutable writes via service role. Document as confirmed-correct behavior.
  - Recommendation: No fix needed. Add a comment in the OPERATIONS runbook confirming this is intentional.

- **F-1.3**: `orders_public_read` policy allows any anonymous user to read any online order without a lookup_token
  - Severity: **Critical**
  - File: `supabase/migrations/015_rls_policy_rewrite.sql`, lines 121-122
  - Evidence:
    ```sql
    -- ORDERS: public read for online orders by channel (guest checkout confirmation)
    CREATE POLICY "orders_public_read" ON public.orders
      FOR SELECT USING (channel = 'online');
    ```
    Any anonymous user can enumerate all online orders (with customer emails, order totals, item details) by querying `orders` filtered by `channel = 'online'`. The `lookup_token` mechanism added in migration 009 is used in the application layer (`src/app/(store)/order/[id]/confirmation/page.tsx` filters by `.eq('lookup_token', token)`), but the RLS policy itself does not enforce the lookup_token check, making the DB layer wide open.
  - Recommendation: Change the policy to require `lookup_token IS NOT NULL` with a caller-supplied parameter, or scope to `lookup_token = current_setting('request.jwt.claims')::jsonb->>'lookup_token'`. Simplest fix: restrict policy to require token in the RLS predicate, or use a SECURITY DEFINER RPC that validates the token before returning the order.

- **F-1.4**: `refund_items` has SELECT and INSERT policies but no UPDATE or DELETE policies
  - Severity: Low
  - File: `supabase/migrations/015_rls_policy_rewrite.sql`
  - Evidence: Only `refund_items_staff_read` (SELECT) and `refund_items_staff_insert` (INSERT) policies exist. No UPDATE or DELETE policies.
  - Assessment: Intentional immutability — refund line items should never be modified or deleted once created. This is correct behavior.
  - Recommendation: Document as intentional immutability. Add a comment in the migration confirming no UPDATE/DELETE is by design.

- **F-1.5**: No RLS policies exist for `rate_limits` table
  - Severity: Low
  - File: `supabase/migrations/009_security_fixes.sql`
  - Evidence: `CREATE TABLE public.rate_limits ... -- Auto-cleanup old entries (no RLS needed — accessed via RPC only)`
  - Assessment: The comment says "no RLS needed — accessed via RPC only." The `check_rate_limit` RPC is SECURITY DEFINER so it bypasses RLS. This is acceptable design — the table contains no sensitive data and is only accessed via the controlled RPC.
  - Recommendation: Confirm RLS is intentionally disabled; add `ENABLE ROW LEVEL SECURITY` with a blocking default policy to prevent any accidental direct access.

### Verdict: PASS WITH FINDINGS
F-1.3 (Critical) requires immediate remediation. F-1.1, F-1.4, F-1.5 are Low.

---

## Domain 2: Storage Bucket Policies
### Requirement: SEC-02

### Overview

Two storage buckets exist:
1. `product-images` (migration 004_storage_bucket.sql) — public read
2. `store-logos` (migration 018_setup_wizard.sql) — public read

### Findings

- **F-2.1**: `product-images` bucket allows any authenticated user to upload/update/delete any object — no store_id path scoping in the RLS policy
  - Severity: **High**
  - File: `supabase/migrations/004_storage_bucket.sql`
  - Evidence:
    ```sql
    CREATE POLICY "Authenticated users can upload product images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'product-images');
    ```
    The upload path in the application does NOT include a `store_id` prefix: `filename = ${crypto.randomUUID()}.webp` (see `src/app/api/products/image/route.ts`). Any authenticated user (including a customer) can upload to the root of the bucket.
  - Recommendation: (a) Add store_id prefix to upload path: `filename = ${storeId}/${randomUUID()}.webp`; (b) Update storage policy to enforce path prefix: `WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.jwt() -> 'app_metadata' ->> 'store_id')`

- **F-2.2**: `store-logos` bucket allows any authenticated user to upload/update/delete any object — RLS policy is bucket-scoped only, not store-scoped
  - Severity: **High**
  - File: `supabase/migrations/018_setup_wizard.sql`
  - Evidence:
    ```sql
    CREATE POLICY "Authenticated users can upload store logos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'store-logos');
    ```
    Application DOES use store_id in path: `filename = ${storeId}/${randomUUID()}.webp` (`src/app/api/store/logo/route.ts`). However, the RLS policy does not enforce this — a tenant from store A could overwrite store B's logo if they know the path.
  - Recommendation: Update storage policy to enforce store_id path prefix matching JWT claim.

- **F-2.3**: `product-images` Route Handler (`/api/products/image`) does not extract `store_id` from JWT claims — any authenticated user including customers can upload
  - Severity: **High**
  - File: `src/app/api/products/image/route.ts`
  - Evidence: The route checks `!user` but does NOT check `user.app_metadata?.store_id` or `role`. A customer JWT passes the auth check.
  - Recommendation: Add role check: require `user.app_metadata?.role` to be `owner` or `staff`, and extract `store_id` for path construction.

### Verdict: PASS WITH FINDINGS
F-2.1 and F-2.2 are High severity (cross-tenant write risk). F-2.3 is High (unauthenticated role elevation risk).

---

## Domain 3: SECURITY DEFINER RPCs
### Requirement: SEC-03

### SECURITY DEFINER functions found:

| Function | Migration | GRANT/REVOKE |
|----------|-----------|--------------|
| `complete_pos_sale` | 005 | None |
| `complete_online_sale` | 006 | None |
| `get_xero_tokens` | 008 | GRANT service_role; REVOKE PUBLIC |
| `upsert_xero_token` | 008 | GRANT service_role; REVOKE PUBLIC |
| `delete_xero_tokens` | 008 | GRANT service_role; REVOKE PUBLIC |
| `increment_promo_uses` | 009 | **None** |
| `restore_stock` | 009 | **None** |
| `check_rate_limit` | 009 | **None** |
| `provision_store` | 017 | GRANT service_role; REVOKE authenticated/anon/public |
| `custom_access_token_hook` | 016 | (called by Supabase auth system, not by application) |

### Findings

- **F-3.1**: `increment_promo_uses` and `restore_stock` have no GRANT/REVOKE — any authenticated or anonymous user can call these RPCs directly
  - Severity: **High**
  - File: `supabase/migrations/009_security_fixes.sql`
  - Evidence:
    ```sql
    CREATE OR REPLACE FUNCTION public.increment_promo_uses(p_promo_id UUID)
    RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
      UPDATE public.promo_codes SET current_uses = current_uses + 1 WHERE id = p_promo_id;
    $$;
    -- No GRANT/REVOKE follows
    ```
    Any authenticated user can call `supabase.rpc('increment_promo_uses', { p_promo_id: 'any-uuid' })` to increment any promo code's uses to max, effectively burning promo codes across all tenants.
  - Recommendation: Add `REVOKE EXECUTE ON FUNCTION increment_promo_uses(UUID) FROM PUBLIC; GRANT EXECUTE ON FUNCTION increment_promo_uses(UUID) TO service_role;`

- **F-3.2**: `check_rate_limit` and `complete_pos_sale` / `complete_online_sale` have no GRANT/REVOKE restrictions
  - Severity: **High**
  - File: `supabase/migrations/009_security_fixes.sql`, `005_pos_rpc.sql`, `006_online_store.sql`
  - Evidence: No GRANT or REVOKE statements appear after these function definitions.
  - Assessment for `complete_pos_sale`/`complete_online_sale`: These accept a `p_store_id` parameter and validate stock against it. While callable by any authenticated user, the `p_store_id` validation in the RPC body provides some containment (cannot affect other stores' stock). However, authenticated users could create ghost orders for any store. Should be restricted to service_role.
  - Assessment for `check_rate_limit`: No sensitive data but bypasses RLS — any user can manipulate the rate limit table indirectly.
  - Recommendation: Add REVOKE/GRANT blocks to restrict all three to service_role.

- **F-3.3**: `rate_limits` table has no RLS enabled; relies solely on RPC access pattern
  - Severity: Low
  - File: `supabase/migrations/009_security_fixes.sql`
  - Evidence: No `ENABLE ROW LEVEL SECURITY` on `rate_limits` table, but access is gated through the SECURITY DEFINER RPC.
  - Recommendation: Add RLS and a blocking default policy as defense in depth.

### Verdict: PASS WITH FINDINGS
F-3.1 is High (promo burning attack vector). F-3.2 is High (RPC exposure). F-3.3 is Low.

---

## Domain 4: Auth Flow Verification
### Requirements: SEC-04, SEC-05, SEC-06, SEC-07

### SEC-04: Owner Auth

**Owner middleware path** (`src/middleware.ts`, lines 90-155):
1. Calls `supabase.auth.getUser()` — this performs server-side JWT validation against Supabase (not just decode), confirming token authenticity
2. Checks `email_confirmed_at != null` — email verification gate for admin routes
3. Checks `role === 'owner'` from JWT `app_metadata`
4. Blocks `role === 'customer'` with silent redirect

**Session cookies:** Supabase SSR handles cookie management via `@supabase/ssr`. Cookies are set as HttpOnly by the Supabase middleware client.

**JWT claims source:** Migration 016 confirms `app_metadata` path (not `user_metadata`). Claims hook runs on token issue.

**Token refresh on missing role:** If `role` is missing from JWT (race condition on first login post-signup), the middleware calls `supabase.auth.refreshSession()` to pick up updated claims.

Verdict for SEC-04: **PASS** — `getUser()` is used (not just getSession/decode), email verification gate exists, role check is correct.

### SEC-05: Staff PIN Auth

**staffPin.ts analysis:**
- Lockout: 10 attempts tracked in DB (`pin_attempts`), locked for 5-minute window (`pin_locked_until`)
- JWT expiry: `setExpirationTime('8h')`
- Cookie: `httpOnly: true`, `secure` in production, `sameSite: 'lax'`, `maxAge: 8 * 60 * 60`
- Middleware validation: `jwtVerify(staffToken, staffSecret)` using jose library

### Findings

- **F-4.1**: Staff PIN lockout is per-account in the DB but there is no IP-level rate limiting on PIN attempts
  - Severity: Low (documented separately in Domain 9, SEC-13)
  - File: `src/actions/auth/staffPin.ts`
  - Evidence: No IP check before the DB lookup. An attacker with a valid `staffId` can attempt 10 PINs per lockout window from any IP.

Verdict for SEC-05: **PASS WITH FINDINGS** — DB-level lockout works correctly. No IP rate limiting (Low finding, cross-referenced as F-5.1).

### SEC-06: Super Admin Routes

**Middleware check** (`src/middleware.ts`, lines 22-39):
```typescript
const isSuperAdmin = user.app_metadata?.is_super_admin === true
if (!isSuperAdmin) {
  return NextResponse.redirect(new URL('/unauthorized', request.url))
}
```
Uses `getUser()` (server-validated). The flag `is_super_admin` is in `app_metadata` (set by JWT claims hook in migration 016, populated from `super_admins` table).

**Action-level checks** (sampled all 4 super-admin action files):
- `activateAddon.ts`: `user.app_metadata?.is_super_admin !== true` → return error
- `deactivateAddon.ts`: same pattern
- `suspendTenant.ts`: same pattern
- `unsuspendTenant.ts`: same pattern

All super-admin actions have double-layer protection: middleware blocks the route AND the action validates the JWT claim.

Verdict for SEC-06: **PASS** — Middleware check + action-level guard. Uses server-validated `getUser()`.

### SEC-07: Customer Isolation

**Middleware blocks:**
- `/pos` routes: checks `posUser?.app_metadata?.role === 'customer'` → redirect to `/`
- `/admin` routes: checks `role === 'customer'` → redirect to `/`

**Server Action customer bypass analysis:**
- `createCheckoutSession.ts`: Uses `process.env.STORE_ID` (v1 artifact) — no auth check. A customer JWT could call this.
- `validatePromoCode.ts`: No auth check — intentionally public (promo validation for guests).
- `completeSale.ts`: Uses `resolveStaffAuth()` — requires staff JWT, customer cannot pass.
- All super-admin actions: Check `is_super_admin === true` — customers cannot pass.
- Product/category actions: Use `supabase.auth.getUser()` and check `store_id` in `app_metadata` — customers with no store_id will fail at the `storeId` check.

Verdict for SEC-07: **PASS WITH FINDINGS** — Middleware correctly blocks customer roles. `createCheckoutSession.ts` accepts calls without auth (intentional for guest checkout but uses env.STORE_ID — this is a v1 artifact, see Domain 6). Customer JWTs cannot escalate to staff/owner operations.

---

## Domain 5: Webhook Integrity
### Requirement: SEC-11

### Order Webhook (`src/app/api/webhooks/stripe/route.ts`)

```typescript
// Raw body correctly used
const rawBody = await req.text()
// Signature header checked
if (!signature) {
  return new Response('Missing stripe-signature header', { status: 400 })
}
// Correct env var
event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
// Signature failure returns 400
} catch {
  return new Response('Webhook signature verification failed', { status: 400 })
}
```

**Assessment:** Correct — raw body, correct env var, 400 on failure.

### Billing Webhook (`src/app/api/webhooks/stripe/billing/route.ts`)

```typescript
const rawBody = await req.text()
// Signature header checked
if (!signature) {
  return new Response('Missing stripe-signature header', { status: 400 })
}
// Correct separate env var (per Phase 15 decision)
event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_BILLING_WEBHOOK_SECRET!)
// Signature failure returns 400
} catch {
  return new Response('Webhook signature verification failed', { status: 400 })
}
```

**Assessment:** Correct — separate secret (`STRIPE_BILLING_WEBHOOK_SECRET`) as required by the Phase 15 decision, raw body, 400 on failure.

**Note on `server-only`:** The order webhook (`route.ts`) imports `'server-only'` at the top. The billing webhook does NOT import `server-only`. Both are Route Handlers which Next.js runs server-side only — the `server-only` guard is redundant for route handlers. No risk here.

### Findings
None.

### Verdict: PASS
Both webhook handlers correctly implement Stripe signature verification with the appropriate secrets and return 400 on failure.

---

## Domain 6: Server Action Validation
### Requirement: SEC-08

### Complete Server Action Inventory

Total action files: 48

| File | Has Zod | Has server-only | Uses admin client | Leaks raw errors | Severity |
|------|---------|----------------|-------------------|-----------------|---------|
| auth/changePassword.ts | YES | NO | NO | NO | Low |
| auth/checkSlugAvailability.ts | NO (manual validateSlug) | NO | YES | NO | **High** |
| auth/customerSignin.ts | YES | NO | NO | NO | Low |
| auth/customerSignOut.ts | NO (no input) | NO | NO | NO | Low |
| auth/customerSignup.ts | YES | NO | YES | NO | Low |
| auth/ownerSignin.ts | YES | NO | NO | NO | Low |
| auth/ownerSignup.ts | YES | NO | YES | NO | Low |
| auth/provisionStore.ts | YES | NO | YES | NO | Low |
| auth/resendVerification.ts | YES | NO | NO | NO | Low |
| auth/resetPassword.ts | YES | NO | NO | NO | Low |
| auth/retryProvisioning.ts | YES | NO | YES | NO | Low |
| auth/signOut.ts | NO (no input) | NO | NO | NO | Low |
| auth/staffPin.ts | YES (StaffPinLoginSchema) | NO | YES | NO | Low |
| auth/updateEmail.ts | YES | NO | NO | NO | Low |
| auth/updateProfile.ts | YES | NO | NO | NO | Low |
| billing/createBillingPortalSession.ts | NO (no user input) | YES | YES | NO | Low |
| billing/createSubscriptionCheckoutSession.ts | YES | YES | YES | NO | Low |
| cash-sessions/closeCashSession.ts | YES | YES | YES | NO | Low |
| cash-sessions/openCashSession.ts | YES | YES | YES | NO | Low |
| categories/createCategory.ts | YES | NO | NO | NO | Low |
| categories/deleteCategory.ts | YES | NO | NO | NO | Low |
| categories/reorderCategories.ts | YES | NO | NO | NO | Low |
| categories/updateCategory.ts | YES | NO | NO | NO | Low |
| orders/completeSale.ts | YES (CreateOrderSchema) | YES | YES | NO | Low |
| orders/createCheckoutSession.ts | NO | YES | YES | NO | **High** |
| orders/processPartialRefund.ts | YES (PartialRefundSchema) | YES | YES | NO | Low |
| orders/processRefund.ts | YES (RefundSchema) | YES | YES | NO | Low |
| orders/sendPosReceipt.ts | YES | YES | YES | NO | Low |
| orders/updateOrderStatus.ts | YES | YES | YES | NO | Low |
| products/createProduct.ts | YES (CreateProductSchema) | NO | NO | **YES** | **High** |
| products/deactivateProduct.ts | YES (z.string().uuid()) | NO | NO | NO | Low |
| products/importProducts.ts | NO | NO | NO | NO | **High** |
| products/lookupBarcode.ts | YES | YES | YES | NO | Low |
| products/updateProduct.ts | YES (UpdateProductSchema) | NO | NO | **YES** | **High** |
| promos/createPromoCode.ts | YES | YES | NO | NO | Low |
| promos/validatePromoCode.ts | NO (interface typed) | YES | YES | NO | **High** |
| setup/dismissWizard.ts | NO (no input) | YES | NO | NO | Low |
| setup/saveLogoStep.ts | YES | YES | NO | NO | Low |
| setup/saveProductStep.ts | YES | YES | NO | NO | Low |
| setup/saveStoreNameStep.ts | YES | YES | NO | NO | Low |
| setup/updateBranding.ts | YES | YES | NO | NO | Low |
| super-admin/activateAddon.ts | YES | YES | YES | NO | Low |
| super-admin/deactivateAddon.ts | YES | YES | YES | NO | Low |
| super-admin/suspendTenant.ts | YES | YES | YES | NO | Low |
| super-admin/unsuspendTenant.ts | YES | YES | YES | NO | Low |
| xero/disconnectXero.ts | NO (no user input) | YES | YES | NO | Low |
| xero/saveXeroSettings.ts | YES (XeroAccountCodesSchema) | YES | YES | NO | Low |
| xero/triggerManualSync.ts | NO (no user input) | YES | NO | NO | Low |

### Specific Findings

- **F-6.1**: `createCheckoutSession.ts` accepts a typed TypeScript interface but has NO runtime Zod validation — malformed `items` array with non-UUID `productId` or negative `quantity` reaches the database
  - Severity: **High**
  - File: `src/actions/orders/createCheckoutSession.ts`
  - Evidence: Function signature is `CreateCheckoutSessionInput` type, but no `z.safeParse()` call exists. TypeScript types are stripped at runtime.
  - Recommendation: Add Zod schema for `CreateCheckoutSessionInput` and validate before any DB operations.

- **F-6.2**: `importProducts.ts` takes a typed array of import rows but performs NO Zod validation on individual rows — malformed CSV data (negative prices, non-integer values) reaches the DB
  - Severity: **High**
  - File: `src/actions/products/importProducts.ts`
  - Evidence: No `safeParse` call found in the file. The `ImportRow` interface is TypeScript-only.
  - Recommendation: Add per-row Zod validation before upsert to DB.

- **F-6.3**: `validatePromoCode.ts` accepts user-supplied `code` and `cartTotalCents` but has NO Zod validation — unconstrained string `code` reaches the DB query directly
  - Severity: **High**
  - File: `src/actions/promos/validatePromoCode.ts`
  - Evidence: Function accepts `ValidatePromoCodeInput` interface with no runtime validation.
  - Recommendation: Add Zod schema: `code: z.string().min(1).max(50).toUpperCase()`, `cartTotalCents: z.number().int().min(0)`.

- **F-6.4**: `createProduct.ts` leaks raw database error messages to the client on generic failures
  - Severity: **High**
  - File: `src/actions/products/createProduct.ts`
  - Evidence:
    ```typescript
    return { error: { _form: [dbError.message] } }
    ```
    `dbError.message` is a PostgreSQL error string that may contain schema details, constraint names, or internal table structure.
  - Recommendation: Replace with a generic message: `return { error: { _form: ['Failed to save product. Please try again.'] } }`. Log `dbError` server-side.

- **F-6.5**: `updateProduct.ts` leaks raw database error messages to the client
  - Severity: **High**
  - File: `src/actions/products/updateProduct.ts`
  - Evidence: Same pattern as F-6.4 — `return { error: { _form: [dbError.message] } }`
  - Recommendation: Same fix as F-6.4.

- **F-6.6**: `checkSlugAvailability.ts` uses a custom `validateSlug()` function instead of Zod — not technically a gap but inconsistent with the project convention
  - Severity: Low
  - File: `src/actions/auth/checkSlugAvailability.ts`
  - Evidence: Uses `import { validateSlug } from '@/lib/slugValidation'` — custom validation library, not Zod.
  - Recommendation: Wrap in Zod schema for consistency, or document that `validateSlug()` is the canonical slug validation function.

### Verdict: PASS WITH FINDINGS
F-6.1, F-6.2, F-6.3 are High (missing runtime validation). F-6.4, F-6.5 are High (data leak). F-6.6 is Low (consistency).

---

## Domain 7: Secrets & Environment Hygiene
### Requirements: SEC-09, SEC-10

### SEC-09: Environment Variable Completeness

**Variables referenced in source (`process.env.*`):**
```
CRON_SECRET
FOUNDER_EMAIL
NEXT_PUBLIC_BASE_URL
NEXT_PUBLIC_ROOT_DOMAIN
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NODE_ENV
RESEND_API_KEY
RESEND_FROM_ADDRESS
ROOT_DOMAIN
STAFF_JWT_SECRET
STORE_ID
STRIPE_BILLING_WEBHOOK_SECRET
STRIPE_PRICE_CUSTOM_DOMAIN
STRIPE_PRICE_EMAIL_NOTIFICATIONS
STRIPE_PRICE_XERO
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
XERO_CLIENT_ID
XERO_CLIENT_SECRET
XERO_REDIRECT_URI
```

**Variables in `.env.example`:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STORE_ID
NEXT_PUBLIC_STORE_ID   (not in source references)
NEXT_PUBLIC_BASE_URL
STAFF_JWT_SECRET
ROOT_DOMAIN
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  (not in source references)
STRIPE_WEBHOOK_SECRET
```

### Findings

- **F-7.1**: 13 environment variables used in source are missing from `.env.example`
  - Severity: **Critical** (deployment failure risk — production deployments will break silently)
  - File: `.env.example`
  - Evidence — Missing variables:
    - `STRIPE_BILLING_WEBHOOK_SECRET` — required for billing webhook
    - `RESEND_API_KEY` — required for email notifications
    - `RESEND_FROM_ADDRESS` — required for email notifications
    - `XERO_CLIENT_ID` — required for Xero OAuth
    - `XERO_CLIENT_SECRET` — required for Xero OAuth
    - `XERO_REDIRECT_URI` — required for Xero OAuth
    - `CRON_SECRET` — required for cron job authentication
    - `FOUNDER_EMAIL` — required for platform notifications
    - `NEXT_PUBLIC_ROOT_DOMAIN` — used in client-side code
    - `NEXT_PUBLIC_SITE_URL` — used in client-side code
    - `STRIPE_PRICE_XERO` — required for Stripe billing
    - `STRIPE_PRICE_EMAIL_NOTIFICATIONS` — required for Stripe billing
    - `STRIPE_PRICE_CUSTOM_DOMAIN` — required for Stripe billing
  - Recommendation: Add all 13 missing variables to `.env.example` with placeholder values and comments.

- **F-7.2**: 6 action files that use `createSupabaseAdminClient()` (service_role key) are missing the `server-only` guard
  - Severity: **High** (service_role key could be bundled into client-side JavaScript)
  - Files (Group B1 — direct admin client usage):
    - `src/actions/auth/checkSlugAvailability.ts`
    - `src/actions/auth/ownerSignup.ts`
    - `src/actions/auth/provisionStore.ts`
    - `src/actions/auth/staffPin.ts`
    - `src/actions/auth/retryProvisioning.ts`
    - `src/actions/auth/customerSignup.ts`
  - Evidence: These files call `createSupabaseAdminClient()` (which uses `SUPABASE_SERVICE_ROLE_KEY`) but do NOT import `'server-only'`. If any of these were accidentally imported from a Client Component, the service role key would be exposed.
  - Note: The `createSupabaseAdminClient` function itself IS guarded by `server-only` (in `src/lib/supabase/admin.ts`), which provides a transitive guard at import time. However, the explicit guard is missing from the action files themselves, which is the documented project convention.
  - Recommendation: Add `import 'server-only'` to all 6 files.

- **F-7.3**: `.env.example` contains `NEXT_PUBLIC_STORE_ID` which is not referenced in the current source (v1 artifact)
  - Severity: Low
  - File: `.env.example`
  - Evidence: `grep "NEXT_PUBLIC_STORE_ID" src/` returns no results. `STORE_ID` is still used (for `createCheckoutSession.ts`) but `NEXT_PUBLIC_STORE_ID` is unused.
  - Recommendation: Remove `NEXT_PUBLIC_STORE_ID` from `.env.example` if no longer needed. Note: `STORE_ID` (non-public) is still referenced and should remain.

- **F-7.4**: No hardcoded secrets found in source code
  - Severity: N/A (clean)
  - Evidence: Grep for `sk_live`, `pk_live`, `whsec_live`, and high-entropy string patterns returned no results.

**17 action files missing `server-only` but do NOT use admin client (Group B2 — Low risk):**
These files use only `createSupabaseServerClient()` which imports from `@/lib/supabase/server.ts`. The `server.ts` file itself has `server-only` guard. The transitive guard provides protection. Low severity.

Files: auth/changePassword.ts, auth/customerSignin.ts, auth/customerSignOut.ts, auth/ownerSignin.ts, auth/resetPassword.ts, auth/resendVerification.ts, auth/signOut.ts, auth/updateEmail.ts, auth/updateProfile.ts, categories/createCategory.ts, categories/deleteCategory.ts, categories/reorderCategories.ts, categories/updateCategory.ts, products/createProduct.ts, products/deactivateProduct.ts, products/importProducts.ts, products/updateProduct.ts

### Verdict for SEC-09: FAIL
F-7.1 is Critical (13 missing env vars). F-7.2 is High (6 admin-client files without server-only). F-7.3 is Low.

### Verdict for SEC-10: PASS WITH FINDINGS
`admin.ts` itself has `server-only`. 6 action files calling the admin client lack the explicit guard (transitive guard exists). High finding documented as F-7.2.

---

## Domain 8: Security Headers
### Requirement: SEC-12

### Findings

- **F-8.1**: No Content Security Policy headers exist anywhere in the application
  - Severity: **High**
  - File: `src/middleware.ts`, `next.config.ts`
  - Evidence:
    - `src/middleware.ts` contains no `response.headers.set('Content-Security-Policy', ...)` or `'Content-Security-Policy-Report-Only'` calls
    - `next.config.ts` contains no `headers()` configuration
    - The middleware only sets `x-store-id` and `x-store-slug` tenant headers
  - Impact: No protection against XSS attacks. An XSS vulnerability in any page would allow attacker scripts to run with full page privileges.
  - Recommendation: Add CSP header in `src/middleware.ts` (per D-07). Start with `Content-Security-Policy-Report-Only` (per D-06) using the following policy:
    ```
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://js.stripe.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://*.supabase.co;
    connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co;
    frame-src https://js.stripe.com https://hooks.stripe.com;
    font-src 'self';
    ```
    Note: `'unsafe-inline'` for scripts is required by Stripe.js. If no Stripe Elements are used directly (only Stripe Checkout redirect), this can be tightened to `https://js.stripe.com` only.

- **F-8.2**: Missing `X-Frame-Options` header (clickjacking protection)
  - Severity: High
  - File: `src/middleware.ts`
  - Evidence: No `X-Frame-Options` or `frame-ancestors` CSP directive present
  - Recommendation: Add `X-Frame-Options: SAMEORIGIN` or include `frame-ancestors 'self'` in CSP.

- **F-8.3**: Missing `X-Content-Type-Options` header (MIME sniffing protection)
  - Severity: High
  - File: `src/middleware.ts`
  - Evidence: No `X-Content-Type-Options: nosniff` header present
  - Recommendation: Add `X-Content-Type-Options: nosniff` to all responses in middleware.

- **F-8.4**: Missing `Referrer-Policy` header
  - Severity: Low
  - File: `src/middleware.ts`
  - Evidence: No `Referrer-Policy` header present
  - Recommendation: Add `Referrer-Policy: strict-origin-when-cross-origin`.

### Verdict: FAIL
No security headers whatsoever. F-8.1, F-8.2, F-8.3 are High. F-8.4 is Low.

---

## Domain 9: Rate Limiting & Audit Trail
### Requirements: SEC-13, SEC-14

### SEC-13: Rate Limiting

**Signup rate limiting (confirmed present):**
- `signupRateLimit.ts` implements in-memory rate limiting: 5 attempts per IP per hour
- Wired to `ownerSignup.ts` and `provisionStore.ts` via `checkRateLimit(ip)` calls
- Limitation: In-memory store — resets on cold starts / new serverless instances. Adequate for v2.0 scale (noted in code: "Revisit if deployments scale horizontally")

**Staff PIN rate limiting:**
- DB-level: 10 attempts tracked in `staff.pin_attempts`, lockout stored in `staff.pin_locked_until`
- Account-level only: lockout is per-staff-record, not per-IP

### Findings

- **F-5.1**: Staff PIN authentication has no IP-level rate limiting — only per-account lockout
  - Severity: Low
  - File: `src/actions/auth/staffPin.ts`
  - Evidence: No call to `checkRateLimit()` or `check_rate_limit` RPC before the PIN verification. An attacker who knows a `staffId` and `storeId` can attempt 10 PINs from any IP before lockout.
  - Note: The `check_rate_limit` RPC exists in migration 009 and could be used here. The `signupRateLimit.ts` in-memory pattern could also be extended.
  - Recommendation: Add IP-level rate limiting to `staffPin.ts` using either the existing `check_rate_limit` RPC or extending `signupRateLimit.ts`. Suggested: 20 attempts per IP per 5 minutes across all staff PIN attempts.

### SEC-14: Audit Trail

**`super_admin_actions` table:**
- RLS: Only SELECT policy (super admins can read). No INSERT policy — writes via service_role only via admin client.
- Verified in all 4 super-admin action files: each calls `supabase.from('super_admin_actions').insert(...)` using `createSupabaseAdminClient()` (service_role).
- Immutability is correctly enforced.

### Findings

- **F-9.1**: Non-super-admin sensitive mutations (refunds, stock adjustments, order status changes) have no audit trail
  - Severity: Low
  - File: Various (processRefund.ts, processPartialRefund.ts, updateOrderStatus.ts)
  - Evidence: Refund operations are recorded in the `refunds` and `refund_items` tables (audit by nature), but stock adjustments via `restore_stock` RPC leave no audit record. Order status changes are updated in-place with no change log.
  - Recommendation (deferred): Add an `audit_log` table or extend `super_admin_actions` to cover owner/staff sensitive mutations. Not critical for v2.1 but should be tracked.

### Verdict for SEC-13: PASS WITH FINDINGS
Signup rate limiting is present. Staff PIN lacks IP-level rate limiting (Low — F-5.1).

### Verdict for SEC-14: PASS WITH FINDINGS
Super admin audit trail is correct and immutable. Non-admin mutations lack audit logging (Low — F-9.1).

---

## Opportunistic Findings (per D-03)

- **F-OPP-1**: `createCheckoutSession.ts` uses `process.env.STORE_ID` (v1 single-store artifact) instead of resolving the store from the subdomain context
  - Severity: Low
  - File: `src/actions/orders/createCheckoutSession.ts`
  - Evidence: `const storeId = process.env.STORE_ID!` — hardcoded to a single store. In a multi-tenant platform, any storefront calling this action would create a checkout session for the store in the env var, not necessarily the current subdomain's store.
  - Recommendation: Resolve `storeId` from the `x-store-id` request header (set by middleware) rather than the environment variable.

- **F-OPP-2**: `billing/route.ts` Route Handler does not import `server-only` (order webhook does)
  - Severity: Low
  - File: `src/app/api/webhooks/stripe/billing/route.ts`
  - Evidence: No `import 'server-only'` at the top. Route handlers cannot be client-bundled anyway, so this is informational.
  - Recommendation: Add for consistency.

---

## Verification

```bash
grep -c "^## Domain" .planning/phases/17-security-audit/SECURITY-AUDIT.md
# Expected: 9
```

**All 14 SEC requirements covered with explicit verdicts:**
- SEC-01: PASS WITH FINDINGS (Domain 1)
- SEC-02: PASS WITH FINDINGS (Domain 2)
- SEC-03: PASS WITH FINDINGS (Domain 3)
- SEC-04: PASS (Domain 4)
- SEC-05: PASS WITH FINDINGS (Domain 4)
- SEC-06: PASS (Domain 4)
- SEC-07: PASS WITH FINDINGS (Domain 4)
- SEC-08: PASS WITH FINDINGS (Domain 6)
- SEC-09: FAIL (Domain 7)
- SEC-10: PASS WITH FINDINGS (Domain 7)
- SEC-11: PASS (Domain 5)
- SEC-12: FAIL (Domain 8)
- SEC-13: PASS WITH FINDINGS (Domain 9)
- SEC-14: PASS WITH FINDINGS (Domain 9)

**No source code files were modified during this audit.**

---

## Post-Remediation Notes
*(Added after Plans 02-04 remediation — 2026-04-04)*

### SEC-04: Owner JWT verified server-side
PASS confirmed. No remediation required.

### SEC-06: Super admin routes inaccessible to regular users
PASS confirmed. No remediation required.

### SEC-07: Customer JWT cannot access owner/staff Server Actions
PASS confirmed. No remediation required.

### SEC-10: server-only guards (defense-in-depth)
Plan 03 added `import 'server-only'` to admin-client files (High findings). Plan 04 added `import 'server-only'` to all 18 remaining Server Action files (categories, products, auth) as defense-in-depth. All Server Actions are now directly guarded — 46 total files verified.

### SEC-13: Staff PIN IP-level rate limiting
Plan 04 added `check_rate_limit` RPC call to `staffPin.ts` before PIN verification. 20 attempts per IP per 5-minute window (higher than per-account limit to allow multiple staff on shared iPad). Both layers now enforced: per-IP (20/5min) and per-account DB lockout (10/5min).

### SEC-14: super_admin_actions immutability verified
`super_admin_actions` table has SELECT-only RLS for super admins. No INSERT RLS policy — writes occur exclusively via service_role through `createSupabaseAdminClient()`. This is intentional immutability by design (F-1.2 confirmed-correct). All 4 super-admin action files (`suspendTenant`, `unsuspendTenant`, `impersonateMerchant`, `updateStoreStatus`) write to the table via admin client. Non-admin mutation logging (F-9.1) deferred — refund records in `refunds`/`refund_items` tables provide natural audit trail; stock adjustment audit logging is Low severity and tracked for v2.2.
