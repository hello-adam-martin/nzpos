# Phase 20: Deployment + User Documentation - Research

**Researched:** 2026-04-04
**Domain:** Production deployment runbooks and merchant-facing documentation (documentation-writing phase, no code changes)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Deployment Runbook Structure**
- D-01: Single `docs/deploy.md` file with linear top-to-bottom flow: (1) Supabase production setup, (2) Stripe live key configuration, (3) Vercel production deploy with wildcard DNS, (4) Post-deploy smoke test checklist. One doc, one flow.
- D-02: Audience is the founder — someone technical enough to use Supabase dashboard and Vercel, but not a DevOps engineer. Clear steps, no assumed infrastructure knowledge.
- D-03: Text-only instructions referencing dashboard field names. No screenshots — dashboards change frequently, screenshots go stale.
- D-04: Step-by-step DNS guide for wildcard subdomain setup including NS record delegation to Vercel, propagation verification, and wildcard SSL. This was flagged as a known concern in STATE.md.
- D-05: Manual markdown checkbox checklist within `docs/deploy.md` (not a separate file, not scripted). Walk through it after each deploy.
- D-06: Critical path only — 6 checks matching DEPLOY-04: merchant signup, product creation, POS sale, online order + Stripe payment, Xero sync trigger, email notification delivery. No edge cases.
- D-07: Lives at `docs/merchant-guide.md` alongside dev docs. Markdown file that could later be rendered as in-app help.
- D-08: Friendly walkthrough tone — conversational, step-by-step, like showing a friend. Numbered steps with expected outcomes.
- D-09: Full journey: signup -> store setup wizard -> add first product -> complete first POS sale -> place first online order. Matches USER-01 exactly.
- D-10: Store setup wizard steps documented inline with detail (business info, logo upload, checklist) — this is the merchant's first experience.
- D-11: GST explanation is a dedicated section within `docs/merchant-guide.md`, not a separate file.
- D-12: Plain English with worked examples, no formulas. "All prices include GST. When you enter $23.00, NZPOS knows $3.00 is GST." Include an example with discounts applied.
- D-13: Brief legal disclaimer: "NZPOS calculates GST automatically but is not tax advice — consult your accountant for your specific obligations."

### Claude's Discretion
- Claude determines the exact Supabase migration application order and seed data steps
- Claude determines the Stripe webhook endpoint registration steps and live vs test key separation detail
- Claude determines Vercel env var listing and middleware verification steps
- Claude determines the specific worked GST example numbers and discount scenario
- Claude determines whether the smoke test checklist needs sub-steps per check

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | Production Supabase setup guide (project creation, migrations, seed data, auth config) | Migration order documented below; auth hook config, storage bucket setup, super admin seed data identified from codebase |
| DEPLOY-02 | Stripe live key configuration checklist (webhook endpoint, keys, verification) | Two webhook endpoints confirmed: `/api/webhooks/stripe` uses `STRIPE_WEBHOOK_SECRET`, `/api/webhooks/stripe/billing` uses `STRIPE_BILLING_WEBHOOK_SECRET` — both must be registered separately |
| DEPLOY-03 | Vercel production config guide (wildcard DNS, env vars, middleware verification) | Wildcard DNS requires NS delegation (not CNAME); 24 env vars identified from `.env.example`; ROOT_DOMAIN + NEXT_PUBLIC_ROOT_DOMAIN must match |
| DEPLOY-04 | Post-deploy smoke test checklist (signup, product, POS sale, online order, Stripe, Xero) | 6 critical path checks identified; middleware behavior, JWT refresh, cron schedules all documented |
| USER-01 | Merchant onboarding guide (signup → first product → first sale → first online order) | Setup wizard flow documented (migration 018); middleware auto-redirects to `/admin/setup` on first visit; store setup wizard tracked via `setup_wizard_dismissed` flag |
| USER-02 | GST compliance explanation for merchants (how NZPOS handles 15% tax-inclusive, IRD-compliant) | `gst.ts` source of truth: `Math.round(lineTotal * 3 / 23)` formula; per-line calculation on discounted amounts; worked examples computed below |
</phase_requirements>

---

## Summary

Phase 20 is a pure documentation-writing phase. No code changes. Two output files: `docs/deploy.md` (DEPLOY-01 through DEPLOY-04) and `docs/merchant-guide.md` (USER-01, USER-02). Both slot into the established `docs/` folder convention from Phase 19 and require entries in `docs/README.md`.

