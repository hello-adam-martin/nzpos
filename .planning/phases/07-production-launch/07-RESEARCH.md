# Phase 7: Production Launch - Research

**Researched:** 2026-04-02
**Domain:** Vercel + Supabase + Stripe production deployment
**Confidence:** HIGH

## Summary

Phase 7 is a pure infrastructure and data-loading phase — no new features. The codebase (v1.0, 502 tests, 191 files) is complete and already ships from local dev. The work is: stand up a production Supabase project, apply 9 migrations in order, configure the auth hook, set up environment variables in Vercel, deploy, configure Stripe webhooks, and load 200+ products via the existing CSV import UI.

The deployment stack (Vercel + Supabase) is deliberately zero-config for Next.js App Router. The main risks are (1) migration ordering and auth hook registration in the production Supabase project, (2) Stripe webhook secret mismatches between test and production, and (3) the `next.config.ts` wildcard `*.supabase.co` pattern already handles any production Supabase hostname — no code change is needed.

**Primary recommendation:** Apply migrations sequentially via `supabase db push` against the production project ref, register the auth hook in the Supabase Dashboard (not config.toml — that is local only), then deploy from GitHub to Vercel with all env vars pre-populated before first build.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use the existing CSV import feature (built in v1.0) via the admin dashboard to load 200+ products. No seed script or manual entry.
- **D-02:** Product data starts from scratch — no existing POS system or spreadsheet to migrate from. Owner will create the CSV manually.
- **D-03:** Product images photographed and uploaded individually through the admin product editor. CSV contains data only (name, barcode, price, category, stock level).
- **D-04:** Launch on the default Vercel URL initially (yourproject.vercel.app). Custom .co.nz domain will be added as a follow-up task after deployment is verified.
- **D-05:** Deploy with Stripe test keys on production first. Validate the full online checkout flow with test cards. Switch to live keys only after verification passes.
- **D-06:** Stripe account already exists — just needs live mode activation and live key retrieval when ready.
- **D-07:** Create a new Supabase project for production. Apply all 9 migrations, configure the auth hook (003_auth_hook.sql), set up the storage bucket for product images.
- **D-08:** All production secrets (Supabase URL/keys, Stripe keys, JWT secret) managed through Vercel's environment variables UI. Dev continues using .env.local.
- **D-09:** Vercel account exists and is ready. Project needs to be linked/deployed.

### Claude's Discretion

- Migration application order and verification strategy
- Webhook endpoint configuration for Stripe in production
- Supabase Storage bucket permissions and RLS for production
- Vercel project settings (build commands, framework detection, region)
- Production-specific next.config.ts changes (if any)
- Cron job verification (xero-sync, expire-orders already in vercel.json)

### Deferred Ideas (OUT OF SCOPE)

- Custom domain (.co.nz) — add after initial deployment is verified and working
- Stripe live keys — switch from test to live after production checkout flow is verified with test cards
- Xero production OAuth — requires live Xero credentials (tracked as future requirement XERO-01, XERO-02)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | Store is deployed to Vercel production with all env vars configured | Vercel GitHub integration + env var UI; framework auto-detected as Next.js |
| DEPLOY-02 | Supabase production instance has migrated schema and seeded reference data | `supabase db push --project-ref` applies all 9 migrations; auth hook must be registered via Dashboard |
| DEPLOY-03 | Stripe live keys configured and webhook endpoint verified in production | D-05 defers live keys; test keys first; webhook URL = `https://{vercel-url}/api/webhooks/stripe`; register via Stripe Dashboard |
| DEPLOY-04 | Product catalog imported (200+ SKUs with barcodes, categories, stock levels, images) | CSV import UI (CSVImportFlow.tsx) already built; images uploaded separately via product editor |
</phase_requirements>

---

## Standard Stack

### Core (Already Installed — No New Packages)

| Library | Version (installed) | Purpose | Notes |
|---------|--------------------|---------|-|
| Next.js | 16.2.1 | App framework | Already in repo |
| @supabase/supabase-js | ^2.101.1 | DB client | Already in repo |
| @supabase/ssr | ^0.10.0 | Auth cookie handling | Already in repo |
| stripe (node) | ^21.0.1 | Stripe server SDK | Already in repo |
| Supabase CLI | 2.75.0 (local) | Migration push | Installed at /opt/homebrew/bin/supabase |

### CLI Tools Available

