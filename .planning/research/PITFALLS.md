# Domain Pitfalls: v2.0 SaaS Conversion

**Domain:** Converting single-tenant Next.js + Supabase POS to multi-tenant SaaS — wildcard subdomains, Stripe subscriptions, feature gating, custom domains, super admin panel
**Researched:** 2026-04-03
**Confidence:** MEDIUM-HIGH (WebSearch + official documentation verified; see per-section notes)

---

## Critical Pitfalls

Mistakes that cause rewrites, data leaks, or security exposure.

---

### Pitfall 1: Middleware-Only Tenant Isolation — No Defence in Depth

**What goes wrong:**
The middleware resolves the tenant from the subdomain (or custom domain), sets a request header like `x-store-id`, and downstream Server Actions / Route Handlers trust that header to scope queries. If middleware is bypassed — either by a bug, a CVE, or a crafted request — any caller can inject an arbitrary `store_id` and read another tenant's data.

**Why it happens:**
Middleware is the natural place for tenant resolution because it runs before any route handler. It feels authoritative. Developers assume "if it reached my handler, the tenant is correct." CVE-2025-29927 (March 2025) proved that Next.js middleware can be bypassed by sending the internal `x-middleware-subrequest` header, skipping middleware execution entirely. Vercel-hosted apps are patched at the platform layer, but the architectural lesson stands: middleware is not a security boundary.

**How to avoid:**
Never trust a `x-store-id` (or equivalent) header that originates from middleware as the sole authority for database scoping. The authoritative `store_id` must come from the authenticated JWT claim set at login time, not from a URL-derived header. Middleware resolves the tenant for routing purposes only. The Supabase RLS policy (`(auth.jwt() ->> 'store_id')::uuid = table.store_id`) is the enforcement layer. Every Server Action must derive `store_id` from the validated session, not from any request header.

Layered defence:
1. Middleware: resolve tenant slug → set routing context
2. Session JWT: `store_id` claim is the authoritative identity
3. RLS: enforce at the database level regardless of application-layer logic
4. Application: never accept `store_id` as a client-supplied input to any Server Action

**Warning signs:**
- Server Actions read `headers().get('x-store-id')` and use it directly in queries
- Any `store_id` accepted as a form field or query parameter
- RLS policies disabled "temporarily" to speed up a feature
- No cross-tenant isolation test in the test suite

**Phase to address:** Phase 1 (Multi-Tenant Infrastructure). Must be solved before any other SaaS feature ships.

---

### Pitfall 2: Stale JWT Claims After Tenant Provisioning or Plan Change

**What goes wrong:**
A new merchant signs up. The provisioning flow creates the `stores` record, then calls Supabase to set `store_id` in `app_metadata`. But the user's current JWT — issued moments ago during signup — doesn't contain `store_id` yet. The first page load after the signup wizard returns 0 results (RLS sees no `store_id` claim) or throws a permissions error, making the app appear broken for every new user.

Similarly: when a merchant subscribes to a paid plan, the plan tier is written to `app_metadata`. The existing session JWT still shows the old tier. Feature gates reflect the old entitlement for up to 1 hour.

**Why it happens:**
Supabase JWTs are issued at login and cached for their lifetime (default 1 hour). Custom claims are baked into the token at issuance. Updating `app_metadata` after issuance has no effect on the current token. This is a documented Supabase behaviour, not a bug.

**How to avoid:**
After any operation that changes JWT-encoded claims (`store_id`, `plan`):
1. Force a token refresh immediately: call `supabase.auth.refreshSession()` from the client right after provisioning completes.
2. In the signup wizard, treat the `refreshSession()` call as a required step before advancing to the next screen — gate the redirect behind it.
3. For plan changes triggered by Stripe webhooks (server-side), set a `plan_updated_at` timestamp in the `stores` table. On next client navigation, compare against local session claim version and force a refresh if stale.
4. Keep JWT lifetime short (15–30 minutes) for the SaaS context where plan changes happen more often than in a single-store POS. This reduces the stale-claim window.

**Warning signs:**
- New merchant lands on dashboard and sees empty state or permission errors on first login
- Plan upgrade takes "a while" to take effect in the UI
- No `supabase.auth.refreshSession()` call in the signup wizard completion handler
- No version/timestamp mechanism to detect stale claims