The primary technical complexity is not in the documentation tooling but in getting the content right. The codebase has been fully audited across Phases 17-19, so all source material exists and is accurate. The research task is to extract that source material into a form the planner can use to structure tasks that write the documentation — ensuring nothing critical is missed and the sequencing of steps matches how the system actually works.

The deployment runbook has one tricky domain: Vercel wildcard DNS requires NS record delegation, not a CNAME record. This is a known-complex topic flagged in STATE.md and confirmed by decision D-04. The documentation must explain NS delegation explicitly since a CNAME-only approach will silently fail wildcard SSL provisioning. This was the single production-blocking concern identified in STATE.md.

**Primary recommendation:** Write `docs/deploy.md` first (higher risk, more technical precision required), then `docs/merchant-guide.md`. Both must be written by reading the actual codebase — not from memory — to ensure field names, step sequences, and URLs are accurate.

---

## What This Phase Produces

This phase writes two Markdown files:

| File | Covers | Requirements |
|------|--------|--------------|
| `docs/deploy.md` | Production deploy runbook + smoke test | DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04 |
| `docs/merchant-guide.md` | Merchant onboarding + GST explanation | USER-01, USER-02 |

Plus one index update:

| File | Change |
|------|--------|
| `docs/README.md` | Add entries for `deploy.md` and `merchant-guide.md` |

---

## Architecture Patterns

### Established docs/ Conventions (from Phase 19)

The Phase 19 docs set the format standard. All Phase 20 docs must match.

**Structure:**
```
docs/
├── README.md          — index with table of all docs
├── setup.md           — local dev setup (Phase 19)
├── env-vars.md        — env var reference (Phase 19)
├── architecture.md    — architecture overview with Mermaid (Phase 19)
├── server-actions.md  — server action inventory (Phase 19)
├── deploy.md          — NEW: production deploy runbook (Phase 20)
└── merchant-guide.md  — NEW: merchant onboarding + GST (Phase 20)
```

**Formatting conventions:**
- H1 title, then `---` horizontal rule
- Sections use H2, subsections H3
- Tables for reference material (env vars, migration list, smoke test)
- Numbered steps for procedures
- Code blocks for bash commands and configuration values
- Blockquotes (`>`) for important callouts/warnings
- No screenshots (D-03)

**Tone:**
- `docs/setup.md` uses second-person, direct imperative ("Run this command")
- `docs/merchant-guide.md` should be warmer/conversational per D-08 ("You'll see a page that...")
- `docs/deploy.md` stays technical-direct like setup.md — audience is founder-as-deployer

---

## deploy.md Content Map

### Section 1: Supabase Production Setup (DEPLOY-01)

**What to cover:**

1. Create a new Supabase project at supabase.com (Organization → New Project)
2. Choose region closest to NZ — Australia (Sydney) ap-southeast-2 is the standard choice
3. Note the project ref (used for CLI linking and database URL construction)
4. Navigate to Settings → API to retrieve:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

5. Apply migrations in order (23 migrations, numbered 001-023):
   ```
   001_initial_schema.sql
   002_rls_policies.sql
   003_auth_hook.sql
   004_storage_bucket.sql
   005_pos_rpc.sql
   006_online_store.sql
   007_cash_sessions_fix.sql
   008_xero_integration.sql
   009_security_fixes.sql
   010_checkout_speed.sql
   011_notifications.sql
   012_customer_accounts.sql
   013_partial_refunds.sql
   014_multi_tenant_schema.sql
   015_rls_policy_rewrite.sql
   016_super_admin.sql
   017_provision_store_rpc.sql
   018_setup_wizard.sql
   019_billing_claims.sql
   020_super_admin_panel.sql
   021_security_audit_fixes.sql
   022_drop_anon_orders_policy.sql
   023_performance_indexes.sql
   ```
   Apply via Supabase CLI: `npx supabase db push --linked` (after `npx supabase link --project-ref <ref>`)
   OR paste directly in Supabase dashboard SQL Editor in order.

6. Auth configuration in Supabase dashboard:
   - Authentication → URL Configuration → Site URL: set to `https://yourdomain.com`
   - Authentication → URL Configuration → Redirect URLs: add `https://*.yourdomain.com/**`
   - Authentication → Email Templates: review confirm email, magic link templates
   - Authentication → Hooks: the `003_auth_hook.sql` migration installs the custom JWT claims hook — verify it appears in Authentication → Hooks → Custom Access Token

