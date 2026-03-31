# Phase 1: Foundation - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up the technical skeleton for NZPOS: Next.js 16 project scaffold, Supabase schema with multi-tenant RLS, authentication (owner email/password + staff PIN), GST calculation module, Zod validation schemas, CI/CD pipeline, and iPad PWA manifest. Every subsequent phase builds on this foundation.

</domain>

<decisions>
## Implementation Decisions

### Supabase Setup
- **D-01:** Use Supabase local development via Docker (`supabase start`) during build phase. No hosted Supabase account needed until deployment. Push migrations to hosted instance when ready to go live.
- **D-02:** When deploying: Sydney region (closest to NZ, ~20ms latency). Tier decision deferred to deployment time (free tier for initial launch, Pro for production).

### Authentication
- **D-03:** Staff PIN is 4 digits (10k combinations, sufficient for 4-10 staff). Stored as bcrypt hash.
- **D-04:** Owner signup with email/password, immediate access (no email verification required). Verification can be added later if expanding to multi-tenant.
- **D-05:** PIN lockout after 10 failed attempts in 5 minutes. Owner can unlock staff accounts from admin.
- **D-06:** Custom JWT claims: `store_id` and `role` stored in `raw_app_meta_data`. RLS policies use `auth.jwt()->'app_metadata'->>'store_id'`.

### Seed Data
- **D-07:** Development seed script with 20-30 realistic NZ supplies products across categories (Cleaning, Linen, Toiletries, Maintenance, Kitchen). Seed includes a test store, test owner, and 2 test staff accounts.
- **D-08:** Production starts clean (no seed data). Seed script only runs in development environment.

### GST Module
- **D-09:** Pure function, no dependencies. Per-line calculation on discounted amounts: `gstCents = Math.round(discountedPriceCents * qty * 3 / 23)`. Order GST = sum of line GSTs.
- **D-10:** Test suite includes IRD specimen test cases: standard items, discounted items, zero-value items, rounding edge cases.

### PWA
- **D-11:** Manifest + icons + standalone fullscreen mode. No service worker in Phase 1 (offline mode is v2 scope). PWA installable on iPad home screen.

### Claude's Discretion
- PWA icon sizes and splash screens (standard set for iPad)
- Exact Zod schema structure (as long as every Server Action is validated)
- CI/CD pipeline structure (GitHub Actions workflow file)
- Supabase migration file naming conventions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Full design system (navy #1E293B + amber #E67E22, Satoshi + DM Sans typography, spacing scale, motion rules)

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full v1 requirements with REQ-IDs (Phase 1: FOUND-01 through FOUND-07, AUTH-01 through AUTH-05, DEPLOY-01, DEPLOY-02)
- `.planning/research/STACK.md` — Validated tech stack with specific versions (Next.js 16.2, Tailwind v4.2, @supabase/ssr, jose for PIN JWT)
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, build order
- `.planning/research/PITFALLS.md` — Critical pitfalls (GST rounding, RLS performance, Stripe idempotency)

### External References
- No external specs. Requirements fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None (greenfield project, no existing code)

### Established Patterns
- None yet. Phase 1 establishes the patterns all other phases follow:
  - Server Action + Zod validation pattern
  - Supabase client creation (browser vs server)
  - Money-in-cents convention
  - TypeScript types from Supabase schema generation

### Integration Points
- All subsequent phases depend on: Supabase client setup, auth middleware, RLS policies, GST calculation module, Zod schemas

</code_context>

<specifics>
## Specific Ideas

- Use `supabase start` for local development (Docker), push to hosted Supabase only at deploy time
- Seed script should create realistic NZ product names and prices (Surface Spray $8.99, Bath Towel Set $34.99, etc.)
- Staff PIN auth uses `jose` library for stateless JWT sessions (separate from Supabase Auth owner sessions)
- Tailwind v4 uses CSS-native config (`@import "tailwindcss"` in globals.css), NOT `tailwind.config.js`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-01*
