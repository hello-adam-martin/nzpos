# Phase 17: Security Audit - Research

**Researched:** 2026-04-04
**Domain:** Application security audit — RLS, auth flows, webhooks, Server Actions, secrets, CSP, audit trail
**Confidence:** HIGH (code read directly from codebase; patterns verified against migrations and source files)

## Summary

Phase 17 is a systematic security audit followed by remediation of all findings. The codebase has a solid security foundation — Stripe webhook signature verification is correctly implemented on both endpoints, the RLS policy rewrite (migration 015) established a unified `app_metadata` JWT claims pattern, and most Server Actions use Zod `safeParse`. However, the audit will surface specific gaps that are known from code inspection: 10 Server Actions lack Zod validation (including the bulk import action), 23 action files are missing `server-only` guards (though most don't use service_role, categories/products use the server-only Supabase server client indirectly), the `.env.example` is missing 12 environment variables used in production, storage bucket policies have no per-store tenant isolation, and the `xero_connections` / `xero_sync_log` tables use an older RLS pattern from migration 008 that doesn't match the unified 015 pattern and lacks super admin read access.

The two-phase structure (audit → fix) is locked by D-02/D-05. Plan 1 produces `SECURITY-AUDIT.md` with severity classifications. Plans 2+ execute remediation in severity order. The planner must honour this structure without collapsing discovery and fixing into one pass.

**Primary recommendation:** Structure Plan 1 as a systematic code-reading audit covering all 7 security domains in blast-radius order. Output a formal SECURITY-AUDIT.md with findings. Plans 2-N fix Critical first, then High, then Low.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Risk-prioritized audit structure. Work through security boundaries in order of blast radius: (1) RLS tenant isolation, (2) Auth bypass vectors, (3) Webhook integrity, (4) Server Action validation, (5) Secrets/env hygiene, (6) CSP/security headers, (7) Audit trail completeness.
- **D-02:** Produce a formal SECURITY-AUDIT.md findings report with severity classification, then fix all issues in a separate pass. Discovery and remediation are separate plans.
- **D-03:** Cover all 14 SEC requirements plus opportunistic findings — flag anything suspicious found along the way without expanding scope.
- **D-04:** 3-level severity classification: Critical (data leak/auth bypass), High (missing validation/weak headers), Low (hygiene/documentation). Critical must be fixed; Low can be deferred.
- **D-05:** Complete full audit before fixing anything. Even Critical findings are documented first, then all fixes applied by severity. No stop-and-fix during discovery.
- **D-06:** Start with Content-Security-Policy-Report-Only. Switch to enforcing after verifying no false positives against Stripe JS, Supabase auth, and any other external resources.
- **D-07:** CSP headers set in existing Next.js middleware (`src/middleware.ts`) alongside tenant routing. Single location for all request-level security headers.
- **D-08:** Single CSP policy for all surfaces (storefront, POS, admin, super admin). No per-surface differentiation in v2.1.
- **D-09:** Grep all `process.env` references in the codebase, cross-check against .env.example, ensure nothing is missing and no undocumented vars exist.
- **D-10:** Scan current HEAD only for hardcoded secrets — no git history scan. Repo has always been private.
- **D-11:** Two-phase approach: Plan 1 is the systematic audit producing SECURITY-AUDIT.md. Plan 2+ is remediation of all findings ordered by severity.

### Claude's Discretion
- Claude determines the specific CSP directives (script-src, style-src, connect-src, etc.) based on what external domains the app actually loads.
- Claude determines the optimal plan breakdown within the two-phase structure (audit → fix).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | All database tables have RLS policies with correct store_id filtering for SELECT/INSERT/UPDATE/DELETE | 015 covers 14 tables; 008 covers xero tables with pre-015 pattern; rate_limits/super_admins intentionally RLS-free via SECURITY DEFINER |
| SEC-02 | Storage bucket policies prevent cross-tenant file access | 004 has broad auth policies (no per-store scoping); product-images bucket is public — audit needed |
| SEC-03 | SECURITY DEFINER RPCs validate caller identity and inputs | provision_store grants EXECUTE to service_role only; increment_promo_uses/restore_stock are SECURITY DEFINER but accept arbitrary UUID — audit needed |
| SEC-04 | Owner auth flow verifies JWT expiry enforcement and session cookie handling | Middleware uses getUser() (validates server-side); token refresh logic exists for role-missing edge case |
| SEC-05 | Staff PIN auth verifies lockout after failed attempts and 8h session expiry | staffPin.ts implements 10-attempt lockout in 5-min window; JWT set to 8h; middleware verifies via jwtVerify |
| SEC-06 | Super admin routes are inaccessible to regular merchants and staff | Middleware checks app_metadata.is_super_admin; super-admin actions check user.app_metadata.is_super_admin before acting |
| SEC-07 | Customer auth cannot access POS or admin Server Actions | Middleware blocks customer role for /pos and /admin; Server Actions that use resolveAuth() need audit for customer bypass |
| SEC-08 | All 67 Server Actions use Zod validation before database access | 48 action files found; 10 lack Zod safeParse — importProducts, signOut, checkSlugAvailability, customerSignOut, disconnectXero, triggerManualSync, dismissWizard, createCheckoutSession, validatePromoCode, createBillingPortalSession |
| SEC-09 | No secrets in source code and .env.example is complete and accurate | 12 env vars missing from .env.example (STRIPE_BILLING_WEBHOOK_SECRET, RESEND_API_KEY, XERO_* vars, etc.); no hardcoded secrets found in source |
| SEC-10 | service_role key imports are guarded by server-only in all files | admin.ts has server-only; 23 action files missing server-only but most use only createSupabaseServerClient (which imports server.ts which has server-only) |
| SEC-11 | Stripe webhook handlers verify signatures via constructEvent() | Both route.ts files correctly implement constructEvent() with separate secrets (STRIPE_WEBHOOK_SECRET and STRIPE_BILLING_WEBHOOK_SECRET) |
| SEC-12 | Content Security Policy headers configured for all routes | No CSP headers currently in middleware.ts; must be added (Report-Only first per D-06) |
| SEC-13 | Rate limiting verified on signup and extended to PIN login attempts | Signup has in-memory rate limit (signupRateLimit.ts); staffPin.ts has DB-level lockout but no IP-level rate limit |
| SEC-14 | All sensitive mutations are logged in audit trail and logs are immutable | super_admin_actions has NO INSERT RLS policy (service_role only writes = immutable); non-super-admin mutations (refunds, stock changes) have no audit table |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase RLS | via @supabase/supabase-js ^2.x | Row-level security on all tables | Already used; audit verifies completeness |
| jose | ^5.x | JWT verification for staff PIN sessions | Already in use; jwtVerify in middleware and resolveAuth |
| zod | ^3.x | Input validation on Server Actions | Already used; audit finds gaps |
| Stripe (stripe-node) | ^17.x | constructEvent() for webhook signature verification | Already implemented on both webhook endpoints |
| server-only | latest | Prevent server-side code running on client | Already used on most action files |

### Audit Tools (no new dependencies needed)
The entire audit uses code inspection + grep — no new libraries required. All gaps found during audit are fixed using existing stack.

### What NOT to Add
- No OWASP ZAP (explicitly out of scope per REQUIREMENTS.md)
- No Helmet.js — CSP headers go in Next.js middleware directly (D-07)
- No new rate-limiting library — existing signupRateLimit.ts pattern is sufficient for PIN lockout extension

## Architecture Patterns

### Recommended Plan Structure
```
17-RESEARCH.md          ← this file (phase research)
17-PLAN-01-audit.md     ← systematic discovery pass → SECURITY-AUDIT.md
17-PLAN-02-critical.md  ← fix Critical severity findings
17-PLAN-03-high.md      ← fix High severity findings
17-PLAN-04-low.md       ← fix Low severity / hygiene findings
```

### Two-Phase Pattern (locked by D-02, D-05)
**Phase A (Plan 1):** Read every canonical ref. For each security domain, check the code. Document findings with severity. Write SECURITY-AUDIT.md to `.planning/phases/17-security-audit/SECURITY-AUDIT.md`. Do NOT fix anything during this pass.

**Phase B (Plans 2+):** Read SECURITY-AUDIT.md. Execute fixes in severity order: Critical → High → Low. Each fix plan covers one severity tier or one logical group.

### Severity Classification (D-04)
```
Critical — data leak or auth bypass:
  - A user of tenant A can read/write tenant B data
  - Customer JWT can invoke owner/staff Server Actions
  - Webhook accepts unauthenticated requests

High — missing validation or weak headers:
  - Server Action touches DB without Zod validation
  - service_role file missing server-only (potential client bundle leak)
  - Missing env vars in .env.example (deployment risk)
  - Storage bucket allows cross-tenant writes
  - No CSP headers

Low — hygiene/documentation:
  - Old-pattern RLS policy (still functional but inconsistent)
  - STORE_ID env var still used (v1 artifact — intentional for current storefront model)
```

### RLS Policy Pattern (from migration 015)
```sql
-- Source: supabase/migrations/015_rls_policy_rewrite.sql
-- Standard tenant isolation (owner + staff read/write):
CREATE POLICY "{table}_tenant_access" ON public.{table}
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

-- Super admin read across all tenants:
CREATE POLICY "{table}_super_admin_read" ON public.{table}
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );
```
CRITICAL: The JWT path is `auth.jwt() -> 'app_metadata' ->> 'store_id'` — NOT `current_setting()` and NOT `user_metadata`. Migration 013 used the wrong path (now fixed in 015). Any new policies MUST use this exact pattern.

### CSP Header Pattern (for Plan 2/3)
```typescript
// Source: src/middleware.ts — add after suspension/auth checks, before return
// Per D-06: start with Report-Only, switch to enforcing after validation
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",  // Stripe.js requires unsafe-inline
  "style-src 'self' 'unsafe-inline'",  // Tailwind inline styles
  "img-src 'self' data: blob: https://*.supabase.co",  // Supabase Storage
  "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co",
  "frame-src https://js.stripe.com https://hooks.stripe.com",  // Stripe iframe
  "font-src 'self'",
].join('; ')

response.headers.set('Content-Security-Policy-Report-Only', csp)
```
Confidence: MEDIUM — exact directives must be validated against actual external resources loaded (Stripe, Supabase, any analytics). Claude's discretion to determine final directives during audit.

### Server Action Validation Pattern (from existing actions)
```typescript
// Source: src/actions/orders/completeSale.ts — standard pattern
import 'server-only'
'use server'
import { z } from 'zod'

const Schema = z.object({ ... })

export async function myAction(input: unknown) {
  const parsed = Schema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }
  // ... only touch DB after this line
}
```

### Anti-Patterns to Avoid
- **Using `user_metadata` in RLS policies:** JWT claims are injected into `app_metadata` via the auth hook (016_super_admin.sql). Never write RLS policies checking `user_metadata`.
- **Using `current_setting()` in RLS:** The pre-015 pattern used `current_setting('app.store_id')`. Now obsolete — use `auth.jwt() -> 'app_metadata'` exclusively.
- **Throwing raw DB errors to client:** Several actions return `dbError.message` directly. This can leak table names, column names, and constraint names. Replace with generic user-facing messages; log the detail server-side.
- **`server-only` in SECURITY DEFINER RPCs:** SECURITY DEFINER runs as the DB owner; the `server-only` import pattern is application-layer, not applicable to SQL functions. The GRANT/REVOKE on the function is the correct control.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC comparison | `stripe.webhooks.constructEvent()` | Already implemented correctly; timing-safe comparison, handles edge cases |
| JWT verification | Manual base64 decode | `jwtVerify` from `jose` | Already in middleware and resolveStaffAuth; supports Edge Runtime |
| Input sanitization | String regex | Zod schema with `.safeParse()` | Already the standard; handles type coercion, nested validation |
| CSP nonce generation | Custom random | Native `crypto.randomUUID()` in middleware | No library needed; Next.js middleware has access to Web Crypto API |
| DB-level rate limiting | Custom SQL | Existing `check_rate_limit` RPC in migration 009 | Already has SECURITY DEFINER + atomic upsert; just wire it up in staffPin.ts |

**Key insight:** All security primitives are already in the codebase. Phase 17 is an audit-and-wire phase — not a build-new-systems phase.

## Known Findings (Pre-Audit Intelligence)

These are findings from code inspection during research. The audit plan MUST verify and classify each.

### Finding Group A: Server Actions Missing Zod Validation (SEC-08)
10 action files have no `safeParse` call:
1. `src/actions/products/importProducts.ts` — bulk import, no row-level Zod schema (rows array validated only by TypeScript interface, not Zod)
2. `src/actions/auth/signOut.ts` — no inputs, acceptable
3. `src/actions/auth/checkSlugAvailability.ts` — takes slug input, needs validation
4. `src/actions/auth/customerSignOut.ts` — no inputs, acceptable
5. `src/actions/xero/disconnectXero.ts` — no external inputs, may be acceptable
6. `src/actions/xero/triggerManualSync.ts` — no external inputs, may be acceptable
7. `src/actions/setup/dismissWizard.ts` — no external inputs, may be acceptable
8. `src/actions/orders/createCheckoutSession.ts` — takes items array with productId/quantity, no Zod validation
9. `src/actions/promos/validatePromoCode.ts` — takes promo code string, no Zod validation
10. `src/actions/billing/createBillingPortalSession.ts` — no external inputs, may be acceptable

**Audit task:** Classify each — some (signOut, customerSignOut, dismissWizard, disconnectXero, triggerManualSync, createBillingPortalSession) take no user-controlled inputs and may be classified as Low. `createCheckoutSession`, `importProducts`, `checkSlugAvailability`, `validatePromoCode` take external inputs and are High severity.

### Finding Group B: Server Actions Missing `server-only` (SEC-10)
23 action files are missing `import 'server-only'`. However, this splits into two sub-groups:
- **Group B1 (use service_role admin client):** `provisionStore.ts`, `ownerSignup.ts` — these call `createSupabaseAdminClient()` which is in `admin.ts` which already has `server-only`. The `server-only` guard propagates transitively, so a direct client-bundle inclusion of these files would fail anyway. However, defense-in-depth says add `server-only` directly. **Severity: High.**
- **Group B2 (use server client only):** `createCategory.ts`, `deleteCategory.ts`, `updateCategory.ts`, `reorderCategories.ts`, `createProduct.ts`, `updateProduct.ts`, `deactivateProduct.ts`, `ownerSignin.ts`, `customerSignin.ts`, `customerSignup.ts`, `signOut.ts`, `resetPassword.ts`, `changePassword.ts`, `updateEmail.ts`, `updateProfile.ts`, `staffPin.ts`, `retryProvisioning.ts`, `resendVerification.ts`, `checkSlugAvailability.ts` — these use `createSupabaseServerClient()` from `server.ts` which has `server-only`. Same transitive argument applies. **Severity: Low** (defensive-in-depth improvement).

### Finding Group C: `.env.example` Missing Variables (SEC-09)
Variables used in source but absent from `.env.example`:
- `STRIPE_BILLING_WEBHOOK_SECRET` — **Critical** — separate secret for billing webhook, already in use
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — present in .env.example ✓ (already listed)
- `RESEND_API_KEY` — **High** — email provider key
- `RESEND_FROM_ADDRESS` — **High** — email sender address
- `XERO_CLIENT_ID` — **High** — Xero OAuth
- `XERO_CLIENT_SECRET` — **High** — Xero OAuth
- `XERO_REDIRECT_URI` — **High** — Xero OAuth callback
- `STRIPE_PRICE_XERO` — **High** — billing price ID
- `STRIPE_PRICE_EMAIL_NOTIFICATIONS` — **High** — billing price ID
- `STRIPE_PRICE_CUSTOM_DOMAIN` — **High** — billing price ID
- `NEXT_PUBLIC_ROOT_DOMAIN` — **High** — client-side domain resolution
- `NEXT_PUBLIC_SITE_URL` — **High** — used in auth redirect URLs
- `CRON_SECRET` — **High** — cron endpoint authentication
- `FOUNDER_EMAIL` — **Low** — founder notification email
- `NEXT_PUBLIC_STORE_ID` — **Low** — v1 artifact, still in .env.example (keep for now)

Also: `.env.example` still contains `STORE_ID` and `NEXT_PUBLIC_STORE_ID` which are v1-era artifacts used in the single-store storefront pages (`src/app/(store)/`). These are intentional for the current architecture and should remain.

### Finding Group D: Storage Bucket Policy Gap (SEC-02)
Migration 004 creates `product-images` bucket with:
- Public read: all objects readable (intentional — product images are public)
- Authenticated INSERT/UPDATE/DELETE: any authenticated user can upload/modify/delete ANY file in the bucket, regardless of store

**Issue:** Staff from Store A can delete product images belonging to Store B. The bucket path convention (if images are stored as `{store_id}/{filename}`) could provide logical isolation, but the RLS policy does not enforce this. **Severity: High.**

**Fix pattern:** Update storage policy to scope write operations to the authenticated user's store_id using the JWT path. The RPC for storage object policies uses `(storage.foldername(name))[1]` to extract the first path segment:
```sql
-- Allow authenticated users to upload only to their store's folder
CREATE POLICY "tenant_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'store_id')
  );
```
However, this only works if images ARE stored with a store_id prefix. The audit must verify whether `saveLogoStep.ts`, `createProduct.ts`, `updateProduct.ts` actually use a store-scoped path when uploading. If not, the path convention change is part of the fix.

### Finding Group E: Xero RLS Pattern Inconsistency (SEC-01)
`xero_connections` and `xero_sync_log` use an older `owner_only` policy from migration 008:
```sql
-- Current (from 008):
CREATE POLICY "owner_only" ON public.xero_connections
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
```
Issues:
1. No role check — any JWT with a matching `store_id` (including customers or staff) can access Xero data. **Severity: High** — staff should have access, customers should not.
2. No super admin read policy — super admins cannot query these tables. **Severity: Low** (super admin panel doesn't currently surface Xero data).
3. Pattern inconsistency — does not match the 015 unified pattern for maintainability. **Severity: Low**.

### Finding Group F: `orders_public_read` Scope (SEC-01 opportunistic)
```sql
CREATE POLICY "orders_public_read" ON public.orders
  FOR SELECT USING (channel = 'online');
```
Any unauthenticated user can read ANY online order from ANY store. This is intentional for guest checkout confirmation, but exposes order data (customer email, totals, items via join) to anyone who can enumerate order UUIDs. The `lookup_token` in migration 009 suggests IDOR protection was planned. **Severity: Low to Medium** — depends on whether order UUIDs are guessable (they are UUIDs, not sequential). The audit should verify if the storefront actually uses `lookup_token` for order confirmation pages rather than raw order ID.

### Finding Group G: Raw DB Errors Returned to Client (SEC-08 / QUAL-02)
Several actions return `dbError.message` directly to the client:
- `createProduct.ts`: `return { error: { _form: [dbError.message] } }`
- `updateProduct.ts`: `return { error: { _form: [dbError.message] } }`
- `deactivateProduct.ts`: `return { error: { _form: [dbError.message] } }`
- `closeCashSession.ts`: `return { error: error.message }`
- `openCashSession.ts`: `return { error: error?.message ?? 'Failed to open session' }`
- `importProducts.ts`: returns `insertError.message` per-row

**Severity: High** — Postgres error messages can expose table names, constraint names, column names, and in some cases data. Should be replaced with generic messages with server-side logging.

### Finding Group H: `orders_customer_read` Policy Scope Issue (SEC-01 / SEC-07 opportunistic)
```sql
CREATE POLICY "orders_customer_read" ON public.orders
  FOR SELECT USING (
    customer_id = auth.uid()
    AND store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
  );
```
The `store_id` check here uses the customer's `app_metadata.store_id` from the JWT. But customers authenticated with one store cannot see orders from another store — this is correct. However, it means a customer must have a `store_id` claim to read even their own orders. This is the expected behavior for the multi-tenant model. Mark as verified-correct during audit.

### Finding I: Billing Webhook Missing `server-only` (SEC-10)
`src/app/api/webhooks/stripe/billing/route.ts` is missing `import 'server-only'`. The order webhook (`route.ts`) has it. Both use `createSupabaseAdminClient()` which is in a file with `server-only`, so the transitive guard exists. **Severity: Low** (defense-in-depth).

### Finding J: Staff PIN — No IP-Level Rate Limit (SEC-13)
`staffPin.ts` has a DB-level lockout (10 attempts in 5-min window per staff account), but no IP-level rate limiting. An attacker with many staff IDs could attempt each once from one IP without hitting the per-account lockout. An existing `check_rate_limit` RPC is available in migration 009 for IP-based limiting. **Severity: Low** — for a POS system accessed from known physical devices, IP rate limiting is a defense-in-depth improvement, not a critical gap.

### Finding K: `refund_items` Missing UPDATE/DELETE Policies (SEC-01)
Migration 015 creates INSERT and SELECT policies for `refund_items` but no UPDATE or DELETE policies:
```sql
CREATE POLICY "refund_items_staff_read" ON public.refund_items FOR SELECT ...
CREATE POLICY "refund_items_staff_insert" ON public.refund_items FOR INSERT ...
-- No UPDATE or DELETE policy
```
This means authenticated staff CANNOT update or delete refund items (RLS blocks all UPDATE/DELETE). This is likely intentional (refund immutability) but should be verified. If intentional, it should be documented in the audit as verified-by-design. **Severity: None if intentional.**

## Common Pitfalls

### Pitfall 1: Confusing Transitive `server-only` with Direct `server-only`
**What goes wrong:** The planner marks all 23 "missing server-only" files as Critical because they access the Supabase client.
**Why it happens:** `createSupabaseServerClient()` imports from `server.ts` which has `import 'server-only'`. The build error is already triggered if any of these files are accidentally imported client-side.
**How to avoid:** Categorize missing `server-only` by whether the file itself uses `SUPABASE_SERVICE_ROLE_KEY` or `createSupabaseAdminClient()` (High: add immediately) vs. only using `createSupabaseServerClient()` (Low: defense-in-depth).

### Pitfall 2: Storage Policy Fix Breaking Existing Uploads
**What goes wrong:** Adding a per-store path check to the storage INSERT policy breaks existing product image uploads that don't use a store-scoped path convention.
**Why it happens:** The upload code may store files as `{filename}` without a `{store_id}/` prefix.
**How to avoid:** Before writing the storage policy fix, grep for all Supabase Storage upload calls and verify the path format used. Fix the path convention in upload code before enforcing the path check in RLS.

### Pitfall 3: CSP False Positives Breaking Stripe Checkout
**What goes wrong:** Enforcing CSP before validating against all external resources causes Stripe Elements or Stripe Checkout redirects to fail.
**Why it happens:** Stripe loads scripts from `js.stripe.com` and needs frames from `hooks.stripe.com`. Missing these in `frame-src` breaks the payment flow.
**How to avoid:** Use `Content-Security-Policy-Report-Only` (D-06) and test all payment flows before switching to enforcing. Monitor browser console for violations before switching.

### Pitfall 4: JWT Path Errors in New RLS Policies
**What goes wrong:** Writing a new RLS policy using `user_metadata` instead of `app_metadata`, causing all legitimate queries to fail.
**Why it happens:** Supabase has both `user_metadata` (user-writable) and `app_metadata` (server-only, set by auth hook). The critical path for this project uses `app_metadata` via the custom JWT hook.
**How to avoid:** Always use `auth.jwt() -> 'app_metadata' ->> 'store_id'` — never `auth.jwt() -> 'user_metadata'`. Reference migration 015 as the canonical pattern.

### Pitfall 5: `orders_public_read` — Verify Before Changing
**What goes wrong:** Removing or tightening the `orders_public_read` policy breaks guest checkout order confirmation pages.
**Why it happens:** The storefront shows a confirmation page after checkout that reads order data. If this relies on the public read policy and order ID is in the URL, removing the policy breaks confirmations.
**How to avoid:** Before flagging as Critical or making changes, verify how order confirmation pages fetch data. Check `src/app/(store)/orders/` or confirmation route code.

### Pitfall 6: SECURITY DEFINER RPCs — Don't Add Role Checks Inside SQL
**What goes wrong:** Adding `auth.uid()` or role checks inside SECURITY DEFINER functions to restrict callers.
**Why it happens:** SECURITY DEFINER functions run as the DB owner, so `auth.uid()` inside them returns the DB owner's ID, not the calling user's ID.
**How to avoid:** Caller restriction for SECURITY DEFINER RPCs is done via `GRANT/REVOKE EXECUTE` (as in migration 017). Verify the grants are correct; don't add JWT checks inside the function body.

## Code Examples

### Reading Both Webhook Secrets (Both Verified Correct)
```typescript
// src/app/api/webhooks/stripe/route.ts — order webhook
event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)

// src/app/api/webhooks/stripe/billing/route.ts — billing webhook
event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_BILLING_WEBHOOK_SECRET!)
```
Both are correctly implemented. The audit verifies both secrets are environment-specific (never shared between endpoints).

### Staff PIN Lockout (Verified Correct Pattern)
```typescript
// src/actions/auth/staffPin.ts
const LOCKOUT_ATTEMPTS = 10
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
// ... checks pin_locked_until, increments pin_attempts, sets lockout timestamp
// JWT: 8h expiry, httpOnly, secure in production, sameSite: lax
```
Lockout is 10 attempts in 5 minutes (DB records). SEC-05 verification: confirm these are the intended thresholds (REQUIREMENTS.md says "failed attempts" without specifying count).

### Auth Hook JWT Claims (Verified Correct)
```sql
-- src: supabase/migrations/016_super_admin.sql
-- Order: super admin check → staff lookup → customer lookup
-- Injects: app_metadata.store_id, app_metadata.role, app_metadata.is_super_admin
-- The raw_app_meta_data concern from STATE.md: hook writes to claims.app_metadata
-- which in Supabase becomes the JWT app_metadata claim — CORRECT path
```
The STATE.md concern about `raw_app_meta_data` vs `user_metadata` is the JWT hook writing to `claims.app_metadata` (line: `claims := jsonb_set(claims, '{app_metadata,store_id}', ...)`). This IS the correct `app_metadata` path. Middleware then reads `session.user.app_metadata.role` and RLS reads `auth.jwt() -> 'app_metadata'`. The path is internally consistent. Verify this during audit by confirming the claims structure.

### Super Admin Access Check (Verified Correct)
```typescript
// src/middleware.ts — super admin route guard
const isSuperAdmin = user.app_metadata?.is_super_admin === true
// src/actions/super-admin/suspendTenant.ts — action-level guard
if (!user || user.app_metadata?.is_super_admin !== true) return { error: 'Unauthorized' }
```
Both middleware and action-level checks consistent. SEC-06 verification: confirm all 4 super-admin actions have this check.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `current_setting('app.store_id')` in RLS | `auth.jwt() -> 'app_metadata'` | Migration 015 | Eliminates server-side session variable attack surface |
| Per-route auth helpers | Unified middleware + resolveAuth() | Phase 14-16 | Single auth path, no per-page auth logic |
| In-memory rate limit Map | DB-level `check_rate_limit` RPC | Migration 009 (not wired to staffPin) | Atomic, cross-instance safe |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Phase 14 migration | Required for App Router |

**Deprecated/outdated in this codebase:**
- `user_metadata` JWT path in RLS: fixed in 015, but 008 policies don't use it either — they just lack role checks
- `STORE_ID`/`NEXT_PUBLIC_STORE_ID`: v1 single-store artifact, still used in storefront pages — intentional, not a security issue

## Open Questions

1. **Is `orders_public_read` policy intentional for guest confirmation, and what data does it expose?**
   - What we know: Policy allows any anon to SELECT any `channel='online'` order
   - What's unclear: Whether order confirmations use this policy + order ID in URL (IDOR risk), or use the `lookup_token` from migration 009
   - Recommendation: During audit, check storefront order confirmation route and classify severity based on actual data exposure

2. **Are product images stored with store_id prefix in the path?**
   - What we know: Storage policies have no per-store scoping
   - What's unclear: Whether upload code uses `{store_id}/{filename}` path format
   - Recommendation: Grep `supabase.storage.from('product-images').upload(` calls to determine current path format before designing the RLS fix

3. **Is there a notifications table with RLS?**
   - What we know: Migration 011 only adds `opening_hours` column to `stores` — no notifications table was created
   - What's unclear: Whether the codebase relies on a notifications table that was removed
   - Recommendation: Search for `FROM 'notifications'` in source; if not found, mark as N/A

4. **Do super-admin Server Actions verify both middleware AND action-level super admin status?**
   - What we know: Middleware checks super admin for `/super-admin` routes; actions also check
   - What's unclear: Whether any super-admin action could be called directly (bypassing middleware) without the action-level check
   - Recommendation: During audit, verify all 4 super-admin actions have `user.app_metadata?.is_super_admin !== true` guard

## Environment Availability

Step 2.6: SKIPPED — Phase 17 is a code/SQL audit phase. No external services required for the audit itself. Remediation tasks (adding CSP headers, fixing Zod schemas) are code changes only. The only runtime dependency is a running Supabase instance for RLS verification tests, which is already part of the existing test infrastructure (`src/lib/__tests__/rls.test.ts` skips when no Supabase is running).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x/3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | RLS tenant isolation | integration | `npx vitest run src/lib/__tests__/rls.test.ts` | ✅ exists |
| SEC-02 | Storage bucket cross-tenant | manual | manual (requires Supabase Storage API) | ❌ Wave 0 |
| SEC-03 | SECURITY DEFINER RPCs | manual | SQL inspection + GRANT verification | ❌ Wave 0 |
| SEC-04 | Owner JWT expiry | unit | verify middleware getUser() pattern | ❌ Wave 0 |
| SEC-05 | Staff PIN lockout | unit | `npx vitest run src/actions/auth/staffPin` | ❌ Wave 0 (no test file for staffPin) |
| SEC-06 | Super admin route isolation | unit | verify action-level checks | ✅ `src/actions/super-admin/__tests__/` |
| SEC-07 | Customer cannot reach POS/admin | integration | middleware test | ❌ Wave 0 |
| SEC-08 | Zod validation coverage | unit | grep audit (static analysis) | ❌ manual-only |
| SEC-09 | No secrets, .env.example complete | manual | grep audit | ❌ manual-only |
| SEC-10 | server-only guards | manual | build verification (Next.js build error if violated) | ❌ manual-only |
| SEC-11 | Stripe webhook signatures | unit | `npx vitest run src/app/api/webhooks/stripe/webhook.test.ts` | ✅ exists |
| SEC-12 | CSP headers present | unit | middleware output test | ❌ Wave 0 |
| SEC-13 | Rate limiting on signup + PIN | unit | existing signup test + new PIN test | ✅ partial (signup) |
| SEC-14 | Audit trail for sensitive mutations | unit | verify super_admin_actions insert in actions | ✅ (super-admin actions tested) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/auth/__tests__/staffPin.test.ts` — covers SEC-05 (PIN lockout behavior)
- [ ] `src/app/api/webhooks/stripe/__tests__/middleware.test.ts` — covers SEC-07 (customer auth cannot invoke admin actions)
- [ ] `src/middleware.test.ts` — covers SEC-12 (CSP headers in response)

*(Most audit findings are verified via static analysis / code reading. The above test files are needed for remediation validation.)*

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/middleware.ts` — auth flow, super admin routing, JWT verification
- Direct code inspection: `supabase/migrations/015_rls_policy_rewrite.sql` — complete RLS policy inventory
- Direct code inspection: `supabase/migrations/016_super_admin.sql` — JWT claims hook implementation
- Direct code inspection: `src/app/api/webhooks/stripe/route.ts` and `billing/route.ts` — webhook signature verification
- Direct code inspection: `src/actions/auth/staffPin.ts` — PIN lockout implementation
- Direct file scan: 48 non-test action files checked for Zod usage and `server-only` guards
- Direct file scan: `.env.example` compared against `grep -rh "process.env."` results

### Secondary (MEDIUM confidence)
- Next.js App Router documentation pattern for CSP in middleware (verified by codebase pattern)
- Supabase Storage RLS `storage.foldername()` function (standard Supabase pattern)

### Tertiary (LOW confidence)
- CSP directives for Stripe compatibility — based on known Stripe requirements; must be validated during implementation against actual browser console violations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — code inspected directly
- Architecture: HIGH — locked by CONTEXT.md decisions D-01 through D-11
- Pitfalls: HIGH — grounded in actual code findings from codebase inspection
- CSP directives: MEDIUM — requires runtime validation

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days — stable codebase, no external dependency churn expected)
