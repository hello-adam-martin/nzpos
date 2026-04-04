# Pitfalls Research: v4.0 Admin Platform

**Domain:** Adding staff role-based permissions, merchant impersonation, Stripe analytics dashboards, and customer management to an existing multi-tenant SaaS POS. Integrating with Supabase RLS via custom JWT claims, staff PIN auth via jose, Stripe billing webhooks, multi-tenant middleware, and Server Actions with Zod validation.
**Researched:** 2026-04-05
**Confidence:** HIGH for JWT stale-claim and RLS escalation risks (confirmed against existing codebase architecture + official Supabase docs). HIGH for Stripe API rate limit patterns (official Stripe docs confirmed). MEDIUM for impersonation session isolation (practitioner patterns + OWASP + Supabase community). MEDIUM for role gate bypass via middleware (code review of existing middleware.ts).

---

## Critical Pitfalls

### Pitfall 1: Staff JWT Contains a Stale Role After Role Is Changed in Admin UI

**What goes wrong:**
The staff PIN login issues a jose JWT with `role` embedded in the payload. That JWT is valid for 8 hours (as configured in `staffPin.ts`). If an owner upgrades a Staff member to Manager in the admin UI — or demotes a Manager back to Staff — the existing `staff_session` cookie still carries the old role until it expires or the staff member logs out and back in. POS middleware reads `payload.role` directly from the JWT without a DB lookup, so the promoted/demoted staff member acts under the wrong role for up to 8 hours.

**Why it happens:**
Embedding roles in JWTs is idiomatic and fast. The developer adds a `manager` role value to the `role` CHECK constraint on the `staff` table and updates the Zod schema, but the existing middleware JWT-verification path at line 204–208 of `middleware.ts` only checks `payload.role === 'staff' || payload.role === 'owner'` for POS access. The role check feels complete because it gates page-level access. The per-action enforcement using the role from the JWT is then stale.

**How to avoid:**
For role-gated actions in Server Actions, re-fetch the role from the database rather than trusting the JWT role claim. `resolveStaffAuth()` already returns `role` from the JWT — add a DB-verified variant `resolveStaffAuthVerified()` that calls `supabase.from('staff').select('role').eq('id', staff_id).single()` and use it in any mutation that requires Manager-level permission. Reserve the JWT fast-path for read-only UI rendering. When a role changes, also implement a `invalidate_staff_session` action that clears the `staff_session` cookie via a forced logout (redirect to PIN screen).

**Warning signs:**
- Staff member still sees manager UI elements after demotion until they log out
- Integration test for "demote manager, immediately attempt manager-only action" passes unexpectedly
- No DB lookup on role in mutation Server Actions — role comes only from JWT payload

**Phase to address:**
Staff management phase (add/edit/deactivate staff). Implement DB-verified role check pattern before any role-gated mutation is wired up.

---

### Pitfall 2: Impersonation Session Leaks Into the Real Super-Admin Session Cookie