**Phase to address:** Phase 1 (Tenant Provisioning) and Phase 3 (Feature Gating / Billing).

---

### Pitfall 3: Stripe Webhook Routing Confusion — Billing Events Mixed with Payment Events

**What goes wrong:**
The existing app already has a Stripe webhook endpoint handling `checkout.session.completed` for online storefront sales. Adding subscription billing (merchant pays for a plan) introduces new events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`. These are sent to the same webhook endpoint. Without explicit event-type routing, a subscription invoice event can accidentally trigger the POS order-creation logic, or a POS sale event can be mistaken for a subscription event.

**Why it happens:**
Stripe sends all events from a single account to the same webhook endpoint URL by default. The existing handler was written for one event type. Adding a second product category to the same handler without clean routing creates a branching mess that is hard to test and easy to break.

**How to avoid:**
Create a separate webhook endpoint for billing events: `/api/webhooks/stripe-billing` (distinct from the existing `/api/webhooks/stripe`). Register separate webhook endpoints in the Stripe Dashboard — one for payment events (`checkout.session.completed`, `payment_intent.*`), one for billing events (`customer.subscription.*`, `invoice.*`). Each endpoint has its own signing secret. This keeps the two domains of logic fully independent and testable in isolation.

If consolidating to one endpoint is required, implement a strict event-type dispatch table at the top of the handler before any business logic, and ensure each branch is isolated — no shared mutable state.

**Warning signs:**
- Single webhook handler with a growing `if (event.type === ...)` chain handling both payment and subscription events
- No separate signing secret for billing events
- Billing and POS logic share helper functions with side effects

**Phase to address:** Phase 3 (Stripe Subscriptions). Plan the endpoint split before writing any subscription webhook logic.

---

### Pitfall 4: Wildcard Subdomain SSL Requires Vercel Nameserver Delegation

**What goes wrong:**
Developer adds a wildcard domain `*.nzpos.co.nz` to Vercel expecting it to work like a regular domain. Wildcard SSL certificates require Vercel to manage DNS challenges. If the apex domain (`nzpos.co.nz`) nameservers are not pointed at Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`), wildcard SSL provisioning fails silently. Merchant subdomains like `mystore.nzpos.co.nz` return SSL errors.

**Why it happens:**
Regular (non-wildcard) domain SSL on Vercel works via a CNAME pointing to `cname.vercel-dns.com` without full NS delegation. Wildcards require ACME DNS-01 challenge verification, which requires control of the DNS zone — only possible if Vercel manages the nameservers. This distinction is not obvious to developers who have successfully added non-wildcard domains before.

**How to avoid:**
Before buying/configuring the SaaS domain:
1. Point the apex domain's nameservers to `ns1.vercel-dns.com` and `ns2.vercel-dns.com` at the registrar level.
2. Add the wildcard domain in Vercel project settings.
3. Verify wildcard SSL is provisioned (Vercel dashboard shows "Valid Configuration").
4. Test with a real subdomain — `test.nzpos.co.nz` — before building any tenant routing code.

Note: Full NS delegation means Vercel manages all DNS records for the domain (A, MX, TXT). Plan any email (e.g., support@nzpos.co.nz) accordingly by adding MX records via Vercel's DNS management.

**Warning signs:**
- Domain CNAME points to Vercel but nameservers remain at the registrar
- Wildcard domain shows as "Invalid" in Vercel dashboard
- Testing only via direct IP or localhost — never via actual subdomain

**Phase to address:** Phase 1 (Infrastructure Setup). Verify wildcard SSL works end-to-end before building tenant routing middleware.

---

### Pitfall 5: Custom Domain Verification UX — Merchants Get Stuck

**What goes wrong:**
A merchant adds their custom domain (`shop.example.com`). The app calls Vercel's Domains API to register it. Vercel returns verification instructions (DNS records to add). The merchant adds the CNAME to their DNS provider. DNS propagation takes 0–48 hours. During this window, the merchant's domain returns a Vercel error page. There is no status feedback in the admin UI. Merchant raises a support ticket assuming the integration is broken.

**Why it happens:**
Custom domain activation is asynchronous and depends on external DNS propagation outside the app's control. Most implementations add the domain and redirect the merchant to a "done" screen, without building the polling/status-check loop that shows current verification state.

