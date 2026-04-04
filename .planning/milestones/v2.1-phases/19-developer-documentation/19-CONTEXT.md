# Phase 19: Developer Documentation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Write developer-facing documentation so any developer (including the founder returning after months) can clone the repo, configure environment variables, and have the app running locally within 20 minutes — with complete reference for the architecture and all 48 Server Actions. Covers DOC-01 through DOC-04.

</domain>

<decisions>
## Implementation Decisions

### Doc Format & Location
- **D-01:** All developer docs live in a `docs/` folder at the repo root. Separate from source code.
- **D-02:** Flat file structure with an index: `docs/README.md` (table of contents), `docs/setup.md`, `docs/architecture.md`, `docs/env-vars.md`, `docs/server-actions.md`.
- **D-03:** Use Mermaid diagrams for visual flows (auth, tenant routing, data flows). Renders natively on GitHub.

### Architecture Depth
- **D-04:** Auth systems documented with Mermaid sequence diagrams per auth type (owner, staff PIN, customer, super admin) plus key file references (middleware.ts, resolveAuth.ts, jose). Enough to debug auth issues, not step-by-step code walkthroughs.
- **D-05:** Full end-to-end multi-tenant request lifecycle documented: request → middleware → subdomain extraction → tenant cache → RLS via custom JWT claims → response. This is the most unique/complex part of the system.
- **D-06:** Feature gating dual-path (requireFeature → free vs paid) AND billing/subscription data flow (Stripe webhook lifecycle, add-on subscription model) both included. Non-obvious systems that a returning developer needs to understand.

### Server Action Inventory
- **D-07:** Actions grouped by domain: Auth (~12), Orders (~6), Products (~5), Categories (~4), Billing (~2), Super Admin (~4), Setup (~5), Xero (~3), Promos (~2), Cash Sessions (~2). One table per group.
- **D-08:** Four columns per action: Name, Auth requirement (owner/staff/customer/super-admin/public), Zod input schema summary, one-line description. No response shape column — keeps maintenance low.

### Setup Guide
- **D-09:** Both Supabase setup paths documented: local Supabase CLI (`supabase start`) AND remote Supabase project. Local is primary, remote as alternative.
- **D-10:** Include a seed script that creates a demo store with sample products, categories, and a test user. Developer sees a working app immediately after setup.
- **D-11:** Stripe CLI setup included with `stripe listen --forward-to` for both order and billing webhook endpoints. Essential for testing checkout and subscription flows locally.
- **D-12:** Common gotchas/troubleshooting section covering: RLS blocking queries, missing env vars, subdomain routing on localhost (lvh.me), Supabase migration issues.

### Claude's Discretion
- Claude determines the exact Mermaid diagram structure and level of detail per diagram
- Claude determines the seed script implementation (SQL vs TypeScript, data volume)
- Claude determines the env var table format and grouping within docs/env-vars.md
- Claude determines whether additional docs files are needed beyond the four core files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Environment & Configuration
- `.env.example` — Complete env var reference (audited in Phase 17, SEC-09). Source of truth for DOC-02.
- `CLAUDE.md` — Technology stack, conventions, and architecture notes. Contains the full tech stack table.

### Auth & Tenant Isolation
- `src/middleware.ts` — Multi-tenant routing, subdomain extraction, staff JWT verification, security headers
- `src/lib/resolveAuth.ts` — Auth resolution logic (owner, staff, customer, super admin)
- `src/lib/supabase/server.ts` — Supabase client with tenant-aware cookie handling
- `src/lib/supabase/admin.ts` — Service role admin client
- `src/lib/supabase/middleware.ts` — Middleware Supabase client with tenant cache integration
- `src/lib/requireFeature.ts` — Feature gating dual-path (free vs paid add-ons)

### Billing & Subscriptions
- `src/app/api/webhooks/stripe/billing/route.ts` — Billing webhook handler
- `src/actions/billing/createSubscriptionCheckoutSession.ts` — Subscription checkout
- `src/actions/billing/createBillingPortalSession.ts` — Billing portal

### Server Actions
- `src/actions/` — All 48 Server Actions organized by domain subdirectory

### Prior Phase Context
- `.planning/phases/17-security-audit/17-CONTEXT.md` — Security decisions (CSP, RLS, env hygiene)
- `.planning/phases/18-code-quality-test-coverage/18-CONTEXT.md` — JSDoc and coverage decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.env.example` — Already comprehensive (audited Phase 17). DOC-02 env var table can be generated from this + grep of `process.env` references.
- JSDoc comments on all lib exports (added Phase 18, D-12) — architecture doc can reference these.
- 48 Server Actions all follow consistent pattern: `'use server'` → `server-only` → Zod validation → auth check → DB operation → `{ success, error?, data? }` response.

### Established Patterns
- Server Actions organized in `src/actions/{domain}/` subdirectories — mirrors the inventory grouping.
- Auth follows a layered pattern: middleware (route-level) → resolveAuth (request-level) → per-action auth checks.
- Multi-tenant: wildcard subdomain → `tenantCache` → custom JWT claims → RLS policies.

### Integration Points
- `docs/README.md` will be the entry point — should be linked from repo root README if one exists.
- Setup guide needs to reference Supabase migrations in `supabase/migrations/` directory.
- Seed script will need to work with the existing Supabase schema and RLS policies.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraint is the "20 minutes from clone to running app" target in DOC-01.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 19-developer-documentation*
*Context gathered: 2026-04-04*
