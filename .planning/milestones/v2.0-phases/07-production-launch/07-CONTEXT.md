# Phase 7: Production Launch - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the NZPOS application to production infrastructure. The store is live on Vercel with a production Supabase database, Stripe payments configured, and 200+ real products loaded. This phase is pure infrastructure and data — no new features.

</domain>

<decisions>
## Implementation Decisions

### Product Data Import
- **D-01:** Use the existing CSV import feature (built in v1.0) via the admin dashboard to load 200+ products. No seed script or manual entry.
- **D-02:** Product data starts from scratch — no existing POS system or spreadsheet to migrate from. Owner will create the CSV manually.
- **D-03:** Product images will be photographed and uploaded individually through the admin product editor. CSV contains data only (name, barcode, price, category, stock level).

### Domain & DNS
- **D-04:** Launch on the default Vercel URL initially (yourproject.vercel.app). Custom .co.nz domain will be added as a follow-up task after deployment is verified.

### Stripe Go-Live
- **D-05:** Deploy with Stripe test keys on production first. Validate the full online checkout flow with test cards in the production environment. Switch to live keys only after verification passes.
- **D-06:** Stripe account already exists — just needs live mode activation and live key retrieval when ready.

### Environment & Secrets
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database & Migrations
- `supabase/migrations/001_initial_schema.sql` — Core schema (stores, products, orders, staff)
- `supabase/migrations/002_rls_policies.sql` — Row Level Security policies using store_id
- `supabase/migrations/003_auth_hook.sql` — Custom JWT claims hook (store_id, role injection)
- `supabase/migrations/004_storage_bucket.sql` — Product image storage bucket setup
- `supabase/migrations/005_pos_rpc.sql` — POS sale completion RPC
- `supabase/migrations/006_online_store.sql` — Online order RPCs
- `supabase/migrations/007_cash_sessions_fix.sql` — Cash session fixes
- `supabase/migrations/008_xero_integration.sql` — Xero token vault and sync tables
- `supabase/migrations/009_security_fixes.sql` — Post-ship security hardening

### Deployment Config
- `next.config.ts` — Image remote patterns (Supabase Storage), needs production hostname
- `vercel.json` — Cron jobs (xero-sync daily at 1pm, expire-orders at 2pm)
- `.env.local.example` — All required env vars documented

### Auth
- `supabase/config.toml` — Local Supabase project config (project_id: NZPOS)

### Data Import
- `supabase/seed.ts` — Dev seed script (reference for data structure, NOT for production use)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- CSV import feature in admin dashboard — handles product bulk creation with validation
- Supabase Storage integration — product image upload already wired in admin product editor
- Stripe webhook handler — already built for online checkout flow

### Established Patterns
- Environment variables follow `.env.local.example` template — all vars documented
- Supabase migrations numbered sequentially (001-009)
- Auth hook injects `store_id` and `role` into JWT claims via `app_metadata`
- Vercel cron jobs defined in `vercel.json`

### Integration Points
- `next.config.ts` image remotePatterns — needs production Supabase hostname added
- Stripe webhook URL — needs to point to production `/api/webhooks/stripe`
- Xero OAuth callback URL — needs production URL configured

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard production deployment following existing codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

- Custom domain (.co.nz) — add after initial deployment is verified and working
- Stripe live keys — switch from test to live after production checkout flow is verified with test cards
- Xero production OAuth — requires live Xero credentials (tracked as future requirement XERO-01, XERO-02)

</deferred>

---

*Phase: 07-production-launch*
*Context gathered: 2026-04-02*