7. Storage buckets (created by migration 004 and 018):
   - `product-images` bucket (created by 004) — should appear automatically after migration
   - `store-logos` bucket (created by 018) — should appear automatically after migration
   - Verify both exist: Storage → Buckets

8. Seed production data — super admin user:
   ```sql
   -- Run in Supabase SQL Editor
   -- Create super admin user first via Authentication → Users → Add User
   -- Then set is_super_admin flag:
   UPDATE auth.users
   SET raw_app_meta_data = raw_app_meta_data || '{"is_super_admin": true}'
   WHERE email = 'your-super-admin@email.com';
   ```
   Note: The seed.ts script is for local development only. Production starts clean — merchants provision their own stores via signup.

**Key insight from codebase:** The custom JWT claims hook (migration 003) reads from `raw_app_meta_data` for `role` and `store_id`. The super admin check reads `app_metadata.is_super_admin`. Both must be set correctly for auth to work.

**From STATE.md (Phase 17):** JWT claims source is `raw_app_meta_data` not `user_metadata` — this matters for super admin flag placement.

### Section 2: Stripe Live Key Configuration (DEPLOY-02)

**What to cover:**

1. Switch from test to live mode in Stripe dashboard (top-right toggle)
2. Retrieve live API keys: Developers → API Keys
   - `sk_live_...` → `STRIPE_SECRET_KEY`
   - `pk_live_...` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

3. Create Stripe Products + Price IDs for add-on billing:
   - Xero integration add-on → `STRIPE_PRICE_XERO`
   - Email notifications add-on → `STRIPE_PRICE_EMAIL_NOTIFICATIONS`
   - Custom domain add-on → `STRIPE_PRICE_CUSTOM_DOMAIN`
   - Note the Price IDs (`price_...`) for env vars