| Tool | Available | Version | Use |
|------|-----------|---------|-----|
| supabase CLI | YES | 2.75.0 | `supabase db push` to apply migrations |
| vercel CLI | NO | — | Not needed — deploy via GitHub integration or `npx vercel` |
| stripe CLI | NO | — | Not needed for this phase; webhooks configured via Dashboard |
| node | YES | v22.22.0 | Local tooling |

**Installation (if vercel CLI needed):**
```bash
npm install -g vercel
```

No new npm packages needed for this phase — it is infrastructure configuration only.

## Architecture Patterns

### Deployment Flow (Recommended Order)

The order matters. Each step depends on the previous:

```
1. Supabase production project created (Dashboard)
2. All 9 migrations applied (supabase db push)
3. Auth hook registered in Supabase Dashboard
4. STAFF_JWT_SECRET generated (32-byte hex)
5. Vercel project created and env vars set
6. First deploy triggered (GitHub push or vercel --prod)
7. Stripe webhook endpoint registered (pointing to production URL)
8. Smoke test: admin login, product page, checkout flow with test card
9. CSV import: create owner's store record, import 200+ products
10. Image upload: photograph and upload per-product
```

### Pattern 1: Supabase Production Migration Push

**What:** Apply all 9 SQL migrations to a fresh production Supabase project using the CLI.

**When to use:** New Supabase project; never run these migrations before.

```bash
# Link to production project (get project-ref from Supabase Dashboard URL)
supabase link --project-ref <YOUR_PROJECT_REF>

# Push all migrations in order (001 through 009)
supabase db push

# Verify all migrations applied
supabase migration list --linked
```

**Critical:** `supabase db push` applies migrations in filename order (001, 002, ..., 009). The order is correct as-is in the repo.

**Source:** Supabase CLI docs — confidence HIGH (verified against CLI version 2.75.0 installed).

### Pattern 2: Auth Hook Registration (Production-Specific)

**What:** The `003_auth_hook.sql` migration creates the `custom_access_token_hook` function. It must also be registered in Supabase Dashboard — config.toml only affects local dev.

**When to use:** After migrations are applied to production.

Steps:
1. Supabase Dashboard → Authentication → Hooks
2. Enable "Custom Access Token" hook
3. Set URI to: `pg-functions://postgres/public/custom_access_token_hook`

**Warning:** If this step is skipped, store_id and role are NOT injected into JWTs. RLS policies will fail silently — authenticated users will see no data. This is the single most likely post-deploy failure point.

**Source:** supabase/config.toml shows `uri = "pg-functions://postgres/public/custom_access_token_hook"` for local — same URI applies in Dashboard.

### Pattern 3: Vercel Environment Variables

**What:** All secrets configured via Vercel Dashboard → Project Settings → Environment Variables.

