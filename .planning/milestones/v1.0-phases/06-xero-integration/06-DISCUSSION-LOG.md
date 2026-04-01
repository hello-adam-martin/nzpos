# Phase 6: Xero Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 06-xero-integration
**Areas discussed:** Xero data model, OAuth & token UX, Sync strategy, Sync log & monitoring

---

## Xero Data Model

### Xero Entity Type

| Option | Description | Selected |
|--------|-------------|----------|
| Single invoice | One sales invoice per day summarising total sales with GST line items. Most common for POS systems. | ✓ |
| Journal entry | Debit/credit journal posting. More accounting-precise but harder to set up. | |
| Invoice per order | One Xero invoice per individual sale. Granular but creates hundreds of records daily. | |

**User's choice:** Single invoice
**Notes:** Matches XERO-02 requirement directly.

### Account Codes

| Option | Description | Selected |
|--------|-------------|----------|
| Sensible defaults | Use Xero's standard account codes (200 = Sales, GST on Income). Zero config needed. | |
| Owner configures in admin | Settings page where owner maps to their Xero chart of accounts. | ✓ |

**User's choice:** Owner configures in admin
**Notes:** Owner wants control over which Xero accounts sales map to.

### Invoice Line Item Breakdown

| Option | Description | Selected |
|--------|-------------|----------|
| By payment method | Lines: Cash, EFTPOS, Online (Stripe) totals. Each with GST. Matches cash-up report. | ✓ |
| By channel only | Lines: POS total, Online total. Simpler but loses payment method detail. | |
| By product category | Lines grouped by category. More granular but changes as categories are added. | |

**User's choice:** By payment method
**Notes:** None.

### Refund Handling in Xero

| Option | Description | Selected |
|--------|-------------|----------|
| Credit note | Xero credit note against the original invoice day. Proper accounting treatment. | ✓ |
| Negative line on next sync | Subtract refund from next day's invoice. Simpler but distorts daily totals. | |

**User's choice:** Credit note
**Notes:** None.

---

## OAuth & Token UX

### Connect Button Location

| Option | Description | Selected |
|--------|-------------|----------|
| Settings page | New 'Integrations' section in admin settings. Keeps dashboard clean. | ✓ |
| Dashboard card | Xero status card on main dashboard with connect button. | |
| Both | Settings for config, dashboard status indicator linking to settings. | |

**User's choice:** Settings page
**Notes:** None.

### Token Expiry Communication

| Option | Description | Selected |
|--------|-------------|----------|
| Banner alert | Persistent warning banner across admin pages. Dismissible only by reconnecting. | ✓ |
| Dashboard warning only | Warning on dashboard page only. Less intrusive but easy to miss. | |
| Email notification | Send email when Xero disconnects. Adds email infrastructure complexity. | |

**User's choice:** Banner alert
**Notes:** None.

---

## Sync Strategy

### Automated Sync Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Cron | Vercel Cron Job hits API route at ~2am NZST daily. Free tier supports 2 cron jobs. | ✓ |
| Supabase pg_cron | Database-level cron calls Edge Function. Adds complexity. | |
| Manual only for v1 | No automated sync. Simpler but defeats automation goal. | |

**User's choice:** Vercel Cron
**Notes:** None.

### Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Retry 3x then alert | Exponential backoff (1min, 5min, 15min). After 3 failures, mark failed in log. | ✓ |
| Fail silently, retry next day | Try again tomorrow with both days' data. Owner may not know sync is behind. | |
| Fail and require manual retry | Mark failed, owner must click Retry. Full control but adds friction. | |

**User's choice:** Retry 3x then alert
**Notes:** None.

### Day Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Calendar day NZST | Midnight-to-midnight NZ time. Matches how owner thinks about 'yesterday's sales'. | ✓ |
| Cash session based | Sync covers period of last closed cash session. Couples sync to cash-up workflow. | |

**User's choice:** Calendar day NZST
**Notes:** None.

### Manual Sync Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Today so far | Syncs midnight NZST to now. Updates same Xero invoice if synced again later. | ✓ |
| Last completed day only | Only pushes yesterday if not yet synced. Can't sync today's sales until tomorrow. | |

**User's choice:** Today so far
**Notes:** None.

---

## Sync Log & Monitoring

### Log Location

| Option | Description | Selected |
|--------|-------------|----------|
| Integrations settings page | Table on same page as Xero connect button. All Xero info in one place. | ✓ |
| Dedicated sync page | Separate /admin/xero-sync page. More room but adds nav item. | |

**User's choice:** Integrations settings page
**Notes:** Consistent with settings page decision for OAuth.

### Log Detail Level

| Option | Description | Selected |
|--------|-------------|----------|
| Essentials | Date, period, status, total amount, Xero invoice number, error if failed. | ✓ |
| Detailed with line items | Above plus expandable row showing line items sent to Xero. | |
| You decide | Claude picks appropriate detail level. | |

**User's choice:** Essentials
**Notes:** None.

---

## Claude's Discretion

- Xero OAuth 2.0 scope selection
- Token refresh implementation details
- Sync log table pagination and retention
- Cron job error notification mechanism
- Invoice reference number format

## Deferred Ideas

None — discussion stayed within phase scope.
