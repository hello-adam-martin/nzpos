# Phase 13: Merchant Self-Serve Signup - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A new merchant can visit the signup page on the root domain, enter their email, password, store name, and store slug, and land on a working admin dashboard for their provisioned store within minutes. Provisioning is atomic. Email verification is required before dashboard access. Rate limiting and reserved slug protection prevent abuse.

</domain>

<decisions>
## Implementation Decisions

### Signup Form & UX
- **D-01:** 4 fields: email, password, store name, store slug. Slug auto-generated from store name (slugify) with manual edit option.
- **D-02:** Live slug availability check — debounced API call on keystroke shows inline availability status (green checkmark or "taken"). Standard SaaS pattern.
- **D-03:** Signup page lives at root domain `/signup` (nzpos.co.nz/signup). Already has a placeholder at `src/app/signup/page.tsx`.

### Provisioning & Atomicity
- **D-04:** Atomic provisioning via Postgres RPC function (`provision_store`). Single transaction creates store + staff (owner role) + store_plans row. If any step fails, all roll back. Auth user created first via Supabase Auth, then RPC called. If RPC fails, delete the auth user.
- **D-05:** After form submit, redirect to `/signup/provisioning` loading page that shows progress steps ("Creating your store...", "Setting up dashboard..."). Polls or waits for completion, then redirects to `{slug}.{domain}/admin/dashboard`.
- **D-06:** If provisioning fails mid-flight, show clear error message with "Retry provisioning" button. Auth user already exists, so retry only re-runs the DB provisioning RPC. No need to re-enter the form.

### Email Verification Gate
- **D-07:** Hard gate — merchant CANNOT access admin dashboard until email is verified. Middleware checks `email_confirmed_at` on the session. Unverified users are redirected to the verification screen.
- **D-08:** After clicking the verification link, merchant is redirected directly to their store's admin dashboard (`{slug}.{domain}/admin/dashboard`). First real interaction with their new store.
- **D-09:** Verification screen shows "We sent a verification email to {email}" with a Resend button (rate-limited) and a "Wrong email? Change it" link. Existing `resendVerification.ts` action can be adapted.

### Slug Validation & Reserved Slugs
- **D-10:** Reserved slugs managed as a hardcoded TypeScript constant array (admin, www, api, app, signup, login, support, billing, help, docs, status, etc.). Checked in slug validation function. Version-controlled, easy to extend.
- **D-11:** Strict slug rules: 3-30 characters, lowercase alphanumeric + hyphens only. Must start with a letter, no consecutive hyphens, no leading/trailing hyphens. Subdomain-safe format.

### Rate Limiting
- **D-12:** Rate limiting at the Server Action level: max 5 signup attempts per IP per hour, 1 store per verified email ever. In-memory rate limiter (no Redis needed at v2.0 scale). Supabase Auth already rate-limits `auth.signUp` calls.

### Claude's Discretion
- Exact reserved slug list contents (must include at minimum: admin, www, api, app, signup, login, support, billing)
- Loading page animation/design on provisioning screen
- Exact error messages and copy
- Slug availability check debounce timing
- In-memory rate limiter implementation details
- Whether to use polling or server-sent events for provisioning status
- Verification email template customization (if Supabase allows)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Signup Code (to be rewritten)
- `src/actions/auth/ownerSignup.ts` — Current v1 owner signup action. Must be rewritten for atomicity (RPC), slug handling, store_plans row, email verification flow.
- `src/app/signup/page.tsx` — Placeholder signup page. Must be rebuilt with 4-field form + live slug check.
- `src/actions/auth/resendVerification.ts` — Existing resend verification action. Adapt for the new verification screen.

### Auth & Middleware
- `src/middleware.ts` — Current tenant resolution middleware. Must add email verification gate (check `email_confirmed_at`, redirect unverified users).
- `src/lib/resolveAuth.ts` — Server-side auth resolution. Used to check session state.
- `src/lib/supabase/server.ts` — Server-side Supabase client factory.
- `src/lib/supabase/admin.ts` — Admin client (service_role, bypasses RLS). Used for provisioning RPC call.

### Database & Schema
- `supabase/migrations/014_multi_tenant_schema.sql` — Multi-tenant schema with stores.slug, store_plans table, is_active column. Provisioning RPC must create rows compatible with this schema.
- `supabase/migrations/015_rls_policy_rewrite.sql` — Current RLS policies. New RPC function must work within these policies (or use SECURITY DEFINER).
- `supabase/seed.ts` — Current seed data. Reference for store + staff + store_plans row creation pattern.

### Types
- `src/types/database.ts` — Generated Supabase types. Must be regenerated after adding the provisioning RPC function.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/actions/auth/ownerSignup.ts` — Current signup flow (create auth user + store + staff). Logic will be rewritten but the overall pattern is established.
- `src/actions/auth/resendVerification.ts` — Resend email verification action. Can be adapted for the new verification screen.
- `src/lib/supabase/admin.ts` — Admin client for service_role operations. Used for provisioning RPC.
- `src/lib/tenantCache.ts` — In-memory tenant cache with TTL. Slug-to-storeId mapping already works.

### Established Patterns
- Server Actions with Zod validation (`z.safeParse()` before any DB operation)
- Admin client (service_role) for operations that bypass RLS
- Middleware-based route protection (session check, redirect to login)
- Supabase Auth for email/password with JWT custom claims via auth hook

### Integration Points
- Middleware (`src/middleware.ts`): Must add email verification check for store subdomains
- Root domain routing: `/signup` is on root domain (isRoot path in middleware passes through)
- Auth hook (`supabase/migrations/003_auth_hook.sql`): Already injects store_id + role into JWT. New stores will work automatically after provisioning.
- Tenant cache: New store slug will be cacheable immediately after provisioning

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-merchant-self-serve-signup*
*Context gathered: 2026-04-03*
