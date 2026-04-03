# Pitfalls Research: v2.1 Hardening & Documentation

**Domain:** Security audit, code quality review, and documentation pass on an existing 36K LOC multi-tenant SaaS POS (Next.js 16 + Supabase + Stripe + Xero) with financial data, NZ GST compliance, and RLS-based tenant isolation.
**Researched:** 2026-04-04
**Confidence:** HIGH for RLS/Stripe/Next.js patterns (official docs + CVE evidence). MEDIUM for documentation staleness and code-review sequencing (WebSearch + practitioner consensus).

---

## Critical Pitfalls

### Pitfall 1: RLS Audit Misses Storage Buckets

**What goes wrong:**
The database RLS audit covers all `public.*` tables. The Supabase Storage RLS is on a separate schema (`storage.objects`) with different policy semantics. Product image buckets may be marked "public" — meaning any URL holder can read files — without realising that a tenant's images are universally accessible to anyone who can guess or enumerate the path. Worse, if a bucket is public, the upload and delete operations still run through RLS, but misconfigured policies may allow cross-tenant writes (tenant A overwrites tenant B's product image).

**Why it happens:**
Storage buckets are configured via the Supabase dashboard UI, not SQL migrations. They live outside the normal schema review workflow. The typical audit checklist covers `public.products`, `public.orders` etc. but forgets `storage.objects`. The word "public" in "public bucket" means HTTP GET access — not "no access controls" — but developers conflate the two.

**How to avoid:**
Audit storage policies explicitly as a separate step. For product images: a public bucket (any URL holder can GET) is acceptable, but write/delete policies must restrict to the owning store. Verify:
- `storage.objects` INSERT policy: `bucket_id = 'products' AND (storage.foldername(name))[1] = (auth.jwt() ->> 'store_id')`
- DELETE policy: same check, or SECURITY DEFINER RPC for admin deletes
- No cross-tenant path traversal possible via the path segment

Run `SELECT * FROM storage.policies` in the Supabase SQL editor and review each policy. Do not assume the database table audit covered storage.

**Warning signs:**
- No entries in `storage.policies` query results
- Supabase dashboard shows buckets but migrations don't include `storage.objects` policy SQL
- Product images can be accessed at predictable paths (`/store-id/products/product-id.webp`) with no auth

**Phase to address:** Security Audit phase (Phase 1). Must be explicit checklist item — not assumed to be covered by table-level RLS review.

---

### Pitfall 2: Stripe Webhook Raw Body Parsing Failure Silently Breaks Signature Verification

**What goes wrong:**
The Stripe webhook Route Handler passes verification in development (test mode, local tunnel, lenient headers) but fails in production for a percentage of events. The failure is silent: `constructEvent()` throws a `WebhookSignatureVerificationError`, the handler catches it and returns 400, Stripe retries 3 times, then stops. No billing events are processed. Merchants subscribe and their plan is never activated, or they cancel and features are never gated. The failure rate may be under 5% — enough to miss in manual testing but enough to cause real billing issues at scale.

**Why it happens:**
Next.js App Router Route Handlers use `request.text()` to get the raw body, but if any middleware or proxy layer transforms the body (adds/removes whitespace, re-encodes) before the handler, the raw bytes no longer match what Stripe signed. This is the #1 cause of production webhook signature failures. The specific failure mode in Next.js: if a developer uses `request.json()` and then `JSON.stringify()` on the result (which is the intuitive approach), key ordering or whitespace will differ and verification will fail deterministically.

**How to avoid:**
- Route Handler must use `const rawBody = await request.text()` — never `request.json()`
- Pass `rawBody` (string) directly to `stripe.webhooks.constructEvent(rawBody, signature, secret)`
- No middleware should touch the webhook route's body — add the webhook path to any body-parser exclusion list
- In production, use a separate webhook signing secret from test mode — the secret mismatch alone causes 100% failure
- Log `event.id` for every successfully processed event; alert on Stripe's retry count rising in Dashboard