**How to avoid:**
1. After domain submission, poll Vercel's domain config endpoint every 30 seconds and update a `custom_domain_status` column (`pending_verification` → `active` | `failed`).
2. Show the merchant the exact DNS record they need to add (CNAME target, type, TTL) — copy-paste ready, not described in prose.
3. Show a live status indicator: "Waiting for DNS propagation (this can take up to 48 hours)."
4. Send an email when the domain activates (or fails after 72 hours).
5. Handle the case where the merchant adds the wrong record — surface Vercel's verification error details, not a generic "pending" state.

**Warning signs:**
- Custom domain UX is "enter domain → success screen" with no verification feedback
- No `custom_domain_status` field in the `stores` table
- No background job polling domain verification state

**Phase to address:** Phase 5 (Custom Domains add-on). This is the entire UX of the feature — if verification feedback is absent, the feature is broken from a merchant's perspective.

---

### Pitfall 6: Feature Gating Client-Side Only — Bypassed by Disabling JavaScript

**What goes wrong:**
Feature gates are implemented as React components: `if (plan !== 'pro') return <UpgradePrompt />`. The underlying data is fetched server-side and the full response is returned to the client. Users with basic plans can open DevTools, inspect the API response, or manipulate client state to see gated data. For Xero integration: the sync UI is hidden but the Xero OAuth endpoint is publicly accessible.

**Why it happens:**
UI-layer gating is fast and feels "complete." Server-side gating of every route and API call feels repetitive. Developers ship the UI gate and defer the API gate.

**How to avoid:**
The UI gate is acceptable as a UX improvement only. The enforcement gate must be server-side:
- Server Components: check plan tier before fetching gated data at all
- Server Actions: validate entitlement before executing any operation
- Route Handlers: return 403 if the caller's plan doesn't include the feature
- Database: RLS policies can enforce read access to feature-specific tables

Centralise the entitlement check into a single function:
```typescript
// lib/entitlements.ts
export async function assertFeature(storeId: string, feature: Feature) {
  const plan = await getStorePlan(storeId); // reads from stores table
  if (!PLAN_FEATURES[plan].includes(feature)) {
    throw new Error('Feature not available on current plan');
  }
}
```
Call `assertFeature()` at the top of every Server Action and Route Handler that powers a gated feature. This single call is the enforcement gate; the UI component is cosmetic.

**Warning signs:**
- Feature gates are only in `<FeatureGate>` client components
- Gated Route Handlers don't validate the caller's plan
- The Xero OAuth callback (`/api/xero/callback`) has no plan check
- `if (plan === 'pro')` scattered across component files with no central authority

**Phase to address:** Phase 3 (Feature Gating). Build the server-side entitlement check before shipping any paid feature. The UI gates can come after.

---

### Pitfall 7: RLS Policies Not Updated for New Multi-Store Owner Model

**What goes wrong:**
The existing RLS policies were written for a single-tenant model: one owner per store, JWT claim `store_id` must match. Under SaaS, the same owner may own multiple stores (edge case but valid). A super admin needs to query any store's data. The existing policies block both scenarios: the owner can't see their second store, and the super admin panel returns empty results or requires bypassing RLS with `service_role` (which removes all safety guards).

**Why it happens:**
v1 policies hardcode a `store_id = JWT_store_id` equality check. This worked perfectly for single-store. Multi-store ownership and super-admin access are new requirements that the policies don't accommodate. Retrofitting policies onto live data is high-risk.

**How to avoid:**
Design the v2 RLS policies before any data migration:

1. **Owner multi-store access:** Store multiple `store_id`s in `app_metadata` as an array, or add a `store_memberships` table and join against it in a security-definer function (not directly in the policy — see Pitfall 4 from the v1 research on join cost). Alternatively, owner resolves store context at login/store-switch and the JWT contains the currently active `store_id`.

2. **Super admin access:** Add a `is_super_admin` claim to `app_metadata`. RLS policy becomes:
   ```sql
   CREATE POLICY "store_isolation" ON orders
     USING (
       (auth.jwt() ->> 'is_super_admin')::boolean = true
       OR store_id = (auth.jwt() ->> 'store_id')::uuid
     );
   ```
   This allows super admins through without bypassing RLS entirely, keeping the audit trail intact.

