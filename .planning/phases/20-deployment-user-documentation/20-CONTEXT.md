# Phase 20: Deployment + User Documentation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Write a production deployment runbook (Supabase, Stripe live, Vercel with wildcard DNS) and merchant-facing documentation so the platform can go live and a new merchant can complete their first sale end-to-end without support. Covers DEPLOY-01 through DEPLOY-04 and USER-01/USER-02.

</domain>

<decisions>
## Implementation Decisions

### Deployment Runbook Structure
- **D-01:** Single `docs/deploy.md` file with linear top-to-bottom flow: (1) Supabase production setup, (2) Stripe live key configuration, (3) Vercel production deploy with wildcard DNS, (4) Post-deploy smoke test checklist. One doc, one flow.
- **D-02:** Audience is the founder — someone technical enough to use Supabase dashboard and Vercel, but not a DevOps engineer. Clear steps, no assumed infrastructure knowledge.
- **D-03:** Text-only instructions referencing dashboard field names. No screenshots — dashboards change frequently, screenshots go stale.
- **D-04:** Step-by-step DNS guide for wildcard subdomain setup including NS record delegation to Vercel, propagation verification, and wildcard SSL. This was flagged as a known concern in STATE.md.

### Post-Deploy Smoke Test
- **D-05:** Manual markdown checkbox checklist within `docs/deploy.md` (not a separate file, not scripted). Walk through it after each deploy.
- **D-06:** Critical path only — 6 checks matching DEPLOY-04: merchant signup, product creation, POS sale, online order + Stripe payment, Xero sync trigger, email notification delivery. No edge cases or secondary features.

### Merchant Onboarding Guide
- **D-07:** Lives at `docs/merchant-guide.md` alongside dev docs. Markdown file that could later be rendered as in-app help.
- **D-08:** Friendly walkthrough tone — conversational, step-by-step, like showing a friend. Numbered steps with expected outcomes.
- **D-09:** Full journey: signup -> store setup wizard -> add first product -> complete first POS sale -> place first online order. Matches USER-01 exactly.
- **D-10:** Store setup wizard steps documented inline with detail (business info, logo upload, checklist) — this is the merchant's first experience.

### GST Compliance Explanation
- **D-11:** GST explanation is a dedicated section within `docs/merchant-guide.md`, not a separate file. Keeps all merchant-facing info in one place.
- **D-12:** Plain English with worked examples, no formulas. "All prices include GST. When you enter $23.00, NZPOS knows $3.00 is GST." Include an example with discounts applied.
- **D-13:** Brief legal disclaimer: "NZPOS calculates GST automatically but is not tax advice — consult your accountant for your specific obligations."

### Claude's Discretion
- Claude determines the exact Supabase migration application order and seed data steps
- Claude determines the Stripe webhook endpoint registration steps and live vs test key separation detail
- Claude determines Vercel env var listing and middleware verification steps
- Claude determines the specific worked GST example numbers and discount scenario
- Claude determines whether the smoke test checklist needs sub-steps per check

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Deployment Configuration
- `.env.example` — All 24 env vars with grouping comments. Source of truth for what needs configuring in production.
- `vercel.json` — Cron job configuration (Xero sync, expire orders, daily summary). Must be verified post-deploy.
- `next.config.ts` — Image domain config, server external packages. Vercel deploy must match.
- `supabase/config.toml` — Local Supabase config. Production setup mirrors these settings.

### Migrations (apply in order)
- `supabase/migrations/` — 23 migrations (001 through 023). Production Supabase must apply all in sequence.

### Existing Developer Docs (established patterns)
- `docs/setup.md` — Local dev setup guide (Phase 19). Deploy guide complements this for production.
- `docs/env-vars.md` — All 24 env vars documented with purpose and source. Deploy guide references this.
- `docs/architecture.md` — Architecture overview with Mermaid diagrams. Established doc format.

### Auth & Tenant Systems (smoke test verification targets)
- `src/middleware.ts` — Subdomain routing, tenant resolution, security headers. Critical post-deploy verification point.
- `src/lib/supabase/server.ts` — Supabase client with tenant-aware cookies. Must work with production Supabase URL.

### Stripe Integration (live key config)
- `src/app/api/webhooks/stripe/route.ts` — Order payment webhook handler. Needs live webhook secret.
- `src/app/api/webhooks/billing/route.ts` — Subscription billing webhook handler. Separate webhook secret (STRIPE_BILLING_WEBHOOK_SECRET).

### GST Logic (compliance explanation source)
- `src/lib/gst.ts` — GST calculation logic (15% tax-inclusive, per-line rounding). Source of truth for merchant-facing explanation.

### Security (deploy considerations)
- Phase 17 CONTEXT.md — CSP is Report-Only; deployer should know when to switch to enforcing.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/` folder with 5 files from Phase 19 — established location and format for all documentation
- `.env.example` — complete, audited in Phase 17 (SEC-09), documents all 24 env vars
- `vercel.json` — cron jobs already configured, just needs production verification
- `supabase/migrations/` — 23 ordered migrations ready for production application

### Established Patterns
- Markdown with Mermaid diagrams (Phase 19 architecture.md has 5 diagrams)
- Flat file structure in `docs/` with `docs/README.md` as index
- Env vars grouped by service in `.env.example` with comment headers

### Integration Points
- `docs/README.md` — needs entries for deploy.md and merchant-guide.md
- `docs/env-vars.md` — deploy guide references this for production env var values
- `docs/setup.md` — deploy guide complements this (local vs production setup)

</code_context>

<specifics>
## Specific Ideas

- DNS guide must cover NS delegation specifically (not CNAME) — Vercel requires nameserver delegation for wildcard SSL on custom domains
- Smoke test covers exactly 6 critical path checks, not comprehensive platform testing
- Merchant guide walks through the actual store setup wizard UI step by step
- GST example should use a real-world scenario (e.g., a product with a discount applied, showing how GST is calculated on the discounted amount)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-deployment-user-documentation*
*Context gathered: 2026-04-04*