4. Register Webhook Endpoint 1 (order payments):
   - Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for: `checkout.session.completed`
   - Save → copy signing secret (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`

5. Register Webhook Endpoint 2 (billing subscriptions) — SEPARATE endpoint:
   - Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/webhooks/stripe/billing`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Save → copy signing secret → `STRIPE_BILLING_WEBHOOK_SECRET`

6. Webhook replay verification:
   - Each webhook dashboard shows a "Send test webhook" button
   - After deploy: trigger a test event from the Stripe dashboard and verify it arrives at the Vercel function logs with status 200

**Critical from codebase:** The two webhook endpoints use DIFFERENT secrets (`STRIPE_WEBHOOK_SECRET` vs `STRIPE_BILLING_WEBHOOK_SECRET`). This is confirmed in both webhook route.ts files — mixing them causes `constructEvent()` to throw 400 on every request.

### Section 3: Vercel Production Deploy with Wildcard DNS (DEPLOY-03)

**The wildcard DNS problem (flagged in STATE.md as a known concern):**

Wildcard SSL on custom domains in Vercel requires NS record delegation, not a CNAME record. A standard CNAME for `*.yourdomain.com → cname.vercel-dns.com` is insufficient for Vercel to provision a wildcard SSL certificate. The correct approach is to delegate the domain's nameservers to Vercel.

**DNS configuration steps:**
1. In Vercel: Project → Settings → Domains → Add Domain → enter root domain (e.g. `nzpos.co.nz`)
2. Vercel displays NS records (e.g. `ns1.vercel-dns.com`, `ns2.vercel-dns.com`)
3. At your domain registrar (e.g. Cloudflare, GoDaddy, Domains.co.nz): change nameservers to Vercel's
4. Propagation: DNS NS changes take 24-48 hours globally (check with `dig NS yourdomain.com`)
5. Once propagated, Vercel auto-provisions wildcard SSL for `*.yourdomain.com`
6. Verify: visit `https://test.yourdomain.com` and confirm SSL cert is valid (shows as `*.yourdomain.com`)

**Env vars in Vercel:**
- Project → Settings → Environment Variables
- Add all 24 variables from `.env.example` with production values
- Critical production-specific values to set differently from local:
  - `NEXT_PUBLIC_SUPABASE_URL` → production Supabase project URL
  - `NEXT_PUBLIC_ROOT_DOMAIN` → `yourdomain.com` (no port, no lvh.me)
  - `ROOT_DOMAIN` → same as above
  - `NEXT_PUBLIC_BASE_URL` → `https://yourdomain.com`
  - `NEXT_PUBLIC_SITE_URL` → `https://yourdomain.com`
  - `XERO_REDIRECT_URI` → `https://yourdomain.com/api/xero/callback`
  - Both Stripe keys → live keys (not test `sk_test_...`)

**Middleware verification post-deploy:**
- Visit `https://yourdomain.com` → marketing page loads
- Visit `https://yourdomain.com/super-admin` → redirect to login
- Sign up a new merchant → subdomain routes to `https://their-slug.yourdomain.com`
- `x-store-id` header injection: use browser devtools Network tab to confirm responses on admin routes have the correct headers

**Cron jobs (vercel.json is already configured):**
- `/api/cron/xero-sync` — daily at 1pm UTC (1am NZT next day)
- `/api/cron/expire-orders` — daily at 2pm UTC
- `/api/cron/daily-summary` — daily at 7pm UTC (7am NZT next day)
- Verify `CRON_SECRET` is set in Vercel env vars — requests to `/api/cron/*` without this token return 401

**CSP note (from Phase 17 STATE.md):**
- CSP is currently `Content-Security-Policy-Report-Only` in middleware.ts
- Deployer should monitor browser console for CSP violations after go-live
- When stable, change to `Content-Security-Policy` header (requires a middleware.ts edit — not part of this phase's scope, but worth flagging in the deploy doc)

### Section 4: Post-Deploy Smoke Test Checklist (DEPLOY-04)

Six checks, manual markdown checkbox format, within deploy.md:

```
- [ ] 1. Merchant signup: Visit root domain → sign up with a new email → email confirmation arrives → store subdomain resolves correctly
- [ ] 2. Product creation: Log into admin dashboard → add a new product with price and stock → product appears in storefront
- [ ] 3. POS sale: Open /pos → log in with staff PIN → complete a sale → stock decrements
- [ ] 4. Online order + Stripe payment: Add product to cart on storefront → proceed to Stripe checkout (live keys) → complete payment → order appears in admin orders
- [ ] 5. Xero sync trigger: Admin → Xero → trigger manual sync → no errors returned (or trigger cron endpoint manually with CRON_SECRET)
- [ ] 6. Email notification: Order confirmation email arrives at customer email address after step 4
```

Each check may need 1-2 sub-steps explaining what "success looks like" — this is Claude's discretion per the CONTEXT.md.

---

## merchant-guide.md Content Map

### Section 1: Welcome / Overview

Brief intro: what NZPOS does, what this guide covers. 2-3 sentences, friendly tone.

### Section 2: Creating Your Account (signup flow)

- Visit the NZPOS website
- Click "Start your free trial" / sign up form
- Enter business name, email, password
- Check email for verification link — must click before admin access works
- After verification → redirected to subdomain store

**Expected outcome:** "You'll see your new store dashboard at your-store-name.nzpos.co.nz"

### Section 3: Store Setup Wizard (first admin visit)

The middleware auto-redirects any owner whose `setup_wizard_dismissed = false` to `/admin/setup`. This is the first experience.

Document the wizard steps (from migration 018 and setup wizard pages):
- Business information: store name, address, phone, GST number
- Logo upload: drag-and-drop or click to upload, stored in `store-logos` Supabase bucket
- The wizard tracks completed steps via `setup_completed_steps` integer field
- When all steps complete, `setup_wizard_dismissed` is set to true, normal admin access resumes

**Expected outcome at each step:** Tell merchant what they'll see ("You'll see a tick next to each step as you complete it")

### Section 4: Adding Your First Product

- Admin → Products → New Product
- Required fields: name, price (enter GST-inclusive, e.g. $23.00), stock quantity
- Optional: category, description, image
- Save → product appears on storefront immediately

**Expected outcome:** "Your product now shows on your online store"

### Section 5: Completing Your First POS Sale

- Open `yourstorename.nzpos.co.nz/pos` on iPad or any browser
- Log in with staff PIN (set up in Admin → Staff)
- Find product in grid or search → tap to add to cart
- Apply discount if needed
- Tap "Complete Sale" → choose payment method (cash or EFTPOS)
- For EFTPOS: enter amount on terminal, tap "Confirm Payment" in NZPOS when terminal approves
- Receipt printed / sent by email

**Expected outcome:** "You'll see the sale appear in Admin → Reports immediately"

### Section 6: Your First Online Order

- Share your storefront URL with a customer (or order yourself for the test)
- Customer adds items to cart, enters shipping/pickup details
- Customer pays via Stripe checkout
- Owner receives email notification: "New order received"
- Admin → Orders shows the new order

**Expected outcome:** "The order shows as 'Paid' and stock automatically decrements"

### Section 7: GST and Pricing (USER-02)

**Worked example — no discount:**
```
Product: Cleaning spray
Price you enter: $23.00
This is GST-inclusive.

NZPOS calculates:
  GST component: $3.00 (= $23.00 × 3/23, rounded to nearest cent)
  Ex-GST amount: $20.00
  Total you receive: $23.00

On the receipt, the customer sees:
  Subtotal (ex-GST): $20.00
  GST (15%): $3.00
  Total: $23.00
```

**Worked example — with discount:**
```
Product: Cleaning spray (normally $23.00)
Discount applied: $5.00 off

Discounted amount: $18.00
NZPOS calculates GST on the discounted amount:
  GST component: $2.35 (= $18.00 × 3/23, rounded to nearest cent)
  Ex-GST amount: $15.65
  Total charged: $18.00

This matches IRD requirements — GST is calculated on the amount actually charged,
not the original price.
```

**Why this matters:** IRD requires GST to be calculated on the actual sale amount (post-discount), not the pre-discount price. NZPOS handles this automatically.

**Legal disclaimer (D-13):** "NZPOS calculates GST automatically following IRD guidelines, but this is not tax advice. Consult your accountant for your specific obligations, including whether you are required to register for GST."

**GST formula source:** `src/lib/gst.ts` — `Math.round(lineTotal * 3 / 23)`. The 3/23 fraction is the IRD-standard method for extracting GST from a GST-inclusive amount (15% GST means GST = total × 15/115 = total × 3/23).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wildcard DNS verification | Custom DNS check script | `dig NS yourdomain.com` command in the doc | Simple shell command is sufficient for a manual runbook |
| Migration application tooling | Custom migration script | `npx supabase db push` (Supabase CLI) | Already works, already documented in setup.md |
| Production env validation | Re-implement validation | `npm run check:env` (already exists in scripts/) | `check-production-env.ts` already exists, reference it in deploy.md |

---

## Common Pitfalls

### Pitfall 1: Wildcard DNS — CNAME Won't Work
**What goes wrong:** Deployer adds `CNAME *.yourdomain.com → cname.vercel-dns.com`. Vercel accepts the domain entry but cannot provision a wildcard SSL certificate. HTTPS works on root domain but not subdomains.
**Why it happens:** Wildcard SSL provisioning via Let's Encrypt requires Vercel to control the DNS zone, which requires NS delegation.
**How to avoid:** Delegate nameservers to Vercel (NS records), not a CNAME. Document clearly that NS delegation is required.
**Warning signs:** Vercel dashboard shows "SSL certificate pending" or "DNS verification failed" for `*.yourdomain.com`

### Pitfall 2: Wrong Stripe Webhook Secret on the Wrong Endpoint
**What goes wrong:** `STRIPE_WEBHOOK_SECRET` is set correctly, but `STRIPE_BILLING_WEBHOOK_SECRET` gets the same value (or is left empty). Billing subscription webhooks return 400.
**Why it happens:** Two webhook endpoints, two signing secrets. Easy to conflate.
**How to avoid:** Register both endpoints in Stripe separately. Copy each `whsec_...` to the correct env var. The smoke test should include a test billing webhook event.
**Warning signs:** Stripe dashboard shows billing webhook endpoint returning 400. App logs show "Webhook signature verification failed" for `/api/webhooks/stripe/billing`.

### Pitfall 3: ROOT_DOMAIN Still Set to lvh.me in Production
**What goes wrong:** Subdomain routing resolves to `lvh.me` instead of the real domain. Every merchant gets served the wrong store or 404.
**Why it happens:** `ROOT_DOMAIN` and `NEXT_PUBLIC_ROOT_DOMAIN` default to `lvh.me:3000` in `.env.example`. Deployer copies example but forgets to update these.
**How to avoid:** The deploy guide must explicitly call out both `ROOT_DOMAIN` and `NEXT_PUBLIC_ROOT_DOMAIN` as production-critical values, distinct from localhost/lvh.me defaults.
**Warning signs:** Middleware logs reference `lvh.me`, subdomain routing produces 404s, stores cannot be found.

### Pitfall 4: JWT Claims Missing After First Signup
**What goes wrong:** New merchant signs up, verifies email, visits admin → immediately redirected to unauthorized. The JWT does not yet contain `role` or `store_id`.
**Why it happens:** The custom access token hook (migration 003) sets claims on JWT issue. The initial signup JWT predates `provision_store` completing. Middleware calls `refreshSession()` to handle this case.
**How to avoid:** This is handled automatically by the middleware's `refreshSession()` call. The smoke test should verify the first admin visit succeeds without a loop. Document in merchant guide: "After your first login, you may see a brief redirect — this is normal."
**Warning signs:** Owner sees infinite redirect loop on first `/admin` visit. Usually indicates `provision_store` RPC did not complete or JWT refresh failed.

### Pitfall 5: STORE_ID/NEXT_PUBLIC_STORE_ID Left Unset
**What goes wrong:** Legacy env vars are blank. Some code paths that haven't been fully migrated to multi-tenant routing may break.
**Why it happens:** These are legacy single-tenant vars from v1. They're documented as "legacy" in env-vars.md but still required.
**How to avoid:** After first merchant provisioning, run `npm run check:env` to confirm all vars are set. The first store's UUID can be found via: Supabase → Table Editor → stores table → first row.
**Warning signs:** `npm run check:env` reports missing vars. Some POS or admin actions error with "missing STORE_ID".

### Pitfall 6: Xero Redirect URI Mismatch
**What goes wrong:** Merchant connects Xero but OAuth callback fails with "redirect_uri_mismatch".
**Why it happens:** `XERO_REDIRECT_URI` in production env must exactly match the URI registered in the Xero developer app. Any difference (http vs https, trailing slash, port number) causes failure.
**How to avoid:** Set `XERO_REDIRECT_URI=https://yourdomain.com/api/xero/callback` in Vercel and ensure the exact same URI is in the Xero developer app settings.

---

## Code Examples

### GST Calculation (from src/lib/gst.ts)

```typescript
// Source: src/lib/gst.ts
// Extract GST from a GST-inclusive amount — IRD 3/23 method
export function gstFromInclusiveCents(inclusiveCents: number): number {
  return Math.round(inclusiveCents * 3 / 23)
}

// Worked example:
// Product price: $23.00 = 2300 cents
// GST: Math.round(2300 * 3 / 23) = Math.round(300) = 300 cents = $3.00
// Ex-GST: 2300 - 300 = 2000 cents = $20.00

// With $5.00 discount:
// Discounted price: 2300 - 500 = 1800 cents
// GST on discounted: Math.round(1800 * 3 / 23) = Math.round(234.78) = 235 cents = $2.35
// Ex-GST: 1800 - 235 = 1565 cents = $15.65
```

### Supabase Migration Application

```bash
# Link to production project
npx supabase link --project-ref <your-project-ref>

# Push all migrations in order (001 through 023)
npx supabase db push

# Verify migration status
npx supabase migration list
```

### Production Env Check

```bash
# Validate all 24 env vars are set before deploy
npm run check:env
```

---

## Environment Availability Audit

Step 2.6: This phase writes documentation only — no external tool dependencies beyond what's already installed for development. The deployer who follows `docs/deploy.md` will need:

| Dependency | Required By | Notes |
|------------|------------|-------|
| Supabase CLI | Migration application | Documented in setup.md; `npm install -g supabase` |
| Node.js 18+ | `npm run check:env` | Already required for dev |
| `dig` (DNS lookup) | Propagation verification | Available on macOS/Linux by default |

These are runtime dependencies for the *deployer following the doc*, not for writing the doc. No environment probing required for this research phase.

---

## Validation Architecture

`nyquist_validation` is enabled. However, this phase produces only Markdown documentation files — no code changes. There is nothing to unit test or integration test. The validation strategy is:

### Test Framework
Not applicable — no executable code is written in Phase 20.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| DEPLOY-01 | Supabase setup guide exists and covers all 6 areas | Manual review | N/A | Human-readable doc, not testable |
| DEPLOY-02 | Stripe live key checklist covers webhook registration and key separation | Manual review | N/A | Human-readable doc |
| DEPLOY-03 | Vercel config guide covers wildcard DNS, 24 env vars, middleware verification | Manual review | N/A | Human-readable doc |
| DEPLOY-04 | Smoke test checklist has all 6 critical path checks | Manual review | N/A | Markdown checkbox list |
| USER-01 | Merchant onboarding guide covers signup through first online order | Manual review | N/A | Human-readable doc |
| USER-02 | GST explanation uses plain English with worked examples | Manual review | N/A | Human-readable doc |

**Verification gate:** The `/gsd:verify-work` check for this phase should confirm:
1. `docs/deploy.md` exists and has sections for Supabase, Stripe, Vercel, smoke test
2. `docs/merchant-guide.md` exists and has the GST section with worked examples
3. `docs/README.md` has entries for both new files
4. All 6 smoke test checkboxes exist in deploy.md
5. Legal disclaimer is present in merchant-guide.md

### Wave 0 Gaps
None — no test infrastructure needed for documentation-only phase.

---

## Open Questions

1. **STORE_ID legacy vars in production**
   - What we know: `.env.example` has `STORE_ID` and `NEXT_PUBLIC_STORE_ID` marked "legacy — single-store v1". env-vars.md says "legacy variables from v1 single-tenant architecture."
   - What's unclear: Does the founder's first store get a specific UUID, or does `provision_store` generate a random UUID? The deploy guide needs to tell the deployer what to put in these vars.
   - Recommendation: Deploy guide should instruct: after first merchant signs up and their store is provisioned, retrieve the store UUID from Supabase → stores table → first row, and set it as STORE_ID. Then redeploy. Alternatively, note these as optional if all POS/admin paths are fully multi-tenant.

2. **Resend domain verification**
   - What we know: `RESEND_FROM_ADDRESS` must be a verified domain in Resend. env-vars.md notes this.
   - What's unclear: The deploy guide doesn't cover Resend setup steps. This is a prerequisite for email notifications working (smoke test check 6).
   - Recommendation: Add a brief Resend section in deploy.md: create account at resend.com, verify domain via DNS TXT record, create API key → `RESEND_API_KEY`, set `RESEND_FROM_ADDRESS` to a verified address.

3. **Production super admin seed data**
   - What we know: `seed.ts` is dev-only per its own comments. Production starts clean. Super admin needs `is_super_admin: true` in `raw_app_meta_data`.
   - What's unclear: The deploy guide needs a concrete SQL snippet to create the super admin, but also needs to note the chicken-and-egg: the user must be created via Supabase Auth UI first, then the flag set via SQL Editor.
   - Recommendation: Use two-step approach documented in the Content Map above.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/gst.ts` — GST formula, per-line on discounted amounts, 3/23 IRD method
- `src/middleware.ts` — Subdomain routing, ROOT_DOMAIN usage, setup wizard redirect, JWT refresh logic
- `src/app/api/webhooks/stripe/route.ts` — Uses `STRIPE_WEBHOOK_SECRET`
- `src/app/api/webhooks/stripe/billing/route.ts` — Uses `STRIPE_BILLING_WEBHOOK_SECRET`
- `.env.example` — All 24 env vars with grouping comments
- `vercel.json` — Cron job schedules (3 jobs)
- `supabase/migrations/` — 23 migrations, numbered 001-023
- `supabase/migrations/018_setup_wizard.sql` — store_logos bucket creation, setup_wizard_dismissed flag
- `supabase/seed.ts` — Dev-only, production starts clean
- `docs/setup.md` — Established doc format, style guide for new docs
- `docs/env-vars.md` — 24 env vars fully documented
- `docs/README.md` — Existing index structure
- `.planning/phases/20-deployment-user-documentation/20-CONTEXT.md` — Locked decisions

### Secondary (MEDIUM confidence)
- STATE.md accumulated context — wildcard SSL requires NS delegation (flagged as known concern), CSP is Report-Only, JWT claims from raw_app_meta_data
- REQUIREMENTS.md — DEPLOY-01 through DEPLOY-04, USER-01, USER-02 definitions

---

## Metadata

**Confidence breakdown:**
- Deploy content: HIGH — sourced directly from codebase files (migrations, webhook handlers, env vars, middleware)
- GST explanation: HIGH — sourced from gst.ts, formula verified against IRD 3/23 standard
- Wildcard DNS guidance: HIGH — confirmed in STATE.md as known requirement, NS delegation is standard Vercel behavior for custom domains
- Merchant guide flow: HIGH — sourced from middleware.ts (setup wizard redirect) and migration 018 (wizard schema)

**Research date:** 2026-04-04
**Valid until:** Not a fast-moving domain (documentation phase). Valid until codebase changes significantly.