**Warning signs:**
- Webhook handler uses `request.json()` anywhere before calling `constructEvent()`
- Test mode and live mode share the same `STRIPE_WEBHOOK_SECRET` environment variable
- No `stripe_billing_events` or `stripe_payment_events` table logging processed event IDs
- Merchants report plan activation delays exceeding 5 minutes after checkout completes

**Phase to address:** Security Audit phase. Verify raw body handling for all webhook endpoints (`/api/webhooks/stripe` and `/api/webhooks/stripe-billing`). Also verify idempotency — duplicate event delivery must not double-process.

---

### Pitfall 3: Custom JWT Claims Cached in User Metadata Are Auditor-Visible But Not Always Authoritative

**What goes wrong:**
The security audit verifies RLS policies and confirms they use `auth.jwt() ->> 'store_id'`. The audit passes. What it misses: `user_metadata` (as opposed to `app_metadata`) can be modified by the authenticated user client-side via `supabase.auth.updateUser()`. If any JWT claim used in an RLS policy is sourced from `user_metadata` rather than `app_metadata`, any user can forge their own `store_id` claim by calling the Supabase Auth API directly with a modified user object.

This is distinct from `app_metadata` which is service-role-only writable. The distinction is not obvious in the Supabase Auth UI — both appear in the JWT under `user_metadata` and `app_metadata` respectively.

**Why it happens:**
Audit reviews the Supabase access token hook code and confirms claims are set. Does not verify *which* metadata source each claim reads from. If an early version of the hook read from `user_metadata` and was later "fixed" to use `app_metadata` without fully migrating, some claims may still be sourcing from the user-writable metadata store.

**How to avoid:**
In the access token hook, every RLS-relevant claim (`store_id`, `is_super_admin`, `plan`) must be sourced exclusively from `raw_app_meta_data` (the `app_metadata` column), never from `raw_user_meta_data`.

```sql
-- CORRECT: app_metadata is service-role only
store_id := (new_claims->>'app_metadata'->'store_id');

-- DANGEROUS: user_metadata is user-writable
store_id := (new_claims->>'user_metadata'->'store_id');
```

Audit step: inspect the access token hook function body in `supabase/migrations/` and confirm all RLS claims source from `app_metadata`.

**Warning signs:**
- Access token hook references `user_metadata` for any claim used in an RLS policy
- No test that verifies a user calling `supabase.auth.updateUser({ data: { store_id: 'other-store-id' }})` cannot access another tenant's data

**Phase to address:** Security Audit phase. Highest priority — this is a complete RLS bypass if misconfigured.

---

### Pitfall 4: Suspension Enforcement Has Gaps at the API Layer

**What goes wrong:**
Super admin suspends a tenant. Middleware checks `store.is_suspended` and blocks web page loads. But direct API calls to Route Handlers and Server Actions from an already-authenticated session bypass the middleware check. The suspended merchant's iPad has an active session; they can continue ringing up POS sales because the POS Server Actions don't re-check suspension status on each request — only the middleware gate blocked new page loads.

**Why it happens:**
Suspension is typically enforced at the routing/middleware layer ("gate the page"). The API layer enforcement ("gate the operation") is assumed to be covered. In a Server-Components-first architecture, most "pages" are server-rendered — so middleware coverage feels complete. But long-lived POS sessions (an iPad tab open for a full trading day) never hit the middleware after initial load.

**How to avoid:**
Suspension must be enforced at the data layer, not just the routing layer. Two approaches:
1. **RLS policy approach:** Add `is_suspended` to the RLS policy so any query from a suspended store returns empty / throws permission denied. This is the strongest enforcement.
2. **Application layer approach:** Add a `requireActiveStore(storeId)` check at the top of every POS Server Action, similar to `assertFeature()`. Reads from a short-TTL cache (or the `stores` table directly) on each mutation.

The audit must verify both: does the web routing gate exist, and does the API operation gate exist.