**What goes wrong:**
Merchant impersonation requires the super admin to act as a store owner. The tempting implementation is to call `supabase.auth.signInAsUser()` (Supabase's admin impersonation API) which overwrites the current Supabase session cookie. When the super admin "stops impersonating," the logout clears the Supabase session entirely — and the super admin is now signed out of their own session and must re-authenticate. Worse, if session refresh runs on any Next.js page before explicit impersonation end, the refreshed token overwrites the super admin's original token in the cookie store.

**Why it happens:**
`supabase.auth.signInAsUser()` is the documented Supabase approach and appears to be exactly what is needed. The developer calls it in a Server Action, sets a cookie, and routes to the tenant subdomain. The Supabase `@supabase/ssr` client is configured to use `cookies()` for session storage — the same store as the super admin's own session. The two sessions collide on the same cookie names (`sb-access-token`, `sb-refresh-token`).

**How to avoid:**
Do NOT use `supabase.auth.signInAsUser()` for impersonation. Instead implement a shadow impersonation token pattern:
1. Store the super admin's original session before impersonation begins (in a separate `sa_original_session` cookie or server-side store).
2. Create a short-lived signed impersonation JWT (via jose, the same library already in use) containing `{ impersonating_store_id, impersonating_as: 'owner', initiated_by: super_admin_user_id, expires }`.
3. Set this as a separate `sa_impersonation` cookie (not overwriting Supabase session cookies).
4. In middleware, detect `sa_impersonation` cookie on `/super-admin/impersonate/[storeId]/**` routes and inject the impersonated `x-store-id` header — preserving the super admin's own Supabase session.
5. All Server Actions during impersonation must read from `sa_impersonation` cookie first, log actions to `super_admin_actions` table with `impersonating_store_id`.
6. "Stop impersonating" simply deletes the `sa_impersonation` cookie — original Supabase session is untouched.

**Warning signs:**
- Super admin is logged out after ending impersonation
- `supabase.auth.signInAsUser()` is called anywhere in the impersonation flow
- No `sa_impersonation` or equivalent separation cookie exists
- Impersonation route uses the same Supabase client session as normal super-admin routes

**Phase to address:**
Super-admin user management phase (impersonation). Must be the very first design decision before any impersonation code is written.

---

### Pitfall 3: Impersonation Actions Are Not Written to the Audit Trail

**What goes wrong:**
The `super_admin_actions` table exists and already logs `suspend`, `unsuspend`, `activate_addon`, `deactivate_addon`. When impersonation is added, mutations performed during an impersonation session (e.g., resetting a merchant's product price, editing a customer record) are performed via the normal owner Server Actions — which do not log to `super_admin_actions`. The audit trail shows the impersonation started and ended but not what was done in between.

**Why it happens:**
Normal owner Server Actions call `resolveAuth()` which returns `store_id` and `staff_id` from the owner's Supabase JWT. During impersonation with the shadow-cookie pattern, `resolveAuth()` still resolves against the super admin's own Supabase session, but the impersonation context comes from the `sa_impersonation` cookie. There is no automatic mechanism to augment every Server Action call with an impersonation audit entry.

**How to avoid:**
Create a `resolveImpersonationContext()` helper that checks for the `sa_impersonation` cookie and returns `{ isImpersonating: true, initiatedBy: string, targetStoreId: string }` when active. Call this at the start of any Server Action that writes data. When `isImpersonating` is true, append a row to `super_admin_actions` with action type `impersonation_mutation`, the JSON payload of what changed, and the `initiated_by` super admin ID. This is a cross-cutting concern — enforce it as a wrapper or convention, not per-action opt-in.

**Warning signs:**
- `super_admin_actions` table has no `impersonation_mutation` action type in its CHECK constraint
- Server Actions during impersonation do not check `sa_impersonation` cookie
- Integration test: impersonate → edit product → end impersonation → check audit trail shows no mutation log

**Phase to address:**
Super-admin user management phase, immediately after impersonation session isolation is implemented (Pitfall 2). Audit trail is a prerequisite for the feature being safe to ship.

---

### Pitfall 4: Adding Manager Role Breaks the Existing Middleware POS Gate

**What goes wrong:**
The existing POS middleware at lines 204–208 of `middleware.ts` allows entry only when `payload.role === 'staff' || payload.role === 'owner'`. When `manager` is added as a new role value in the staff schema, managers are locked out of the POS — they are redirected to `/pos/login` because their JWT carries `role: 'manager'` which fails the existing gate.

**Why it happens:**
The middleware check was written as an explicit allowlist of valid roles. Adding a new role value to the database CHECK constraint does not automatically update the middleware role check. The developer adds the DB migration, updates the Zod schema in `staff.ts`, updates the staffPin.ts JWT issuance, and the admin UI — but the middleware is in a separate file and the connection between the schema change and the middleware allowlist is not obvious.

**How to avoid:**
Define a canonical role enum in a shared constants file (e.g., `src/config/roles.ts`): `export const POS_ROLES = ['owner', 'manager', 'staff'] as const`. Import this in both `middleware.ts` (for the POS gate check) and `staffPin.ts` (for JWT issuance). The Zod schema in `staff.ts` should also derive from this constant: `z.enum(POS_ROLES)`. A TypeScript error in one place surfaces the need to update others.

**Warning signs:**
- `'manager'` role literal appears in some files but not `middleware.ts`
- Manager staff member is always redirected to PIN screen despite correct credentials
- No shared constants file — role strings duplicated across `staff.ts`, `middleware.ts`, `staffPin.ts`

**Phase to address:**
Staff management phase, specifically when the Manager role is added to the schema. The shared constants refactor should be the first commit of that phase.

---

### Pitfall 5: Stripe Analytics Page Triggers Rate Limiting on Page Load

**What goes wrong:**
The super-admin Stripe analytics page fetches MRR, churn, subscription counts, and payment failure data by calling `stripe.subscriptions.list()` and `stripe.invoices.list()` in parallel Server Components on page load. With more than ~20 tenants and 90 days of history, these list calls require pagination loops. Each paginated call counts against Stripe's 100 req/s live mode limit. A single page load can trigger 30–50+ Stripe API calls. Multiple super-admin browser tabs or a page reload storm returns HTTP 429 errors from Stripe and crashes the analytics page.

**Why it happens:**
Stripe list endpoints return up to 100 records per call. Subscription + invoice history for analytics requires iterating `starting_after` pagination tokens. The developer writes the analytics logic as a Server Component that awaits all data, not realising each `autoPagingEach` or manual pagination loop issues multiple sequential API calls. Stripe's `100 req/s` limit sounds generous until 5+ paginated list calls run in parallel.

**How to avoid:**
Never fetch Stripe analytics data on page load from the live Stripe API. Instead:
1. Maintain a materialised analytics table in Supabase (`platform_analytics_snapshots`) that is populated by a daily Stripe data sync triggered by a cron job (Vercel Cron or Supabase scheduled function).
2. The super-admin analytics page reads from this local table — zero Stripe API calls at page-load time.
3. The sync job runs once per day with retry logic and exponential backoff on 429s.
4. Add a "Refresh now" button for the super admin that triggers a single on-demand sync, rate-limited to once per 5 minutes.
Use webhook events (`customer.subscription.updated`, `invoice.paid`, `invoice.payment_failed`) to keep the snapshot table incrementally updated between daily syncs.

**Warning signs:**
- Stripe API calls in Server Components that run on every page load
- `stripe.subscriptions.list()` called without pagination result caching
- No `platform_analytics_snapshots` table or equivalent local cache
- Stripe API errors in production logs when super admin views analytics

**Phase to address:**
Super-admin analytics phase. The materialised snapshot approach must be the architecture from day one — retrofitting it after live-API calls are wired up is harder.

---

### Pitfall 6: MRR Calculation from Stripe Subscriptions API Is Wrong for Annual Plans

**What goes wrong:**
The platform has per-add-on billing (Xero, email notifications, inventory). Some tenants may pay annually. If MRR is calculated by summing `subscription.items.data[].price.unit_amount` for all active subscriptions, annual plans show 12x their true monthly contribution (e.g., a $120/year Xero plan counts as $120 MRR instead of $10). Total platform MRR is significantly overstated.

**Why it happens:**
The Stripe subscriptions API returns `plan.interval` (`month` or `year`) and `plan.amount`. The developer sums amounts without normalising to monthly equivalents. Stripe's own built-in MRR metric handles this correctly, but if building a custom analytics table, the normalisation step is easy to miss.

**How to avoid:**
In the Stripe sync job, normalise all subscription amounts to monthly: if `plan.interval === 'year'`, divide `plan.amount` by 12. If `plan.interval === 'week'`, multiply by 52/12. Store the normalised monthly amount in `platform_analytics_snapshots`. Add a unit test that verifies a $120/year plan contributes $10 to MRR.

**Warning signs:**
- MRR figure is much higher than expected when annual subscriptions are active
- No `interval` normalisation in the Stripe sync function
- No unit test for annual plan MRR calculation

**Phase to address:**
Super-admin analytics phase, specifically in the Stripe sync job implementation.

---

### Pitfall 7: Role-Gated Server Actions Use Only Middleware as the Auth Check

**What goes wrong:**
When adding manager-only actions (e.g., "apply discount above 20%", "void a completed order"), the developer relies on the Next.js middleware to block non-managers from reaching those routes. But Server Actions are callable via `fetch` directly, bypassing middleware entirely. A Staff-role user calls `applyLargeDiscount()` Server Action directly via a crafted POST request and the action executes because it only calls `resolveAuth()` (which confirms store tenancy) without checking that the caller's role is `manager`.

**Why it happens:**
Middleware is the first line of defence and feels thorough. The developer sees that only Manager routes are exposed in the UI and trusts that middleware blocked the path. Next.js Server Actions are invoked via POST to the same route but are not protected by the middleware route pattern unless the route itself matches the middleware config.

**How to avoid:**
Every role-gated Server Action must perform its own role check using a DB-verified role lookup — not just tenant verification. Pattern:
```typescript
const auth = await resolveStaffAuthVerified() // reads role from DB, not JWT
if (!auth || auth.role !== 'manager') return { error: 'Insufficient permissions' }
```
Never rely on the UI or middleware as the sole permission gate for mutations. This is already the existing pattern for `requireFeature()` — apply the same principle to role checks.

**Warning signs:**
- Server Actions that perform manager-only mutations call only `resolveAuth()` (no role check)
- No E2E test that attempts a manager-only action with a staff-role session cookie
- Role check only in middleware / UI, absent from the Server Action body

**Phase to address:**
Staff management phase. Establish the `resolveStaffAuthVerified()` pattern before writing the first role-gated action.

---

### Pitfall 8: Customer Data Exposed to Staff Who Should See Only Their Store's Customers

**What goes wrong:**
When building customer management in the admin area, a bug in the Supabase query omits the `store_id` filter. The admin customer list page renders all customers in the database across all tenants — displaying names, emails, and order history belonging to other merchants' customers. This is a data breach under the NZ Privacy Act 2020.

**Why it happens:**
The `customers` table already has RLS policies (`customer_own_profile`, `staff_read_customers`) but the developer building the admin customer list uses the Supabase admin client (service role) for convenience — bypassing RLS entirely. The query returns all rows. The developer tests with a single tenant and sees only their own customers, failing to notice the missing filter.

**How to avoid:**
Use the standard Supabase server client (not admin client) for all customer list queries in the admin area — RLS enforces the store_id filter automatically. Only use the admin client when there is an explicit reason (e.g., the super-admin panel which is designed for cross-tenant reads). When the admin client is used for a legitimate cross-tenant operation, add an explicit `.eq('store_id', storeId)` filter as defence-in-depth even though RLS would not apply. Add an integration test that asserts the customer list for Store A contains zero records from Store B.

**Warning signs:**
- Admin client (`createSupabaseAdminClient`) used in merchant-facing admin routes
- No `store_id` filter on customer list query
- Customer count on admin page matches total customers across all tenants (not just this store)

**Phase to address:**
Customer management phase. Cross-tenant data leak prevention must be in the acceptance criteria.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Read role from JWT in Server Actions instead of DB | Saves one DB round-trip per request | Stale role acts on wrong permissions for up to 8 hours after role change | Read-only UI rendering only — never mutations |
| Call Stripe API live on analytics page load | No sync job to build or maintain | 429 rate limit errors at scale, slow page loads | Never — always use materialised snapshot |
| Use Supabase admin client for merchant admin queries | Bypasses RLS, no need to manage session context | Cross-tenant data leaks, Privacy Act exposure | Super-admin routes only, with explicit store_id filter |
| Hardcode role strings (`'manager'`, `'staff'`) across files | Faster to write | Role added to DB but missed in middleware/JWT issuance — login failures | Never — use shared constants |
| Impersonation via `supabase.auth.signInAsUser()` | Uses official Supabase API | Overwrites super-admin session, causes logout on session end | Never — use shadow cookie pattern |
| Skip audit trail for impersonation mutations | Fewer DB writes | No forensic record of what was changed during impersonation | Never — impersonation without audit trail is an unacceptable security gap |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe subscriptions list | Call `stripe.subscriptions.list()` on every page load | Sync to local `platform_analytics_snapshots` table daily; page reads from DB |
| Stripe MRR calculation | Sum `plan.amount` without normalising interval | Divide annual plan amounts by 12, weekly by 0.23, store normalised monthly amount |
| Stripe webhooks for analytics | Ignore `invoice.payment_failed` events | Handle `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` to keep snapshot current between daily syncs |
| Supabase admin client in merchant admin | Use service role client (bypasses RLS) for convenience | Use server client in merchant-facing routes; admin client only in super-admin routes with explicit `store_id` filter |
| Supabase auth hook (003_auth_hook.sql) | Add `manager` role to DB CHECK but forget to update the hook | Hook currently only checks `owner`/`staff`/`customer` — if a manager logs into the POS via Supabase Auth (not PIN), their JWT gets no role claim |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Live Stripe API calls for analytics | 429 errors, slow super-admin page | Materialised snapshot table, daily sync job | ~20+ tenants with 3+ months history |
| Customer list without pagination | Admin page slow to load, full-table scan | Add `LIMIT`/`OFFSET` or cursor pagination, index on `store_id + created_at` | ~1,000+ customers per store |
| Impersonation session check on every request in middleware | Middleware latency increase | Cache impersonation context in the short-lived jose token (already at Edge); avoid DB lookup in middleware | Any traffic spike |
| Super-admin tenant list without index | Slow tenant grid as store count grows | Existing `stores` index is adequate; ensure `is_active` is indexed if filtering | ~500+ tenants |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Impersonation without time limit | Super admin forgets to end session; impersonation cookie persists indefinitely | Short-lived jose JWT for `sa_impersonation` cookie (max 1 hour); display countdown timer in UI |
| Role downgrade not invalidating active JWT | Demoted manager acts as manager for up to 8h | On role change, set `pin_locked_until` to force re-login; or use short-lived staff JWTs (2h instead of 8h) |
| Super-admin billing data exposed to owners | Owner calls super-admin analytics endpoint via crafted request | Double-check `is_super_admin` in super-admin layout AND in Server Actions (defence in depth); super-admin layout already does this — verify actions too |
| Impersonation without CSRF protection | CSRF attack triggers impersonation of arbitrary merchant | Impersonation action must validate `sa_impersonation` cookie was set by a verified super admin request (same-site cookies + Zod-validated storeId in action) |
| Customer email visible in admin to non-owner staff | Privacy Act exposure | Gate customer email display behind `role === 'owner'` in the admin customer detail component |
| Password reset for merchant via super-admin uses service role without audit | Untraceable password reset | Every `supabase.auth.admin.generateLink()` call must write to `super_admin_actions` table before returning |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual indicator when super admin is impersonating | Super admin forgets they are impersonating; makes destructive changes in wrong context | Persistent banner: "You are viewing [Store Name] as owner. [End impersonation]" on all pages during impersonation |
| Role change takes effect immediately in UI but not in POS | Owner sees manager demoted; manager still acts as manager in POS for 8h | Show advisory toast: "Role change saved. Staff member must re-login at POS for changes to take effect." |
| Customer management with no search returns 50+ rows instantly | Admin expects search results, not a full list | Default to empty state with search prompt; never auto-load all customers |
| Staff PIN reset requires owner to read new PIN to staff | Security theatre — PIN should be owner-set, not owner-known | Generate a temporary PIN that staff must change on first login, or let owner set it directly in the form with a "show PIN" toggle |
| Analytics charts with no date range selector | Super admin cannot compare periods | Always ship analytics with "last 30 days / last 90 days / this year" selector; default to 30 days |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Staff role management:** Role is saved in DB and UI refreshes — but POS middleware and Server Actions still enforce old two-role model. Verify middleware allows `manager`, and every role-gated Server Action checks DB role not JWT role.
- [ ] **Manager role permissions:** Manager can access the right UI pages — but verify Server Actions for each manager-only mutation individually enforce role check (middleware bypass attack vector).
- [ ] **Merchant impersonation:** Super admin can view a tenant store — but verify (a) super admin session is not overwritten, (b) impersonation has a time limit, (c) all mutations during impersonation write to audit trail, (d) end-impersonation returns to super admin context cleanly.
- [ ] **Stripe analytics dashboard:** MRR number is displayed — but verify (a) annual plan normalisation, (b) data comes from local snapshot not live Stripe, (c) snapshot is populated by sync job not page load, (d) failed payments are included.
- [ ] **Customer management:** Customer list shows for the owner — but verify the query uses the server client (not admin client) and includes `store_id` filter (or RLS enforces it); verify no cross-tenant data visible.
- [ ] **Super-admin password reset:** Password reset email triggers — but verify the action writes to `super_admin_actions` audit table with the triggering super admin's ID.
- [ ] **Staff deactivation:** `is_active = false` is set in DB and UI shows the staff member as inactive — but verify the staff member's active `staff_session` cookie is invalidated (or at minimum the PIN login enforces `is_active` check, which it already does in `staffPin.ts` line 47).

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale role JWT acting on wrong permissions | LOW | Force staff logout: set `pin_locked_until` in DB to current time; staff must re-PIN-login; new JWT gets correct role |
| Super admin session overwritten by impersonation | MEDIUM | Super admin must re-authenticate; no data loss but disruption; fix: switch to shadow cookie pattern before re-deploying |
| Cross-tenant customer data exposed | HIGH | Immediate: take admin customer list page offline; patch query to add `store_id` filter; audit logs to identify if data was viewed; notify affected customers under Privacy Act breach notification requirements |
| Stripe analytics showing wrong MRR | LOW | Update sync job with interval normalisation; re-run sync to rebuild snapshot; no user-facing data loss |
| Impersonation mutations with no audit trail | MEDIUM | Retroactively attempt to reconstruct from Supabase Row-Level audit triggers (if enabled) or Postgres WAL; add `super_admin_actions` entries manually for known impersonation sessions; implement audit trail before re-enabling impersonation |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stale role JWT in mutations (Pitfall 1) | Staff management phase | Integration test: change role → immediately call role-gated action → confirm action denied |
| Impersonation session overwrites super-admin session (Pitfall 2) | Super-admin user management phase (first design decision) | E2E test: impersonate → end impersonation → verify super admin still logged in |
| Impersonation mutations missing from audit trail (Pitfall 3) | Super-admin user management phase, after Pitfall 2 is resolved | Integration test: impersonate → mutate → end → verify `super_admin_actions` row exists |
| New role breaks middleware POS gate (Pitfall 4) | Staff management phase, first commit | Manual: log in as manager → verify POS is accessible; automated: middleware unit test |
| Stripe analytics 429 rate limiting (Pitfall 5) | Super-admin analytics phase, architecture decision | Load test: 5 concurrent page loads → no Stripe 429; Stripe API calls = 0 on page load |
| MRR wrong for annual plans (Pitfall 6) | Super-admin analytics phase, sync job implementation | Unit test: annual $120/year plan contributes $10 to monthly MRR snapshot |
| Role-gated Server Action bypassed via direct POST (Pitfall 7) | Staff management phase | E2E test: attempt manager action with staff session cookie → 403/error response |
| Customer data cross-tenant leak (Pitfall 8) | Customer management phase | Integration test: Store A admin queries customer list → zero Store B customers returned |

---

## Sources

- Supabase Custom Claims and RBAC official docs: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- Supabase Next.js stale data with RLS changes: https://supabase.com/docs/guides/troubleshooting/nextjs-1314-stale-data-when-changing-rls-or-table-data-85b8oQ
- Stripe rate limits official docs: https://docs.stripe.com/rate-limits
- Stripe pagination official docs: https://docs.stripe.com/pagination
- Stripe MRR calculation accuracy analysis: https://getlago.com/blog/calculating-stripe-mrr-is-difficult
- Stripe MRR from raw data (practitioner): https://medium.com/@steven_wang/calculating-mrr-from-raw-stripe-data-is-tricky-heres-how-we-did-it-80c9980d783a
- JWT role-in-token stale permission risk: https://www.permit.io/blog/how-to-use-jwts-for-authorization-best-practices-and-common-mistakes
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Multi-tenant RBAC design (WorkOS): https://workos.com/blog/how-to-design-multi-tenant-rbac-saas
- NZ Privacy Act 2020 obligations: https://www.data.govt.nz/toolkit/privacy-and-security/data-privacy
- Supabase user impersonation pattern: https://jjacky.substack.com/p/building-user-impersonation-using
- Existing codebase: `src/middleware.ts`, `src/actions/auth/staffPin.ts`, `src/lib/resolveAuth.ts`, `src/schemas/staff.ts`, `supabase/migrations/003_auth_hook.sql`, `supabase/migrations/015_rls_policy_rewrite.sql`, `supabase/migrations/020_super_admin_panel.sql`

---
*Pitfalls research for: v4.0 Admin Platform — staff roles, merchant impersonation, Stripe analytics, customer management*
*Researched: 2026-04-05*