3. Never use `service_role` in the super admin panel's data queries. Use a super-admin-scoped JWT instead.

**Warning signs:**
- Super admin panel uses `supabaseAdmin` (service role client) for all queries
- No `is_super_admin` claim defined in the JWT structure
- Existing RLS policies haven't been reviewed for multi-store compatibility

**Phase to address:** Phase 1 (Multi-Tenant Infrastructure) — RLS policy update must happen in the same migration as the tenant provisioning schema changes.

---

### Pitfall 8: Tenant Provisioning Race Condition — Merchant Lands on Empty Store

**What goes wrong:**
Signup flow: (1) Supabase Auth creates user → (2) Server Action creates `stores` record → (3) Server Action updates `app_metadata` with `store_id` → (4) Server Action calls `refreshSession()` → (5) Merchant redirected to dashboard. If step 2 or 3 fails silently (Supabase insert error swallowed, network timeout), the merchant has an auth account but no store. The dashboard loads with no data and no error message. The merchant is stuck — they can't provision again without support intervention.

**Why it happens:**
Signup flows are often optimistic: "if we got here, everything worked." The individual steps are not transactional from the application's perspective. Supabase Auth signup and Postgres inserts are independent operations — there is no automatic rollback if the store creation fails.

**How to avoid:**
1. Wrap the entire provisioning sequence (create store, assign store_id to user) in a single Postgres RPC function (`provision_new_store(user_id, store_name, slug)`) that executes atomically. If the function fails, nothing is created.
2. Before redirecting to the dashboard, verify the session contains the `store_id` claim. If missing, show a "Setup incomplete — retry" screen with a manual retry button that calls the provision endpoint again.
3. Make the provision function idempotent: if the user already has a store, return the existing store_id rather than creating a duplicate.
4. Add a `provision_status` column to `stores` (`pending` | `active` | `failed`) and only redirect to the dashboard when status is `active`.

**Warning signs:**
- Signup is a multi-step sequential Server Action with no rollback logic
- No verification that `store_id` is in the session before redirecting to the dashboard
- No "provisioning failed — retry" screen in the signup flow

