# Local Development Setup

Get NZPOS running locally in under 20 minutes. This guide covers both local Supabase (recommended) and remote Supabase project setup.

---

## Prerequisites

Install these tools before starting:

| Tool | Check | Notes |
|------|-------|-------|
| Node.js 18+ | `node -v` | Required for `npm install` and `npx tsx` |
| Docker Desktop | `docker -v` | Required for local Supabase |
| Supabase CLI | `npx supabase --version` | Install globally: `npm install -g supabase` or use `npx` |
| Stripe CLI | `stripe --version` | [Install guide](https://stripe.com/docs/stripe-cli) — needed for webhook testing |
| Git | `git --version` | Standard version control |

---

## Step 1: Clone and Install

```bash
git clone <repo-url>
cd nzpos
npm install
```

---

## Step 2: Start Supabase

### Primary Path — Local Supabase (Recommended)

```bash
npx supabase start
```

> **First run:** Pulls Docker images for Postgres, Auth, Storage, and Edge Functions. This takes 5-10 minutes. Subsequent starts take ~10 seconds.

After start, the CLI prints output like:

```
API URL: http://127.0.0.1:54321
GraphQL URL: http://127.0.0.1:54321/graphql/v1
S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
anon key: eyJ...
service_role key: eyJ...
```

Note the `API URL`, `anon key`, and `service_role key` — you'll need them in Step 3.

### Alternative Path — Remote Supabase Project

If you prefer a remote Supabase project (e.g. to share data with a team):

1. Create a project at [supabase.com](https://supabase.com)
2. Link the project: `npx supabase link --project-ref <your-project-ref>`
3. Push migrations: `npx supabase db push`
4. Get credentials from the dashboard: **Settings → API**

---

## Step 3: Configure Environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in values. Key variables to set first:

| Variable | Local Value |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | API URL from `supabase start` — default: `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon key` from `supabase start` output |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role key` from `supabase start` output |
| `STORE_ID` | `00000000-0000-4000-a000-000000000001` (seed creates this deterministic ID) |
| `NEXT_PUBLIC_STORE_ID` | Same as `STORE_ID` |
| `STAFF_JWT_SECRET` | Run: `openssl rand -base64 32` |
| `ROOT_DOMAIN` | `lvh.me:3000` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `lvh.me:3000` |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |

For Stripe variables, see Step 6. For all variables, see [Environment Variables](env-vars.md).

---

## Step 4: Seed the Database

```bash
npx tsx supabase/seed.ts
```

This creates:
- 1 demo store with slug `demo`
- 1 owner user: `owner@test.nzpos.dev` / `password123`
- 2 staff members: Alice (PIN: 1234), Bob (PIN: 5678)
- 5 categories: Cleaning, Linen, Toiletries, Maintenance, Kitchen
- 25 sample products with realistic NZ prices

> If you later run `npx supabase db reset`, always follow it with `npx tsx supabase/seed.ts` to restore the demo data. See [Troubleshooting](#supabase-db-reset-wipes-seed-data) below.

---

## Step 5: Start the Dev Server

```bash
npm run dev
```

Visit:

| URL | What it is |
|-----|-----------|
| `http://mystore.lvh.me:3000` | Storefront (replace `mystore` with your store slug — seed uses `demo`) |
| `http://demo.lvh.me:3000/admin` | Admin dashboard — log in with owner credentials |
| `http://demo.lvh.me:3000/pos` | POS interface — log in with staff PIN |
| `http://lvh.me:3000/super-admin` | Super admin panel (platform-level) |
| `http://lvh.me:3000` | Marketing landing page |

> **Important:** Use `{slug}.lvh.me:3000` — NOT `localhost:3000`. `lvh.me` is a public wildcard DNS that resolves all subdomains to `127.0.0.1`. The middleware reads the `Host` header to resolve which store to load; `localhost` is treated as the root domain, not a tenant subdomain.

---

## Step 6: Set Up Stripe Webhooks

The app requires two active webhook listeners during local development: one for order payments and one for billing subscriptions.

Open **two additional terminals** alongside your dev server:

```bash
# Terminal 2 — Order webhooks (checkout, refunds)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

```bash
# Terminal 3 — Billing webhooks (subscriptions, add-ons)
stripe listen --forward-to localhost:3000/api/webhooks/stripe/billing
```

Each `stripe listen` command prints a webhook signing secret (`whsec_...`) on startup. Copy these into `.env.local`:

- Terminal 2 secret → `STRIPE_WEBHOOK_SECRET`
- Terminal 3 secret → `STRIPE_BILLING_WEBHOOK_SECRET`

> These are **different secrets** for **different endpoints**. Both must be set for checkout and billing flows to work correctly.
>
> Restart the dev server after updating `.env.local` — Next.js does not hot-reload environment variables.

---

## Step 7: Run Tests

```bash
npm run test              # Unit tests (Vitest)
npm run test:coverage     # Unit tests with coverage report
npm run test:e2e          # End-to-end tests (Playwright)
```

The test suite has 434+ tests. The first run may take ~30 seconds; subsequent runs are faster.

---

## Available npm Scripts

| Script | Command | What it does |
|--------|---------|--------------|
| `npm run dev` | `next dev` | Start development server |
| `npm run build` | `next build` | Production build |
| `npm run start` | `next start` | Start production server |
| `npm run test` | `vitest run` | Run unit tests |
| `npm run test:watch` | `vitest` | Run tests in watch mode |
| `npm run test:coverage` | `vitest run --coverage` | Run tests with coverage |
| `npm run test:e2e` | `playwright test` | Run Playwright E2E tests |
| `npm run check:env` | `tsx scripts/check-production-env.ts` | Validate all env vars are set |

---

## Troubleshooting

### RLS Blocking Queries

**Symptom:** "permission denied for table ..." errors on admin actions or API calls.

**Cause:** Row Level Security is enabled on all tables. Server Actions use `createSupabaseAdminClient()` (service role key) for mutations that bypass RLS deliberately.

**Fix:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`. The anon client (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) cannot perform mutations on protected tables.

---

### Missing Environment Variables

**Symptom:** Runtime errors like `TypeError: Cannot read properties of undefined` or `Error: Missing required environment variable`.

**Cause:** Not all 24 variables are set in `.env.local`.

**Fix:** Run `npm run check:env` to identify missing variables, or compare `.env.local` against `.env.example`. See [env-vars.md](env-vars.md) for the full reference with descriptions.

---

### Subdomain Routing on Localhost

**Symptom:** Visiting `localhost:3000/admin` shows a 404, or the store doesn't resolve.

**Cause:** Middleware extracts the tenant from the `Host` header subdomain. `localhost` has no subdomain, so it's treated as the root domain — no tenant context is injected.

**Fix:** Use `{slug}.lvh.me:3000` instead of `localhost:3000`. For the seeded demo store, that's `demo.lvh.me:3000`. `lvh.me` is a public DNS service that points all subdomains to `127.0.0.1`.

---

### Supabase Migration Issues

**Symptom:** Schema errors after pulling new code — missing columns, unknown tables, type mismatches.

**Cause:** New migrations were added to `supabase/migrations/` since you last reset.

**Fix:**

```bash
npx supabase db reset
npx tsx supabase/seed.ts
```

This re-applies all migrations in order and re-seeds the database. The project currently has 23 migrations.

---

### supabase db reset Wipes Seed Data

**Symptom:** Database is empty after running `supabase db reset`.

**Cause:** `supabase db reset` runs `supabase/seed.sql` if it exists (not `seed.ts`). This project uses `seed.ts`, so reset leaves the database empty.

**Fix:** Always follow `supabase db reset` with the seed script:

```bash
npx supabase db reset && npx tsx supabase/seed.ts
```

---

### JWT Claims Not Updated After Provisioning

**Symptom:** Owner logs in successfully but `/admin` redirects to unauthorized.

**Cause:** Supabase JWTs are issued at login time and cached. After `provision_store` sets `role` and `store_id` in `app_metadata`, the existing JWT does not automatically reflect the new claims.

**Fix:** The middleware detects a missing `role` claim and calls `supabase.auth.refreshSession()` automatically on the first `/admin` visit. If the redirect loop persists, sign out and sign back in to force a fresh JWT.

---

### Stripe Webhook Secret Not Updating

**Symptom:** Webhook signature verification failures — `No signatures found matching the expected signature for payload`.

**Cause:** The `whsec_...` secret from `stripe listen` changes each time the Stripe CLI starts a new session.

**Fix:** Every time you restart `stripe listen`, copy the new `whsec_...` value into `.env.local` and restart the dev server.
