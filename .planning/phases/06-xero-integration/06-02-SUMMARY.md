---
phase: 06-xero-integration
plan: 02
subsystem: api, ui
tags: [xero, xero-node, oauth, supabase-vault, server-actions, zod, integrations-page, admin-ui]

# Dependency graph
requires:
  - phase: 06-xero-integration
    plan: 01
    provides: saveXeroTokens, deleteXeroTokens, getAuthenticatedXeroClient, XeroConnection type, xero_connections table
  - phase: 01-foundation
    provides: createSupabaseServerClient, createSupabaseAdminClient, server-only pattern
  - phase: 05-admin-reporting
    provides: admin layout pattern, AdminSidebar nav link pattern

provides:
  - src/app/api/xero/connect/route.ts — OAuth initiation GET route redirecting to Xero consent URL
  - src/app/api/xero/callback/route.ts — OAuth callback: exchanges code, stores tokens in Vault, creates NZPOS Daily Sales contact, upserts xero_connections
  - src/actions/xero/disconnectXero.ts — Server Action: revokes token, deletes from Vault, sets status=disconnected
  - src/actions/xero/saveXeroSettings.ts — Server Action: Zod-validated save of account codes to xero_connections
  - src/schemas/xero.ts — XeroAccountCodesSchema with cashAccountCode, eftposAccountCode, onlineAccountCode
  - src/app/admin/integrations/page.tsx — Integrations settings page with 3 cards (Xero, Account Codes, Sync Log)
  - src/components/admin/integrations/XeroConnectButton.tsx — 4-state connection widget with inline disconnect confirmation
  - src/components/admin/integrations/XeroAccountCodeForm.tsx — 3-field account codes form with Server Action
  - src/components/admin/integrations/XeroDisconnectBanner.tsx — Persistent warning banner for disconnected/expired Xero
  - src/components/admin/AdminSidebar.tsx (modified) — Integrations nav link added
  - src/app/admin/layout.tsx (modified) — XeroDisconnectBanner conditionally rendered (not shown for null/never-connected per D-06)

