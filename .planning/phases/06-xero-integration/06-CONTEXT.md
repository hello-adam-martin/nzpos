# Phase 6: Xero Integration - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect the NZPOS system to Xero so daily sales sync automatically with correct GST breakdown. Owner connects Xero via OAuth, configures account codes, and sees sync status. Automated overnight sync pushes a daily invoice; manual sync available for today's sales. Token lifecycle managed transparently with reconnect prompts when needed.

</domain>

<decisions>
## Implementation Decisions

### Xero Data Model
- **D-01:** Daily sales represented as a single Xero sales invoice per day (not journal entries, not per-order invoices).
- **D-02:** Invoice line items broken down by payment method: Cash sales total, EFTPOS sales total, Online (Stripe) sales total. Each line includes GST amount using the existing per-line GST formula.
- **D-03:** Owner configures Xero account codes from admin settings (not hardcoded defaults). Settings page allows mapping to their chart of accounts.
- **D-04:** Refunds synced as Xero credit notes against the original invoice day. Proper accounting treatment for GST reports.

### OAuth & Token UX
- **D-05:** Xero connect/disconnect lives on a new "Integrations" section in admin settings. Not on the dashboard.
- **D-06:** Xero disconnection or token expiry triggers a persistent banner alert across all admin pages. Dismissible only by reconnecting.
- **D-07:** Tokens stored in Supabase Vault per XERO-06 requirement (not plain DB columns).

### Sync Strategy
- **D-08:** Automated daily sync via Vercel Cron Job hitting an API route at ~2am NZST. Syncs previous calendar day (midnight-to-midnight NZST).
- **D-09:** On failure: retry 3x with exponential backoff (1min, 5min, 15min). After 3 failures, mark as failed in sync log. Owner sees failure on next admin visit.
- **D-10:** Manual sync button syncs today's sales so far (midnight NZST to now). If synced again later the same day, updates the existing Xero invoice rather than creating a duplicate.
- **D-11:** "Day" boundary is calendar day in NZ timezone (Pacific/Auckland), not cash session based.

### Sync Log & Monitoring
- **D-12:** Sync log displayed on the same Integrations settings page as the Xero connect button. No separate page.
- **D-13:** Each sync log entry shows: date synced, period covered, status (success/failed/pending), total amount, Xero invoice number, error message if failed.

### Claude's Discretion
- Xero OAuth 2.0 scope selection (accounting.transactions, accounting.settings, etc.) — choose minimum required scopes
- Token refresh implementation details (automatic refresh before expiry vs on-demand)
- Sync log table pagination and retention period
- Cron job error notification mechanism (within the banner alert pattern)
- Invoice reference number format for Xero

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — XERO-01 through XERO-06 requirements for this phase

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-09: GST formula `Math.round(cents * 3 / 23)`, per-line on discounted amounts. Xero sync must use same breakdown.
- `.planning/phases/05-admin-reporting/05-CONTEXT.md` — D-05/D-06: Cash session pattern, D-09/D-10/D-11: Reporting data model (sync queries same data)

### Architecture
- `src/lib/supabase/server.ts` — Server-side Supabase client pattern (use for Xero token storage/retrieval)
- `src/lib/supabase/admin.ts` — Admin client with service role key (may be needed for Vault access)
- `src/lib/gst.ts` — GST calculation module (reuse for invoice line item GST amounts)
- `src/lib/money.ts` — Money formatting utilities (formatNZD for display)
- `src/app/api/webhooks/` — Existing API route pattern (model cron endpoint similarly)

### External Documentation
- Xero OAuth 2.0 docs at developer.xero.com — Verify scopes, token refresh, and invoice/credit note API format before implementation
- Vercel Cron Jobs docs — Verify free tier limits and cron syntax

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/gst.ts` — GST calculation module. Reuse for computing GST amounts on invoice line items.
- `src/lib/money.ts` — `formatNZD` for displaying monetary values in sync log.
- `src/lib/supabase/server.ts` / `admin.ts` — Established Supabase client patterns for server-side operations.
- `src/components/admin/AdminSidebar.tsx` — Admin navigation. Add "Settings" or "Integrations" link.
- `src/lib/dateRanges.ts` — Date range utilities from reports. May be reusable for sync period calculations.

### Established Patterns
- Server Actions for mutations (used throughout admin pages)
- API Route Handlers for webhooks (`src/app/api/webhooks/`) — model cron endpoint similarly
- Slide-out drawers for detail views (Phase 2 products, Phase 5 orders)
- Data tables with status badges for list views (orders, products)
- Zod validation on all Server Action inputs

### Integration Points
- Admin sidebar: add Settings/Integrations nav item
- Admin layout: add Xero disconnection banner alert (persistent across pages)
- New admin settings page: `/admin/settings` or `/admin/integrations`
- New API route: `/api/cron/xero-sync` for Vercel Cron
- New DB tables: `xero_connections` (tokens via Vault), `xero_sync_log`
- Orders/sales data: query existing orders table for daily aggregation by payment method

</code_context>

<specifics>
## Specific Ideas

- Account code configuration should be in admin settings alongside the Xero connect button — owner maps their Xero chart of accounts
- Manual sync shows "today so far" and updates existing Xero invoice if re-synced same day (upsert pattern)
- Banner alert for Xero disconnection should be persistent and visible across all admin pages, not just dashboard

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-xero-integration*
*Context gathered: 2026-04-01*
