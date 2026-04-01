---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 6 context gathered
last_updated: "2026-04-01T10:42:01.296Z"
last_activity: 2026-04-01
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 29
  completed_plans: 29
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 05 — admin-reporting

## Current Position

Phase: 05 (admin-reporting) — EXECUTING
Plan: 5 of 6
Status: Ready to execute
Last activity: 2026-04-01

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01-foundation P01 | 11 | 2 tasks | 10 files |
| Phase 01-foundation P02 | 6 | 2 tasks | 9 files |
| Phase 01-foundation P03 | 3 | 2 tasks | 9 files |
| Phase 01-foundation P04 | 18 | 2 tasks | 16 files |
| Phase 01-foundation P05 | 8 | 2 tasks | 7 files |
| Phase 02-product-catalog P02 | 12 | 2 tasks | 6 files |
| Phase 02-product-catalog P04 | 10 | 2 tasks | 11 files |
| Phase 04-online-store P02 | 98s | 2 tasks | 3 files |
| Phase 04-online-store P03 | 6m | 2 tasks | 8 files |
| Phase 04-online-store P07 | 134s | 2 tasks | 4 files |
| Phase 04-online-store P05 | 225s | 2 tasks | 5 files |
| Phase 04-online-store P06 | 93s | 2 tasks | 4 files |
| Phase 05-admin-reporting P02 | 2 | 2 tasks | 3 files |
| Phase 05-admin-reporting P03 | 217 | 3 tasks | 6 files |
| Phase 05-admin-reporting P06 | 15m | 4 tasks | 11 files |
| Phase 05-admin-reporting P04 | 4m | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: Custom JWT claims (store_id + role in app_metadata) — must be configured before any RLS policies are written
- Phase 1: Integer cents throughout (no floats) — schema constraint, cannot change after data exists
- Phase 1: GST must be a pure function with IRD specimen test cases before checkout code is written
- Phase 3/4: Refresh-on-transaction (revalidatePath) over Supabase Realtime for inventory sync
- [Phase 01-foundation]: Tailwind v4 CSS-native config: @theme block in globals.css, no tailwind.config.js
- [Phase 01-foundation]: Bunny Fonts CDN for Satoshi+DM Sans (Satoshi not on Google Fonts)
- [Phase 01-foundation]: iPad viewport: userScalable=false to prevent accidental pinch-zoom on POS
- [Phase 01-foundation]: All monetary columns use INTEGER cents - no DECIMAL/NUMERIC/FLOAT anywhere in schema (enforced at DB level)
- [Phase 01-foundation]: RLS uses auth.jwt()->'app_metadata'->>'store_id' not user table joins - avoids 2-11x performance penalty
- [Phase 01-foundation]: Custom JWT access token hook registered in config.toml - Supabase Auth injects store_id+role into app_metadata on every token
- [Phase 01-foundation]: GST formula Math.round(cents * 3 / 23) confirmed IRD-compliant; per-line on discounted amounts per D-09
- [Phase 01-foundation]: Zod v4 (4.3.6) installed, not v3 as planned — API compatible, no migration needed
- [Phase 01-foundation]: All monetary Zod fields use z.number().int() enforcing integer cents at Server Action boundary
- [Phase 01-foundation]: Admin client uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS during auth bootstrapping before JWT claims exist
- [Phase 01-foundation]: Staff PIN sessions use independent jose JWTs (staff_session httpOnly cookie, 8h) not Supabase Auth
- [Phase 01-foundation]: Owner signup refreshes session after staff record creation to trigger JWT hook for store_id+role claims
- [Phase 01-foundation]: No service worker in Phase 1 — PWA installability on iOS via manifest + HTTPS only per D-11
- [Phase 01-foundation]: CI pipeline 3-job ordering: test (all branches) -> migrate (main) -> deploy (main), strictly sequential with needs:
- [Phase 02-product-catalog]: price_dollars form field (string) converted via parsePriceToCents; price_cents (int) accepted directly — supports both form submission patterns
- [Phase 02-product-catalog]: Image upload outputs WebP regardless of input format — consistent CDN storage, optimal file size at quality 85
- [Phase 02-product-catalog]: papaparse used for both parse and unparse in CSV import — consistent library, no manual CSV string construction
- [Phase 02-product-catalog]: validateImportRows uses empty Sets/Maps in preview step — DB-level duplicate detection happens at insert time in importProducts Server Action
- [Phase 04-online-store]: StoreCartItem omits lineTotalCents/gstCents — computed dynamically in useCart to avoid stale values if formula changes
- [Phase 04-online-store]: isDrawerOpen excluded from localStorage persistence — always starts closed on hydration
- [Phase 04-online-store]: formatNZD is the actual money.ts export (not formatCents as in plan) — used throughout storefront components
- [Phase 04-online-store]: AddToCartButton extracted as isolated client component to maintain server/client boundary on detail page
- [Phase 04-online-store]: CartClearer extracted as isolated client component to keep confirmation page as Server Component while allowing useCart hook access
- [Phase 04-online-store]: Promo current_uses incremented via read-then-write (not RPC) — increment_promo_uses RPC not in generated types; direct update is safe for v1 traffic
- [Phase 04-online-store]: CartDrawer uses window.location.href for Stripe redirect — Server Action returns URL and client-side redirect is required for external Stripe URL
- [Phase 04-online-store]: POSTopBar converted to 'use client' to support usePathname for active nav highlighting (D-15b)
- [Phase 04-online-store]: D-14 email notification deferred from Phase 4 — documented with TODO in updateOrderStatus.ts
- [Phase 05-admin-reporting]: Low-stock filtering done client-side after fetching all active products (small catalog assumption)
- [Phase 05-admin-reporting]: Dashboard orders query includes pending_pickup, ready, collected alongside completed to capture all non-expired revenue
- [Phase 05-admin-reporting]: VALID_STATUSES/VALID_CHANNELS/VALID_PAYMENT_METHODS Sets guard filter URL params before Supabase .eq() to prevent TypeScript enum mismatch and invalid values
- [Phase 05-admin-reporting]: Refund button in OrderDetailDrawer wired to onRefundClick prop only — actual refund logic deferred to Plan 04 (05-04)
- [Phase 05-admin-reporting]: Two-query approach for order_items joins avoids broken cross-table filter in Supabase JS v2
- [Phase 05-admin-reporting]: GST summary from orders.gst_cents not order_items to prevent double-counting
- [Phase 05-admin-reporting]: ExportCSVButton auto-converts _cents keys to _dollars for human-readable CSV
- [Phase 05-admin-reporting]: Refund step replaces drawer content in-place (no new modal) per UI-SPEC; overlay and Escape blocked during refund step

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Verify current Supabase Auth Hooks syntax for custom JWT claims before implementation (was in beta/GA transition at research cutoff)
- Phase 6: Verify Xero OAuth 2.0 scopes and journal entry API format at developer.xero.com before starting Xero work

## Session Continuity

Last session: 2026-04-01T10:42:01.293Z
Stopped at: Phase 6 context gathered
Resume file: .planning/phases/06-xero-integration/06-CONTEXT.md