**Warning signs:**
- Suspension check only in `middleware.ts`, not in Server Actions
- No test that verifies a suspended store's POS checkout Server Action returns an error
- `is_suspended` column exists on `stores` table but no RLS policy references it

**Phase to address:** Security Audit phase. Suspension enforcement gaps are a billing/legal risk (suspended non-paying merchant continues to operate).

---

### Pitfall 5: Dead Code Removal Breaks Runtime Behaviour Without Type Errors

**What goes wrong:**
The code review identifies "dead code" — exported functions, types, or utilities with no apparent callers. Running `knip` or TypeScript unused-exports analysis flags them. They are deleted. Two weeks later, a Stripe webhook stops processing because the removed utility was used dynamically (e.g., a dispatch table keyed on event type strings, or a dynamically `import()`'d helper). TypeScript's static analysis cannot see dynamic references.

**Why it happens:**
TypeScript dead code detection works on static import graphs. Dynamic references (string-keyed dispatch tables, `dynamic()` imports, reflection-based patterns, `require()` calls in scripts, or references from SQL migration files to function names) are invisible to the static analyser. In a 36K LOC codebase across 336 files, dynamic patterns are almost certain to exist.

**How to avoid:**
Before deleting any flagged "dead" code:
1. Search the entire codebase (including SQL migrations, seed scripts, `*.json` config files) for the function/export name as a string literal
2. Check if the export is in a file imported as a namespace (`import * as helpers`) — the individual exports are invisible to knip
3. Run the full test suite after each deletion batch, not at the end
4. Delete in small batches (10–20 items) with a test run between batches
5. Never delete Stripe event handler functions, GST calculation utilities, or Xero sync functions without manually verifying the dispatch path

**Warning signs:**
- Bulk dead code deletion committed as a single large PR
- Knip used without manual verification of dynamic references
- Tests pass but no E2E run before merging dead code removal
- Deleting files in `lib/`, `utils/`, or `actions/` without checking SQL migration files for cross-references

**Phase to address:** Code Quality Review phase. Treat dead code removal as higher-risk than it appears. Sequence after adding test coverage, not before.

---

### Pitfall 6: GST Edge Cases Undocumented and Undertested

**What goes wrong:**
The GST implementation is correct for the primary cases. The audit and documentation phase assumes the calculation is "done" because existing tests pass. Undocumented and untested edge cases remain: what happens at exactly $0.005 (half-cent rounding)? What does a 100% discount do to the per-line GST? What does a negative quantity (refund line item) produce? What does a 0-price product do? These edge cases don't cause crashes — they produce subtly wrong GST figures that accumulate over a filing period and trigger IRD attention.

**Why it happens:**
Tests were written to verify the happy path. The IRD publishes specimen calculations for standard cases only. Half-cent, zero, and negative cases are never in the examples. Developers assume "if it works for normal cases, it works." Documentation for the calculation says "GST is 15%, tax-inclusive, rounded to the nearest cent" — which is correct but hides the rounding-mode decision (`Math.round` vs `Math.ceil` vs banker's rounding) that only matters at the exact halfway point.

**How to avoid:**
For the documentation pass, inline-document the `calculateGST()` function with:
1. The exact formula: `gst = Math.round(lineTotal * 3 / 23)` (the IRD-compliant 3/23 fraction for 15% inclusive)
2. The rounding mode chosen and why (`Math.round` — same as IRD specimens)
3. Explicit test cases in the test file for: zero amount, amount that produces exactly $0.005 GST, 100% discounted line, negative quantity line
4. A note on what "per-line, then sum" means vs "sum, then calculate GST on total" — the latter is wrong per IRD rules

The audit should verify that the implementation matches the documentation. If they diverge, there is a bug.

**Warning signs:**
- `calculateGST()` (or equivalent) has no JSDoc or inline comment explaining the formula choice
- No test case for `amount = 0`, `amount = 1` (yields $0.065 GST pre-rounding), or a discounted amount that hits the halfway-cent threshold
- `Math.round` vs `Math.ceil` decision is not in a code comment anywhere

**Phase to address:** Both Security Audit (financial accuracy is an audit concern) and Documentation phase (inline docs must capture the formula and its edge cases).

---

### Pitfall 7: Documentation Written in a Burst Becomes Stale Immediately

**What goes wrong:**
A comprehensive documentation pass produces: setup guide, architecture overview, API reference, merchant onboarding guide, deployment runbook. Six weeks later, a phase ships that changes the env var list, adds a new database table, and modifies the Xero sync flow. None of the docs are updated. The documentation is now partially misleading, and new contributors (or the founder returning after a break) spend time debugging incorrect instructions.

**Why it happens:**
Documentation written as a milestone deliverable has no ongoing owner. There is no gate forcing doc updates during feature development. "We'll update the docs later" is the universal lie. For a solo developer, the cost of updating docs during a feature phase feels high — you just shipped the feature, writing about it feels like going backwards.

**How to avoid:**
Design docs to be updateable, not comprehensive:
1. **Living docs only:** Architecture overview, env var reference, deployment runbook should be single files that are updated in place. Not versioned PDFs. Not Notion pages. Files in the repo next to the code.
2. **Definition of Done:** Add "update relevant docs" to the GSD phase completion checklist. Not "write docs for this phase" — specifically "did any existing doc become wrong? Fix it."
3. **Staleness-resistant docs:** The deployment runbook should have `Last verified: [date]` at the top. Any doc not verified in 60 days is flagged as "may be outdated."
4. **Code-adjacent inline docs are the most durable:** A JSDoc comment on `calculateGST()` is updated when the function changes (because it's visible while editing). A separate "GST Architecture" document is not.
5. **Avoid documenting implementation details:** Document *why* a decision was made, not *what* the current implementation is. The "why" stays true longer than the "what."

**Warning signs:**
- Docs live in a separate tool (Notion, Confluence) from the code
- No `Last verified:` date on infrastructure-sensitive documents (env vars, deployment steps)
- The CLAUDE.md or PROJECT.md has outdated info that contradicts current code
- Merchant onboarding guide references UI screens that no longer exist

**Phase to address:** Documentation phase — design the doc structure to be maintainable before writing content. The biggest risk is writing too much.

---

### Pitfall 8: Security Audit Checks Headers and HTTPS But Misses IDOR in Financial Data Routes

**What goes wrong:**
The OWASP Top 10 audit confirms: HTTPS enforced, security headers set (CSP, HSTS, X-Frame-Options), SQL injection not possible (parameterised queries via Supabase client), no `eval()` calls. The audit passes. What it missed: an authenticated merchant can query another merchant's order history by incrementing or guessing the order UUID in a direct API call to a Route Handler. This is IDOR (Insecure Direct Object Reference) — Broken Object Level Authorization — consistently the #1 vulnerability in SaaS platforms and the one least likely to be caught by automated scanners or header-focused checklists.

**Why it happens:**
OWASP Top 10 checklist tools are good at structural issues (injection, misconfigs, broken auth). They cannot test IDOR because they don't understand the application's data model. A Route Handler that returns order data for a given order ID may correctly require authentication (user must be logged in) without verifying that the logged-in user *owns* that order. RLS covers the Supabase client queries, but Route Handlers that use the Supabase admin client (for any reason) or that accept object IDs and retrieve them without ownership checks are vulnerable.

**How to avoid:**
Manual test protocol for every data-reading Route Handler and Server Action:
1. Log in as Store A's owner
2. Note a resource ID (order, product, customer, report) belonging to Store B
3. Call the Route Handler / Server Action directly with Store B's resource ID using Store A's session cookies
4. Expect: 403 or empty result. Fail if: Store B's data is returned

For the audit, generate a list of all Route Handlers and Server Actions that accept an object ID as input. Verify each has an ownership check or relies on RLS with the correct store-scoped Supabase client (not admin client).

**Warning signs:**
- Any Route Handler that calls `supabaseAdmin.from('orders').select()` with a user-supplied ID
- Server Actions that accept `orderId` as a parameter and call the admin client
- No cross-tenant IDOR test in the E2E test suite
- The audit checklist only covers authentication (are you logged in?) without testing authorisation (do you own this resource?)

**Phase to address:** Security Audit phase. Add explicit cross-tenant IDOR tests to the Playwright E2E suite. These must run on every deployment.

---

### Pitfall 9: Xero Token Rotation Creates Silent Sync Failure

**What goes wrong:**
Xero OAuth 2.0 access tokens expire after 30 minutes. Refresh tokens expire after 60 days of disuse. The Xero token rotation logic refreshes the access token before each daily sync. But: if the daily sync fails silently (Xero API 503, network timeout, Supabase Vault write failure), the token may be partially refreshed — new access token fetched but not persisted to Vault, or new refresh token issued but the old one written back. Next sync attempt uses an invalidated refresh token and receives a 401. The merchant's Xero connection is silently broken. GST data stops syncing to Xero without the merchant knowing.

**Why it happens:**
Token rotation is non-atomic across two systems: Xero's auth server (issues tokens) and Supabase Vault (stores them). If the persist step fails after the refresh call succeeds, the token is lost. There is no re-try path using the original (now-invalidated) refresh token.

**How to avoid:**
1. Token rotation must be: fetch new tokens from Xero → persist to Vault atomically → only then discard old tokens. If the Vault write fails, retry with exponential backoff before abandoning.
2. Wrap Vault writes in a transaction: `BEGIN; DELETE old token; INSERT new token; COMMIT;` — never leave Vault without a valid token.
3. After each sync run, verify the token was successfully refreshed and stored. If not, set `xero_connection_status = 'token_error'` on the store record and trigger a "Xero needs reconnecting" email notification.
4. The audit should verify: what happens if the Vault write in the token rotation path throws? Is there error recovery, or does it silently break the connection?

**Warning signs:**
- Token rotation logic has no write-failure retry path
- No `xero_connection_status` or similar health flag on `stores` table
- No alert or email when Xero sync fails
- The Xero sync cron job marks success before verifying the token was persisted

**Phase to address:** Security Audit (Vault security) and Code Quality Review (error handling). The Xero sync is financial-critical and currently has no documented failure behaviour.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single comprehensive docs pass at v2.1 | Clean documentation baseline | Docs start going stale immediately post-milestone | Acceptable as a starting point only if "docs must be updated with code changes" is in the Definition of Done |
| Auditing RLS by reading policy SQL only (no runtime tests) | Fast | Misses RLS bypass via admin client, stale JWT claims, and storage policy gaps | Never — runtime tests are mandatory for security claims |
| Dead code removal as a single large commit | Clean diff history | Dynamic references break silently; hard to bisect if something breaks | Never — remove in small batches with test run between batches |
| Documenting "what it does" vs "why it was done that way" | Comprehensive reference | Becomes wrong as implementation changes | Avoid implementation-level docs; favour decision rationale |
| Using `supabaseAdmin` in Server Actions "for simplicity" during development | No RLS policy needed during feature dev | RLS bypass left in production; auditor cannot verify isolation | Acceptable only in admin-panel server code with explicit comment explaining the bypass |
| Marking tests as passing coverage thresholds without testing edge cases | CI passes | GST rounding, zero-value, and negative-quantity cases untested | Never for financial calculation code |
| Security checklist run once at milestone start | Milestone gates are clear | Passing a point-in-time checklist gives false confidence for subsequent changes | Use as a starting point; add continuous checks (lint rules, pre-commit hooks) for durability |

---

## Integration Gotchas

Common mistakes when connecting to external services during a security audit.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe webhooks | Verify signature in test mode only, assume production will work the same | Test signature verification with live mode keys in staging; the signing secret is different per mode |
| Stripe webhooks | Check that `constructEvent()` is called, not that it passes for all event types | Send synthetic events for every event type the handler handles; verify each one is processed correctly |
| Xero OAuth | Audit only the OAuth callback flow, not the token rotation used in cron sync | Explicitly test the token rotation path: simulate a rotation, verify Vault contains the new token, verify old token is gone |
| Supabase Vault | Assume Vault access is secure because it uses SECURITY DEFINER | Verify `vault.decrypted_secrets` view is not accessible to the `anon` or `authenticated` roles; check `\dp vault.*` in psql |
| Supabase Storage | Audit `public.products` table RLS but not `storage.objects` policies | Always audit `storage.objects` policies separately; public buckets are not the same as "no access control" |
| Supabase Auth | Assume `app_metadata` is immutable by users without testing | Call `supabase.auth.updateUser({ data: { store_id: 'other-id' }})` from a test client and verify the JWT does not pick up the forged claim via the access token hook |

---

## Performance Traps

Patterns that surface during a code review pass that indicate future scale issues.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 query in reporting Server Action | Reporting page slow at 100 orders; timeout at 10,000 | Identify with query logging during code review; rewrite with JOIN or single aggregation query | 500+ orders per store |
| RLS policy does a table join on every row | Slow at 1,000 rows; very slow at 100,000 | Use security-definer function to cache the lookup; or use JWT claim (already done for store_id) | 10K+ rows scanned |
| Tenant cache in middleware is not invalidated on store update | Suspended store continues to serve pages until cache TTL expires | Add cache key version to stores table; invalidate explicitly on any store mutation | Any suspension or configuration change |
| Supabase Vault decryption called per-token-per-Xero-API-call | Fine for 1 store syncing daily; slow for 100 stores | Cache decrypted token in-memory for the duration of a single sync job run, not across requests | 10+ stores with Xero enabled |
| `SELECT * FROM orders WHERE store_id = $1` without date range filter | End-of-day report slow at 5,000 orders | Code review should flag unbounded queries; add composite index `(store_id, created_at)` | 2,000+ orders per store |

---

## Security Mistakes

Domain-specific security issues in a financial multi-tenant SaaS audit.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Treating "tests pass" as equivalent to "secure" | CI green means code works, not that isolation is correct; tests may use service_role or hardcoded tenant IDs | Add dedicated cross-tenant isolation tests using two separate authenticated sessions |
| `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in environment — or any `NEXT_PUBLIC_` prefix on secret keys | Full RLS bypass for any user who inspects the JavaScript bundle | Grep entire codebase for `NEXT_PUBLIC_SUPABASE_SERVICE` and `NEXT_PUBLIC_STRIPE_SECRET` — both are catastrophic if present |
| Super admin panel using admin Supabase client for all queries with no audit log | Super admin can read/modify any tenant's financial data with no accountability | All super admin data operations must write to `admin_audit_log` table; use RLS-scoped JWT with `is_super_admin` claim where possible |
| Webhook endpoint accessible without signature verification for "testing convenience" | Attacker sends fake `customer.subscription.updated` to unlock features | All webhook handlers must verify signature in all environments, including local dev (use Stripe CLI for local testing) |
| GST figures stored as floats at any point in the pipeline | Floating point accumulates rounding errors over a filing period | Verify all monetary columns are `INTEGER` (cents); verify `calculateGST()` returns an integer, not a float |
| Xero access tokens logged to application logs during debug | Tokens in logs are readable by anyone with log access | Search codebase for any `console.log` near Xero token fetch/refresh code; rotate any tokens that may have been logged |
| Admin RPC functions callable via the anon key | Any unauthenticated user can invoke store provisioning, suspension, or feature-toggle functions | All `SECURITY DEFINER` functions must check `auth.uid() IS NOT NULL` or use `service_role` as the invoker role; verify with `\df+` in psql |

---

## UX Pitfalls

Experience failures introduced during hardening that affect real users.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw Supabase error codes to merchants in hardened error handling | Merchants see "error code 42501" instead of actionable message; support load increases | Harden error handling by mapping known error codes to user-friendly messages; log raw error server-side only |
| Over-strict input validation blocks legitimate NZ inputs | NZ phone numbers (09-xxx-xxxx), GST numbers (9-digit), NZ post codes (4-digit) fail against over-aggressive regex | Validate against NZ-specific formats; document the expected format in field labels, not just error messages |
| Session expiry mid-POS transaction shows a login screen | Merchant in the middle of a sale is forced to log in, losing cart state | Refresh session proactively 5 minutes before expiry; if expired, save cart to `sessionStorage` before redirecting to login |
| Merchant onboarding guide screenshots become stale after UI changes | New merchants follow wrong instructions; support tickets increase | Screenshots in docs are a liability for a fast-moving product — prefer step descriptions over screenshots, or use annotated screenshots with explicit "last verified" dates |

---

## "Looks Done But Isn't" Checklist

Things that appear complete in a hardening milestone but are missing critical pieces.

- [ ] **RLS audit complete:** Policy SQL reviewed — but verify `storage.objects` policies also reviewed; verify runtime cross-tenant isolation tests pass with two real sessions (not service_role)
- [ ] **Stripe webhook secured:** `constructEvent()` call exists — but verify it uses `request.text()` not `request.json()`; verify test mode and live mode have separate signing secrets configured
- [ ] **Dead code removed:** Knip reports zero unused exports — but verify no dynamic references exist; verify E2E test suite passes after removal, not just unit tests
- [ ] **GST documented:** `calculateGST()` has a JSDoc comment — but verify it documents the formula (3/23 fraction), the rounding mode, and includes edge case tests for zero, half-cent, and negative amounts
- [ ] **Deployment runbook written:** Steps documented — but verify a second person can follow them cold from scratch; verify env var list is current (matches actual production env)
- [ ] **Security audit passed:** OWASP checklist items checked — but verify IDOR was manually tested (not just auth headers); verify storage bucket policies were audited; verify suspension enforcement reaches Server Actions
- [ ] **Xero sync error handling:** Sync job has a try/catch — but verify token rotation failure is handled atomically; verify merchant receives notification when Xero connection breaks
- [ ] **Documentation won't go stale:** Docs written — but verify there is a "docs must be updated" gate in the Definition of Done; verify inline code docs (JSDoc) are the primary reference, not external docs
- [ ] **super admin panel secure:** Panel requires auth — but verify it uses RLS-scoped JWT with `is_super_admin` claim (not service role); verify audit log records every admin action
- [ ] **Suspension works end-to-end:** Middleware blocks page loads — but verify Server Actions also check suspension state; verify a POS session that was open before suspension cannot complete new transactions

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Storage bucket misconfiguration exposes cross-tenant images | MEDIUM | Audit `storage.objects` for cross-tenant paths; add missing policies via migration; notify affected stores; rotate any signed URLs that were issued |
| Stripe webhook signature failure in production | HIGH | Check Stripe Dashboard for failed webhook deliveries; verify `STRIPE_WEBHOOK_SECRET` env var matches the live endpoint secret; fix raw body parsing; manually replay failed events from Stripe Dashboard |
| Dead code removal broke a Stripe event handler | MEDIUM | `git bisect` to find the removal commit; restore the deleted utility; add a comment explaining the dynamic reference so it isn't removed again |
| GST calculation bug discovered post-audit | HIGH | Fix the calculation; re-run against all historical orders; determine if any filed GST returns are affected; if material, consult IRD amendment process |
| Xero tokens permanently lost (Vault write failure) | MEDIUM | Merchant must re-authorise Xero OAuth flow; trigger reconnect email; check if Vault write failure is a symptom of Supabase service degradation |
| Documentation immediately contradicts code after a phase ships | LOW | Update the specific doc immediately; add "update docs" to that phase's retrospective action items; institute Definition of Done gate |
| `NEXT_PUBLIC_` prefixed secret key found in codebase | CRITICAL | Rotate the key immediately; assume it was extracted; audit access logs for unusual query patterns; review git history and remove from all branches; force-rotate the Supabase JWT secret if service role was exposed |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Storage bucket RLS gap | Phase 1: Security Audit | `SELECT * FROM storage.policies` shows policies for every bucket; cross-tenant upload/delete test fails correctly |
| Stripe webhook raw body parsing | Phase 1: Security Audit | All webhook handlers use `request.text()`; verified with grep; synthetic event replay test passes in staging |
| JWT claims from user_metadata | Phase 1: Security Audit | Access token hook code reviewed; forged `user_metadata` claim test does not bypass RLS |
| Suspension enforcement gaps | Phase 1: Security Audit | Server Action suspension test: suspended store's POS checkout returns error |
| Dead code removal risks | Phase 2: Code Quality Review | Dead code removed in batches; E2E suite passes after each batch; dynamic references searched before deletion |
| GST edge cases undocumented | Phase 2: Code Quality Review + Phase 4: Inline Docs | `calculateGST()` has JSDoc with formula; test file has zero/half-cent/negative cases |
| Documentation staleness | Phase 3: Developer Docs + Phase 4: Inline Docs | "Update docs" in Definition of Done; all docs have `Last verified` date; inline JSDoc is primary reference |
| IDOR in financial data routes | Phase 1: Security Audit | Playwright E2E test: Store A session cannot read Store B order; test runs on every deploy |
| Xero token rotation failure | Phase 2: Code Quality Review | Token rotation error path tested; Vault write failure triggers reconnect notification |
| Security theater vs real security | Phase 1: Security Audit | Audit produces runtime test evidence, not just policy screenshots; cross-tenant tests added to CI suite |

---

## Sources

- Supabase Storage Access Control (official docs): https://supabase.com/docs/guides/storage/security/access-control
- Supabase RLS: Missing RLS on 170+ apps (CVE-2025-48757): https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/
- Supabase Custom Claims & app_metadata vs user_metadata (official docs): https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- Supabase service_role key exposure risk (GitGuardian): https://www.gitguardian.com/remediation/supabase-service-role-jwt
- CVE-2025-29927: Next.js Middleware Authorization Bypass (ProjectDiscovery): https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass
- Next.js Server Actions security (makerkit.dev): https://makerkit.dev/blog/tutorials/secure-nextjs-server-actions
- Next.js Data Security guide (official docs): https://nextjs.org/docs/app/guides/data-security
- Stripe webhook signature verification (official docs): https://docs.stripe.com/webhooks/signature
- Stripe webhook raw body in Next.js App Router (Medium, Kitson Broadhurst): https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f
- Stripe idempotency for webhook duplicate processing: https://hookdeck.com/webhooks/guides/implement-webhook-idempotency
- BOLA/IDOR as #1 SaaS vulnerability (DZone checklist): https://dzone.com/articles/secure-multi-tenancy-saas-developer-checklist
- Xero OAuth 2.0 token expiry and rotation (official docs): https://developer.xero.com/documentation/guides/oauth2/token-types
- Xero OAuth security standards (official docs): https://developer.xero.com/partner/security-standard-for-xero-api-consumers
- Supabase Vault security (official docs): https://supabase.com/docs/guides/database/vault
- Dead code removal risks in TypeScript (Knip): https://knip.dev
- IRD GST rounding rules: https://www.ird.govt.nz/gst/filing-and-paying-gst-and-refunds/calculating-gst
- Compliance theater vs real security (Security Magazine): https://www.securitymagazine.com/blogs/14-security-blog/post/102062-compliance-theater-why-cybersecuritys-favorite-shakespearean-tragedy-is-failing-us
- Multi-tenant SaaS suspension handling (Medium, Solly Bombe, Aug 2025): https://sollybombe.medium.com/handling-tenant-suspension-and-reactivation-gracefully-in-multi-tenant-saas-0af58945545a
- SaaS security audit: what gets missed (Atlant Security): https://atlantsecurity.com/saas-security-audit/

---
*Pitfalls research for: v2.1 Hardening & Documentation — security audit, code review, documentation pass on NZPOS multi-tenant SaaS*
*Researched: 2026-04-04*