**Phase to address:** Phase 2 (Merchant Self-Serve Signup). This is the most critical flow to get right — a broken signup is the first impression for every merchant.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single Stripe webhook endpoint for both payment and billing events | Less infrastructure | Routing bugs when adding billing events; accidental cross-domain side effects | Never — split endpoints from day one |
| Middleware-only tenant resolution (no JWT claim check) | Less code | Cross-tenant data leak if middleware is bypassed | Never — JWT claim is always the authority |
| Service role client in super admin panel | Simple queries, bypasses RLS | No audit trail, any bug leaks all tenant data | Only for DDL/migrations in trusted scripts — never in web request handlers |
| Scatter `if (plan === 'pro')` UI checks without server-side enforcement | Fast to ship | Gating is bypassable; adding server enforcement later touches every gated feature | Acceptable as supplementary UX — never as sole enforcement |
| Store plan tier in `app_metadata` JWT claim only (no `stores` table column) | Single source of truth | JWT is stale for up to 1hr after plan change; can't query current plan server-side without decoding JWT | Never — store plan in `stores` table as authoritative source, JWT claim as cached fast-path |
| Use `service_role` in dev for convenience, switch to anon in prod | Faster dev iteration | RLS bugs hidden in dev, discovered in prod | Never — always test with the same auth level as production |
| Hardcode `store_id` in seed data for testing | Tests run fast | Never tests actual tenant isolation | Acceptable in unit tests; never in integration or E2E tests |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Vercel Domains API | Call `addDomain()` and assume it's immediately active | Poll `getDomainConfig()` every 30s; surface verification status to merchant; only mark as `active` when Vercel confirms DNS is valid |
| Vercel Domains API | Store only the domain string, not the Vercel-assigned verification records | Store the full verification record set (CNAME target, TXT name/value) in `stores.domain_verification` so the UI can re-display them without re-fetching |
| Stripe Billing | Create a Stripe Customer per subscription checkout session | Create one Stripe Customer per merchant store at provisioning time; store `stripe_customer_id` on `stores` table; reuse it for all subscriptions and Portal sessions |
| Stripe Billing | Use Stripe Checkout `mode: 'payment'` for subscriptions | Use `mode: 'subscription'`; subscriptions require recurring prices configured in Stripe Dashboard, not ad-hoc amounts |
| Stripe Customer Portal | Build a custom subscription management UI | Use Stripe Customer Portal (`stripe.billingPortal.sessions.create()`); it handles upgrades, downgrades, cancellations, and invoice history with zero frontend code |
| Stripe Webhooks (billing) | Trust `subscription.status` from the checkout success redirect | Only trust the `customer.subscription.created` webhook to activate features; the redirect can be replayed or manipulated; never update plan tier on redirect alone |
| Supabase Auth | Call `updateUserById` with `app_metadata` changes from a Server Action and assume the next client request sees the new claims | Force `supabase.auth.refreshSession()` from the client immediately after any `app_metadata` change; the current JWT is immutable until refreshed |
| Supabase Auth Hook | Write the custom access token hook without handling the case where the user has no `store_id` yet (during signup) | Hook must handle null `store_id` gracefully — return an empty string or omit the claim during the provisioning window rather than throwing |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Resolving tenant from DB on every middleware execution | Acceptable at 10 tenants; 50–200ms latency added per request at 1,000 tenants | Resolve tenant from subdomain slug directly (slug → store_id mapping cached in Vercel Edge Cache or KV); never DB-hit in middleware | 100+ tenants with high traffic |
| No index on `stores.subdomain_slug` | Middleware or Server Action does `SELECT id FROM stores WHERE subdomain_slug = $1`; full table scan | `CREATE UNIQUE INDEX ON stores(subdomain_slug)` — add in the same migration that creates the `stores` table | 500+ stores |
| Feature entitlement check reads `stores` table on every gated Server Action call | Works fine with few merchants; adds DB round-trip to every request | Cache plan tier in JWT claim (short-TTL); use the claim as the fast path, DB only on cache miss or claim staleness | 1,000+ concurrent users |
| No index on `stores.custom_domain` | Custom domain resolution does full table scan | `CREATE UNIQUE INDEX ON stores(custom_domain) WHERE custom_domain IS NOT NULL` | 200+ stores with custom domains |
| Super admin panel loads all stores with no pagination | Dashboard is instant at 10 stores; 30s timeout at 10,000 | Paginate super admin queries from day one; default page size 50 | 500+ stores |
| Storing Stripe subscription status in JWT claim | Avoids one DB query | Subscription cancellation doesn't take effect for up to 1hr; merchants keep access after cancellation | Every cancelled subscription |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Super admin route accessible to any authenticated user | Any merchant can access all tenant data, billing, and impersonation tools | Protect all `/admin/super-*` routes behind `is_super_admin` JWT claim check in middleware AND in every Route Handler / Server Action — dual enforcement required |
| Stripe webhook endpoint accepts requests without signature verification | Attacker crafts fake `customer.subscription.updated` events to unlock premium features without paying | Always call `stripe.webhooks.constructEvent(body, rawSignature, secret)` before processing; reject any event that fails verification |
| `service_role` key exposed in client bundle | Full RLS bypass for any user who extracts the key | `service_role` key must only appear in server-side code; use `server-only` package import guard; never prefix with `NEXT_PUBLIC_`; rotate if ever committed to git |
| Tenant slug chosen by merchant with no sanitisation | Merchant registers slug `api`, `admin`, `www`, `static` — collides with platform routes | Blocklist reserved slugs at signup validation: `['api', 'admin', 'www', 'app', 'mail', 'support', 'help', 'billing', 'static', 'assets']`; enforce with Zod in the signup Server Action |
| Custom domain added without ownership verification | Merchant adds `competitor.co.nz` as their custom domain — hijacks competitor's traffic to their store | Use Vercel's domain verification (CNAME or TXT record the merchant must add); only mark domain as `active` once Vercel confirms ownership |
| Super admin impersonation leaves no audit trail | Admin performs destructive action on a merchant account; no record of who did it | Log every super admin action (user viewed, store modified, feature toggled) to an `admin_audit_log` table with `admin_user_id`, `target_store_id`, `action`, `timestamp` |
| Free tier allows unlimited store creation per email | Bot creates 10,000 stores for storage/compute abuse | Rate limit store creation to 1 store per verified email; require email verification before provisioning; add CAPTCHA on signup |
| Billing webhooks not idempotent | `customer.subscription.updated` fires twice (Stripe retry) — plan toggled on/off | Apply same idempotency pattern from v1: `stripe_billing_events` table with unique `stripe_event_id`; check before processing |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Subdomain availability check only at form submit | Merchant types long store name, submits, finds slug taken, starts over | Debounced real-time slug availability check (`/api/check-slug?slug=...`) as merchant types the store name field |
| Redirect to empty dashboard immediately after signup | Merchant sees a blank screen while provisioning completes asynchronously | Show a "Setting up your store..." progress screen with explicit steps; redirect only after `stores.provision_status = 'active'` is confirmed |
| Subscription upgrade shows Stripe Checkout then dumps merchant back on `/dashboard` with no confirmation | Merchant unsure whether the upgrade worked | After Stripe Checkout success redirect, show a "Plan upgraded" confirmation screen; verify the webhook has fired by polling `stores.plan` before showing the screen |
| Feature lock UI shows only "Upgrade to Pro" with no explanation | Merchant doesn't know what they'll get | Show exactly what the feature does and the price before upselling; link to a plan comparison page |
| Custom domain instructions given once then buried | Merchant can't find DNS records when they're ready to add them | Custom domain settings page always shows current verification status + the exact DNS records needed, even after activation |
| Super admin can toggle merchant features with no confirmation | Accidental clicks break live stores | Require explicit confirmation modal for any destructive super admin action ("This will disable Xero sync for [store name]. Confirm?") |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Tenant isolation:** Middleware resolves tenant slug — but verify JWT claim is actually enforced in every Server Action, not just read from the header
- [ ] **Feature gating:** UI gate hides the feature — but verify the underlying Route Handler / Server Action returns 403 for unpaid plans
- [ ] **Stripe subscriptions:** Checkout flow completes — but verify `customer.subscription.created` webhook updates `stores.plan` before the merchant accesses the feature
- [ ] **Custom domains:** Domain added in Vercel — but verify SSL certificate is provisioned (not just "pending"), DNS resolves correctly, and the store loads over HTTPS
- [ ] **Merchant signup:** Signup form submits successfully — but verify `stores` record was created, `store_id` is in the JWT, and the dashboard loads data (not empty state)
- [ ] **Super admin panel:** Queries return data — but verify it is using a super-admin-scoped JWT (not service role), and the audit log records every action
- [ ] **Slug reservation:** Slug blocklist exists in Zod schema — but verify it is also enforced server-side (not just client-side validation)
- [ ] **Billing idempotency:** Subscription webhooks processed — but verify a duplicate event delivery does not toggle the plan twice
- [ ] **RLS migration:** New policies deployed — but verify cross-tenant isolation test passes with two separate store sessions
- [ ] **Store setup wizard:** All steps complete — but verify a partial completion (browser closed mid-wizard) leaves the store in a recoverable state, not a corrupted half-provisioned state

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cross-tenant data leak discovered | HIGH | Rotate Supabase JWT secret (forces all users to re-authenticate); audit query logs for affected rows; notify affected merchants per Privacy Act 2020 (NZ); patch RLS policy; re-run isolation tests |
| Stripe webhook routing confusion causing wrong plan activations | MEDIUM | Audit `stripe_billing_events` table for mis-routed events; manually correct `stores.plan` for affected merchants; add event-type routing; re-process affected events with corrected handler |
| Wildcard SSL not provisioning | LOW | Verify NS delegation at registrar; remove and re-add wildcard domain in Vercel; allow 24h for propagation; test with `dig +short test.domain.com` |
| Merchant stuck with no store_id claim | LOW | Super admin panel: manually trigger provision retry for affected `user_id`; or: Supabase dashboard → Auth → update `app_metadata` directly |
| Stale JWT plan claim after subscription change | LOW | Merchant logs out and back in; or super admin forces session invalidation; long-term: shorten JWT lifetime |
| Tenant slug collision with platform route | MEDIUM | Add slug to blocklist; contact affected merchant to choose new slug; migrate subdomain; update any stored URLs in merchant's store data |
| Service role key accidentally committed to git | CRITICAL | Rotate key immediately in Supabase dashboard (invalidates all existing service role tokens); audit git history for any usage; review server-side code for exposure |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Middleware-only tenant isolation | Phase 1: Multi-Tenant Infrastructure | Cross-tenant isolation E2E test passes with two separate stores; middleware bypass test (send `x-store-id` header directly to API route) returns 403 |
| Stale JWT claims after provisioning | Phase 1 (provisioning) + Phase 3 (billing) | New merchant can access dashboard immediately after signup; plan change reflected within 1 page reload |
| Stripe webhook routing confusion | Phase 3: Stripe Subscriptions | Separate webhook endpoints registered; duplicate event delivery test; POS sale does not affect subscription state |
| Wildcard SSL configuration | Phase 1: Infrastructure Setup | `https://test.nzpos.co.nz` resolves with valid SSL before any tenant routing code is written |
| Custom domain verification UX | Phase 5: Custom Domains | Merchant can add domain, see DNS instructions, see live verification status, and receive email on activation |
| Client-only feature gating | Phase 3: Feature Gating | Postman/curl request to gated Route Handler without pro plan returns 403; UI gate is supplementary only |
| RLS policies not updated for super admin | Phase 1: Multi-Tenant Infrastructure | Super admin can query all stores via RLS-scoped JWT (not service role); non-admin cannot see other stores' data |
| Tenant provisioning race condition | Phase 2: Merchant Signup | Simulate slow DB insert during signup; verify dashboard shows error-with-retry, not empty state |
| Reserved slug collision | Phase 2: Merchant Signup | Attempt to register slug `api` and `admin`; verify Zod validation and server-side check both reject |
| Free tier signup abuse | Phase 2: Merchant Signup | Rate limit test: 5 signups from same IP in 1 minute should be blocked |