affects: [06-03, 06-04, xero-sync, xero-admin-manual-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - as-any cast for Supabase table queries where generated types don't include new tables (xero_connections, xero_sync_log) — same pattern as vault.ts and client.ts
    - Conditional banner in admin layout: query xero_connections in layout.tsx, show banner only for disconnected/token_expired (not null)
    - Inline disconnect confirmation pattern: showConfirm state replaces button with bordered confirmation box (no modal)

key-files:
  created:
    - src/schemas/xero.ts
    - src/app/api/xero/connect/route.ts
    - src/app/api/xero/callback/route.ts
    - src/actions/xero/disconnectXero.ts
    - src/actions/xero/saveXeroSettings.ts
    - src/app/admin/integrations/page.tsx
    - src/components/admin/integrations/XeroConnectButton.tsx
    - src/components/admin/integrations/XeroAccountCodeForm.tsx
    - src/components/admin/integrations/XeroDisconnectBanner.tsx
  modified:
    - src/components/admin/AdminSidebar.tsx (added Integrations nav link)
    - src/app/admin/layout.tsx (added XeroDisconnectBanner conditional render)

key-decisions:
  - "as-any pattern for xero_connections queries in layout.tsx, integrations page, and Server Actions — Supabase generated types don't include new tables until migration applied to live DB; consistent with Plan 01 vault.ts/client.ts approach"
  - "Admin client used in layout.tsx for xero_connections query — avoids RLS restrictions on server-side layout render where store_id from app_metadata is already verified"
  - "XeroSyncButton in integrations page is a disabled placeholder — wired in Plan 04 per spec; opacity-50 with disabled cursor prevents interaction while preserving UI structure"

patterns-established:
  - "Integrations page pattern: 3-card vertical stack (Connection, Account Codes, Sync Log) with max-w-3xl constraint"
  - "Banner pattern: rendered in admin layout above <main>, D-06 rule — null (never connected) shows no banner; only disconnected/token_expired triggers banner"
  - "Inline confirmation pattern: state flag showConfirm replaces action button in-place with bordered confirmation box (no modal, no page navigation)"

requirements-completed: [XERO-01, XERO-05, XERO-06]

# Metrics
duration: 5min
completed: 2026-04-02
---

# Phase 06 Plan 02: Xero OAuth Connect/Disconnect Flow and Integrations Admin Page Summary

**Xero OAuth connect/disconnect with Vault-backed token storage, account code configuration form, and persistent disconnect banner across all admin pages**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-01T19:05:24Z
- **Completed:** 2026-04-01T19:10:35Z
- **Tasks:** 2 tasks
- **Files modified:** 11 (9 created, 2 modified)

## Accomplishments

- Built complete Xero OAuth initiation and callback routes: `/api/xero/connect` redirects to Xero consent; `/api/xero/callback` exchanges code, stores tokens in Vault, creates NZPOS Daily Sales contact, and upserts `xero_connections` row
- Implemented 2 Server Actions (`disconnectXero` and `saveXeroSettings`) with Zod validation, owner auth verification, admin client usage, and `revalidatePath` calls
- Created the `/admin/integrations` page with 3 card sections and 3 new components: `XeroConnectButton` (4 states + inline disconnect confirmation), `XeroAccountCodeForm`, `XeroDisconnectBanner` (amber warning strip, D-06 compliant — not shown for never-connected stores)

## Task Commits

1. **Task 1: OAuth API routes, Server Actions, and Zod schemas** - `844bd00` (feat)
2. **Task 2: Integrations page, Xero components, sidebar link, and disconnect banner in layout** - `898ba45` (feat)

## Files Created/Modified

- `src/schemas/xero.ts` — XeroAccountCodesSchema (cashAccountCode, eftposAccountCode, onlineAccountCode)
- `src/app/api/xero/connect/route.ts` — GET handler: XeroClient buildConsentUrl redirect
- `src/app/api/xero/callback/route.ts` — GET handler: apiCallback, updateTenants, saveXeroTokens, create NZPOS Daily Sales contact, upsert xero_connections
- `src/actions/xero/disconnectXero.ts` — 'use server' + server-only: revoke, deleteXeroTokens, update status, revalidatePath('/admin')
- `src/actions/xero/saveXeroSettings.ts` — 'use server' + server-only: XeroAccountCodesSchema.safeParse, update account codes, revalidatePath('/admin/integrations')
- `src/app/admin/integrations/page.tsx` — Server Component: 3-card layout, xero_connections + xero_sync_log queries, sync log table with status badges
- `src/components/admin/integrations/XeroConnectButton.tsx` — Client Component: 4 connection states, inline disconnect confirmation (Keep Connected / Disconnect Xero)
- `src/components/admin/integrations/XeroAccountCodeForm.tsx` — Client Component: 3 inputs, saveXeroSettings Server Action, success/error feedback
- `src/components/admin/integrations/XeroDisconnectBanner.tsx` — Client Component: amber warning strip (#FEF3C7/#D97706/#92400E), reconnect link to /admin/integrations
- `src/components/admin/AdminSidebar.tsx` — Added `{ href: '/admin/integrations', label: 'Integrations' }` after Cash-Up
- `src/app/admin/layout.tsx` — Added XeroDisconnectBanner; queries xero_connections in layout; shows banner only for disconnected/token_expired (not null per D-06)

## Decisions Made

- **as-any pattern:** `xero_connections` and `xero_sync_log` tables exist in the database (migration 008 applied) but Supabase generated types haven't been regenerated yet. Used `(supabase as any)` consistently, matching the established pattern in vault.ts and client.ts from Plan 01.
- **Admin client in layout.tsx:** The admin layout uses `createSupabaseAdminClient()` for the xero_connections query rather than the server client, to bypass RLS restrictions. The store_id is already verified from the user's app_metadata, so this is safe.
- **XeroSyncButton placeholder:** The manual sync button is rendered as a disabled placeholder in the integrations page for now. It's styled correctly per UI-SPEC but non-functional — wired in Plan 04 (06-04).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **Pre-existing TypeScript errors in sync.test.ts:** The vitest run revealed 5 pre-existing test failures in `src/lib/xero/__tests__/sync.test.ts` (4 timing-related failures, 1 assertion). These were confirmed pre-existing via `git stash` + rerun — not caused by this plan's changes.
- **Supabase generated types gap:** The `xero_connections` and `xero_sync_log` tables don't exist in generated TypeScript types (same issue as Plan 01 vault.ts). Applied `as any` cast pattern consistently across all new files accessing these tables.

## Known Stubs

- **XeroSyncButton in `src/app/admin/integrations/page.tsx`**: The "Sync Today's Sales" button is rendered as a disabled placeholder. It is intentionally non-functional until Plan 04 (06-04) wires up the sync Server Action and feedback state. The UI structure is complete; the interaction logic is deferred.

## Next Phase Readiness

- OAuth connect/disconnect flow is complete and ready for testing with real Xero credentials
- Account codes form saves correctly via Server Action
- Integrations page and sidebar link are in place — Plan 03 (daily sync cron) and Plan 04 (manual sync button) can build on this foundation
- Env vars required: XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI (unchanged from Plan 01 requirements)

## Self-Check: PASSED

Files confirmed present:
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/schemas/xero.ts` — FOUND
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/app/api/xero/connect/route.ts` — FOUND
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/app/api/xero/callback/route.ts` — FOUND
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/actions/xero/disconnectXero.ts` — FOUND
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/actions/xero/saveXeroSettings.ts` — FOUND
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/app/admin/integrations/page.tsx` — FOUND
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/components/admin/integrations/XeroConnectButton.tsx` — FOUND
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/components/admin/integrations/XeroAccountCodeForm.tsx` — FOUND
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/components/admin/integrations/XeroDisconnectBanner.tsx` — FOUND

Commits confirmed:
- `844bd00` feat(06-02): OAuth API routes, Server Actions, and Zod schemas — FOUND
- `898ba45` feat(06-02): integrations page, Xero components, sidebar link, and disconnect banner — FOUND

---
*Phase: 06-xero-integration*
*Completed: 2026-04-02*