Required variables (from `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL          # From Supabase Dashboard: API → URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # From Supabase Dashboard: API → anon key
SUPABASE_SERVICE_ROLE_KEY         # From Supabase Dashboard: API → service_role key
STAFF_JWT_SECRET                  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
STRIPE_SECRET_KEY                 # sk_test_... (test keys first per D-05)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY # pk_test_...
STRIPE_WEBHOOK_SECRET             # whsec_... (from Stripe Dashboard after registering endpoint)
```

**When setting:** Set all vars BEFORE first production build. Next.js bakes `NEXT_PUBLIC_*` vars at build time. Missing public vars = broken build.

### Pattern 4: Stripe Webhook Registration

**What:** Register the production webhook endpoint in Stripe Dashboard.

**Steps:**
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://<your-project>.vercel.app/api/webhooks/stripe`
3. Events to listen for: `checkout.session.completed` (the only event handled in route.ts)
4. Copy the `whsec_...` signing secret → set as `STRIPE_WEBHOOK_SECRET` in Vercel

**Source:** Verified from `src/app/api/webhooks/stripe/route.ts` — only `checkout.session.completed` is handled.

### Pattern 5: Supabase Storage Bucket (Migration-Handled)

**What:** `004_storage_bucket.sql` creates the `product-images` bucket with public read access. This runs as part of `supabase db push`.

**Verification:** After migration push, confirm in Supabase Dashboard → Storage → `product-images` bucket exists and is marked public.

**Note:** `next.config.ts` already has `*.supabase.co` as a wildcard remotePattern — no code change needed for production Supabase hostname.

### Pattern 6: Initial Store Record Creation

**What:** The app's RLS model requires a `stores` record and a matching `staff` record with `auth_user_id` before the owner can log in and see any data.

**Sequence:**
1. Deploy Vercel (app accessible)
2. Go to admin login at `/admin/login`
3. Create owner's Supabase Auth account via Dashboard (Authentication → Users → Invite)
4. Insert `stores` row manually via Supabase SQL editor
5. Insert `staff` row linking auth user to store (role: 'owner')
6. Owner can now log in — auth hook fires and injects store_id into JWT
7. Begin CSV import

**Source:** Derived from `003_auth_hook.sql` — hook looks up `staff.auth_user_id`. Without a staff record, hook injects nothing, and RLS blocks all data.

### Pattern 7: CSV Import for Product Catalog

**What:** Use the existing CSV import flow in the admin dashboard.

**CSV format supported** (from CSVImportFlow.tsx and ColumnMapperStep):
- Required columns: `name`, `price`
- Optional columns: `barcode`, `category`, `stock_level` (and any others that map to product fields)
- Column mapping UI handles non-standard header names

**Workflow:**
1. Owner prepares CSV with 200+ rows
2. Admin → Products → Import CSV
3. Upload → Map columns → Preview → Import
4. Images: open each product in editor, upload photo

**Anti-patterns to avoid:**
- Do NOT use `supabase/seed.ts` (dev script — inserts fake data, not real products)
- Do NOT bulk-insert via SQL editor (bypasses CSV validation, image upload flow)

### Anti-Patterns to Avoid

- **Deploying before setting env vars:** NEXT_PUBLIC_* vars are baked at build time. If missing, the build itself will fail or produce a broken app that calls wrong endpoints.
- **Skipping auth hook registration in Dashboard:** config.toml is local-only. The Dashboard must be configured separately. Without it, every JWT lacks store_id and RLS silently blocks all data.
- **Registering webhook before knowing production URL:** Get the Vercel URL first (from first deploy), then register with Stripe.
- **Using Stripe live keys before test validation (per D-05):** Use test keys (sk_test_...) first. Validate checkout end-to-end. Then switch to live keys as a separate step.
- **Using seed.ts in production:** `supabase/seed.ts` inserts fake dev data. Never run it against production.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration application | Custom SQL runner script | `supabase db push` | CLI handles ordering, idempotency, tracks applied migrations |
| Webhook signature verification | Custom crypto comparison | `stripe.webhooks.constructEvent()` | Already in route.ts; timing-safe comparison, handles raw body requirement |
| Image CDN configuration | Custom image proxy | `next/image` + `*.supabase.co` remotePattern | Already configured in next.config.ts; wildcard covers any project ref |
| Product bulk import | SQL INSERT scripts | Existing CSVImportFlow.tsx | Already built; handles validation, column mapping, error reporting |
| Environment variable injection | Custom config loader | Vercel env vars UI | Next.js reads process.env natively; NEXT_PUBLIC_ baked at build time |

**Key insight:** This phase is 100% configuration and tooling — almost nothing needs to be built. The codebase is complete.

## Common Pitfalls

### Pitfall 1: Auth Hook Not Registered in Dashboard

**What goes wrong:** Owner logs in, sees a blank admin dashboard with no data. No error message. Silently fails.
**Why it happens:** config.toml registers the hook for local dev. Production requires manual registration in Supabase Dashboard → Authentication → Hooks.
**How to avoid:** Register hook as step 3 immediately after migrations. Test by logging in and verifying JWT contains store_id (check via Supabase Dashboard → Authentication → Users → JWT).
**Warning signs:** Successful login but empty products, orders, staff lists.

### Pitfall 2: NEXT_PUBLIC_* Env Vars Missing Before Build

**What goes wrong:** Build succeeds but the deployed app points to localhost (http://127.0.0.1:54321) or crashes on startup.
**Why it happens:** `NEXT_PUBLIC_SUPABASE_URL` defaults to `http://127.0.0.1:54321` in `.env.local.example`. If not overridden in Vercel before build, the baked value is wrong.
**How to avoid:** Set ALL env vars in Vercel BEFORE triggering the first build.
**Warning signs:** Network errors to 127.0.0.1 in browser console on production URL.

### Pitfall 3: Stripe Webhook Secret Mismatch

**What goes wrong:** Online checkout completes (Stripe charges card) but order is never created in the database. 400 response from webhook endpoint.
**Why it happens:** `STRIPE_WEBHOOK_SECRET` in Vercel doesn't match the signing secret from the Stripe Dashboard webhook endpoint.
**How to avoid:** Copy the `whsec_...` value from the exact endpoint in Stripe Dashboard → paste into Vercel env var → redeploy.
**Warning signs:** Stripe Dashboard shows webhook delivery failures (400 status). Check Stripe → Developers → Webhooks → Recent deliveries.

### Pitfall 4: Store and Staff Records Not Created Before CSV Import

**What goes wrong:** CSV import fails or saves products to no store. Products appear in database but are invisible in the admin.
**Why it happens:** RLS policies use `store_id` from JWT claims. Without a `stores` row and matching `staff` row, the auth hook injects nothing.
**How to avoid:** Create `stores` and `staff` rows manually in Supabase SQL editor before logging into admin for the first time.
**Warning signs:** Admin dashboard loads but shows 0 products after import.

### Pitfall 5: Vercel Cron Jobs Require Pro Plan or Hobby Tier Limits

**What goes wrong:** `vercel.json` crons (xero-sync at 13:00, expire-orders at 14:00) do not fire.
**Why it happens:** Vercel Hobby plan limits cron jobs to once per day minimum interval. The configured schedules (daily) are within Hobby limits — this should work. However, crons only run on production deployments (not preview).
**How to avoid:** Deploy to production (not preview). Verify cron is listed in Vercel Dashboard → Project → Crons after first production deploy.
**Warning signs:** No cron execution logs in Vercel → Functions tab.

### Pitfall 6: Supabase Free Tier Pauses After 1 Week of Inactivity

**What goes wrong:** Production database becomes inaccessible after 7 days with no traffic.
**Why it happens:** Supabase free tier pauses inactive projects after ~7 days.
**How to avoid:** For initial launch this is acceptable — the app will have traffic. Flag this as an operational consideration: if the store closes for extended periods, project may pause. Upgrade to Pro ($25/mo) when revenue justifies it.
**Warning signs:** 503 errors from all Supabase API calls.

## Code Examples

### Generate STAFF_JWT_SECRET

```bash
# Source: .env.local.example comment
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Link Supabase CLI to Production Project

```bash
# Source: Supabase CLI docs (confidence HIGH — CLI 2.75.0 installed)
# Get project-ref from Supabase Dashboard URL: app.supabase.com/project/<ref>
supabase link --project-ref abcdefghijklmnop

# Verify link
supabase status

# Push all migrations
supabase db push

# Verify what was applied
supabase migration list --linked
```

### Verify Auth Hook JWT Claims (SQL)

```sql
-- Run in Supabase SQL editor after registering hook and creating staff record
-- Verifies the hook function exists and is accessible
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'custom_access_token_hook';
```

### Create Initial Store and Staff Records

```sql
-- Run in Supabase SQL editor (production)
-- Step 1: Get the auth user's UUID from Authentication > Users in Dashboard
-- Step 2: Insert store record
INSERT INTO public.stores (name, gst_number, currency)
VALUES ('Your Store Name', 'YOUR-GST-NUMBER', 'NZD')
RETURNING id;

-- Step 3: Insert staff record (use store id from above, user id from Auth panel)
INSERT INTO public.staff (store_id, auth_user_id, name, role, pin_hash)
VALUES (
  '<store-id-from-above>',
  '<auth-user-id>',
  'Owner Name',
  'owner',
  NULL  -- owner uses Supabase Auth, not PIN
);
```

### Stripe Webhook Registration (Dashboard Steps)

```
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: https://<project>.vercel.app/api/webhooks/stripe
3. Select events: checkout.session.completed
4. Add endpoint → copy Signing secret (whsec_...)
5. Vercel Dashboard → Project → Settings → Environment Variables
   STRIPE_WEBHOOK_SECRET = whsec_...
6. Redeploy to apply new env var
```

### Test Checkout Flow with Stripe Test Card

```
Test card (Stripe): 4242 4242 4242 4242
Expiry: any future date
CVC: any 3 digits
Postcode: any 4 digits (NZ format not enforced by Stripe test mode)
```

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Project already uses @supabase/ssr correctly |
| Manual SQL migration runner | `supabase db push` | CLI is idempotent and tracks applied migrations |
| Stripe CLI for webhook testing | Stripe Dashboard for production webhook | CLI is for local testing; Dashboard for production endpoints |

**Deprecated/outdated:**
- `supabase/config.toml` auth hook config: local dev only. Production requires Dashboard UI registration.

## Open Questions

1. **Store schema specifics (stores table columns)**
   - What we know: migrations apply `stores` table. The exact required columns (gst_number nullable, etc.) need verification from `001_initial_schema.sql` before writing insert SQL.
   - What's unclear: Which columns are NOT NULL in production.
   - Recommendation: Planner task should read `001_initial_schema.sql` and produce the correct INSERT statement.

2. **Vercel project name / URL**
   - What we know: D-09 says account is ready and project needs linking.
   - What's unclear: Whether a Vercel project already exists (linked to GitHub repo) or needs to be created fresh.
   - Recommendation: Check Vercel Dashboard first. If project exists, just add env vars. If not, create via `npx vercel` or Dashboard → New Project → Import Git Repository.

3. **Supabase project ref availability**
   - What we know: D-07 says to create a new Supabase production project.
   - What's unclear: Whether the project has been created yet or is created as part of this phase.
   - Recommendation: Treat project creation as Wave 0 (manual prerequisite). The planner should document this as a human action, not a code task.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| supabase CLI | DEPLOY-02 (migration push) | YES | 2.75.0 | None needed |
| vercel CLI | DEPLOY-01 (deploy) | NO | — | Use `npx vercel` or GitHub integration (preferred) |
| stripe CLI | DEPLOY-03 (webhook) | NO | — | Stripe Dashboard (preferred for production) |
| node | Tooling | YES | v22.22.0 | — |

**Missing dependencies with no fallback:** None — vercel and stripe CLI are not required; their Dashboard UIs handle production configuration.

**Missing dependencies with fallback:**
- vercel CLI: GitHub integration or `npx vercel --prod` is the standard approach for production deploy.
- stripe CLI: Only needed for local webhook testing. Production webhooks are registered via Stripe Dashboard.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x (configured in vitest.config.ts) |
| Config file | `/Users/adam-personal/CODER/IDEAS/NZPOS/vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` (runs all 502 tests) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | App accessible at production Vercel URL | smoke/manual | `curl -s -o /dev/null -w "%{http_code}" https://<url>/` | N/A — manual |
| DEPLOY-02 | All 9 migrations applied, auth hook fires | smoke/manual | `supabase migration list --linked` | N/A — CLI verification |
| DEPLOY-03 | Stripe test checkout completes end-to-end | smoke/manual | Manual test card 4242... | N/A — manual |
| DEPLOY-04 | 200+ products with barcodes/categories/stock/images | smoke/manual | SQL: `SELECT COUNT(*) FROM products WHERE store_id = '...'` | N/A — data verification |

**Note:** All DEPLOY-* requirements are infrastructure/data tasks, not code behaviors. They are validated by smoke tests and manual verification, not unit tests. The existing 502-test suite confirms the codebase is correct — no new tests are needed for this phase.

### Sampling Rate

- **Per task commit:** `npm test` (full suite — fast enough, 502 tests)
- **Per wave merge:** Full suite + smoke tests on production URL
- **Phase gate:** Production smoke test checklist complete before `/gsd:verify-work`

### Wave 0 Gaps

None — no new code is being written. Existing test infrastructure is sufficient. All DEPLOY-* verification is manual/operational.

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/app/api/webhooks/stripe/route.ts` — webhook handler verified
- Project codebase: `src/components/admin/csv/CSVImportFlow.tsx` — CSV import flow verified
- Project codebase: `supabase/migrations/001-009` — all migrations verified present
- Project codebase: `supabase/config.toml` — auth hook URI verified
- Project codebase: `next.config.ts` — `*.supabase.co` wildcard remotePattern verified
- Project codebase: `.env.local.example` — all required env vars documented
- Supabase CLI 2.75.0 installed at `/opt/homebrew/bin/supabase`

### Secondary (MEDIUM confidence)
- Supabase production deployment patterns (auth hook Dashboard registration) — standard practice, consistent with config.toml comment "This hook must be registered"
- Vercel free tier cron behavior — known limitation (daily minimum interval); schedules in vercel.json are daily so within limits

### Tertiary (LOW confidence)
- Supabase free tier 7-day inactivity pause policy — known operational characteristic, specific timing may have changed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and verified in package.json
- Architecture: HIGH — derived entirely from existing codebase, not assumptions
- Pitfalls: HIGH — derived from code inspection (auth hook, env vars, webhook handler)
- Environment: HIGH — CLI tools directly verified with version checks

**Research date:** 2026-04-02
**Valid until:** 2026-07-01 (stable deployment infrastructure — low churn)