---

## Sources

- Supabase Custom Access Token Hook (official docs): https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- Supabase Custom Claims & RBAC (official docs): https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- Supabase RLS (official docs): https://supabase.com/docs/guides/database/postgres/row-level-security
- CVE-2025-29927 Next.js Middleware Bypass (Snyk): https://snyk.io/blog/cve-2025-29927-authorization-bypass-in-next-js-middleware/
- CVE-2025-29927 Technical Analysis (ProjectDiscovery): https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass
- Next.js Middleware: Not recommended as sole auth guard (official docs): https://nextjs.org/docs/app/guides/authentication
- Vercel Domain Management for Multi-Tenant (official docs): https://vercel.com/docs/multi-tenant/domain-management
- Vercel Wildcard Domain Configuration: https://vercel.com/platforms/docs/multi-tenant-platforms/configuring-domains
- Building Custom Domain Management with Vercel API: https://dev.to/toumi_abderrahmane_f07d5b/building-custom-domain-management-with-vercel-api-the-good-the-bad-and-the-dns-propagation-3fp7
- Stripe Webhook Best Practices (official docs): https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe Customer Portal Integration (official docs): https://docs.stripe.com/customer-management/integrate-customer-portal
- Multi-Tenant Leakage: When Row-Level Security Fails (Medium): https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c
- Feature Gating in SaaS Without Duplicating Components (DEV Community): https://dev.to/aniefon_umanah_ac5f21311c/feature-gating-how-we-built-a-freemium-saas-without-duplicating-components-1lo6
- Feature gating patterns in a multi-tenant Next.js SaaS (Hacker News discussion): https://news.ycombinator.com/item?id=47262864
- Subdomain-Based Routing in Next.js (Medium): https://medium.com/@sheharyarishfaq/subdomain-based-routing-in-next-js-a-complete-guide-for-multi-tenant-applications-1576244e799a
- Multi-tenant leakage: Architectural failure modes (InstaTunnel): https://instatunnel.my/blog/multi-tenant-leakage-when-row-level-security-fails-in-saas
- Stripe Subscriptions: Things to avoid (Medium): https://medium.com/@harisbakhabarpk/things-you-should-avoid-while-integrating-stripe-subscriptions-28c9d1974308
- How to Secure Supabase Service Role Key (Chat2DB): https://chat2db.ai/resources/blog/secure-supabase-role-key
- Supabase Multi-Tenant + Next.js subdomain discussion (GitHub): https://github.com/vercel/next.js/discussions/84461

---
*Pitfalls research for: v2.0 SaaS conversion of NZPOS (single-tenant Next.js + Supabase → multi-tenant SaaS)*
*Researched: 2026-04-03*
