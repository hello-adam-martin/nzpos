---
phase: 05-admin-reporting
verified: 2026-04-01T00:00:00Z
status: gaps_found
score: 4/5 success criteria verified
re_verification: false
gaps:
  - truth: "Owner can run end-of-day cash-up: report shows totals by payment method, expected cash vs actual float entered, and the variance"
    status: partial
    reason: "Expected vs actual cash and variance are correctly implemented. However, ADMIN-02 requires 'totals by payment method' (i.e., EFTPOS total, Cash total, Stripe total shown side-by-side). The cash-up report only tracks cash specifically; no breakdown of payment method totals is rendered in the UI or computed in the Server Component."
    artifacts:
      - path: "src/app/admin/cash-up/page.tsx"
        issue: "Does not fetch or pass payment method totals breakdown to client"
      - path: "src/components/admin/cash-up/CashUpAdminPageClient.tsx"
        issue: "Session history table shows Opening Float, Expected Cash, Cash Counted, Variance — no column for EFTPOS total or Stripe total per ADMIN-02"
    missing:
      - "Query cash sessions to compute totals by payment method (cash, eftpos, stripe) within the session window"
      - "Add payment method totals columns or summary section to session history table in CashUpAdminPageClient"
      - "Mark ADMIN-02 as Complete in REQUIREMENTS.md traceability table once implemented"
human_verification:
  - test: "Navigate to /admin/cash-up and open a session, make some sales, then close the session"
    expected: "Session history shows variance with correct color coding, and the end-of-day report includes a breakdown of payment method totals (EFTPOS, Cash, Online/Stripe)"
    why_human: "Payment method totals breakdown requires live data and visual inspection"
  - test: "On /admin/orders, click an online order row and trigger the refund flow"
    expected: "RefundConfirmationStep appears in-place within the drawer; Stripe refund is triggered for online orders; order list refreshes with 'Refunded' status badge"
    why_human: "Stripe integration requires live Stripe test keys and actual payment intents"
  - test: "On /admin/reports with the GST Summary tab active, export as CSV"
    expected: "CSV file downloads with dollar amounts (not raw cents) and covers Total Sales, GST Collected, Sales excl. GST per line"
    why_human: "File download behavior requires browser interaction"
---

# Phase 5: Admin & Reporting Verification Report

**Phase Goal:** The owner has a single place to manage orders, handle end-of-day reconciliation, view sales performance, and process refunds
**Verified:** 2026-04-01
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Owner dashboard shows today's sales total and order count split by channel (POS vs online), and flags any products below their reorder threshold | VERIFIED | `src/app/admin/dashboard/page.tsx` queries orders with `in('status', [...])` and `.gte('created_at', todayStart)`, computes posCount/onlineCount from channel field, renders three DashboardHeroCard components and LowStockAlertList |
| 2 | Owner can run end-of-day cash-up: report shows totals by payment method, expected cash vs actual float entered, and the variance | PARTIAL | Expected vs actual cash and variance implemented and wired. "Totals by payment method" (EFTPOS/Cash/Stripe breakdown) absent from both the Server Component data queries and the admin page UI — ADMIN-02 remains marked Pending in REQUIREMENTS.md |
| 3 | Owner can view a sales report for any date range showing daily totals, top products by revenue, and current stock levels | VERIFIED | `src/app/admin/reports/page.tsx` queries orders/order_items/products with date-range filters, aggregates daily totals and top products, renders via ReportsPageClient with SalesBarChart, TopProductsTable, StockLevelsTable, and date preset picker |
| 4 | Owner can view GST period summary with per-line breakdown suitable for IRD filing | VERIFIED | GSTSummaryBlock has Summary and Per-line Detail tabs; summary shows Total Sales, GST Collected, Sales (excl. GST); detail table shows Order ID, Product, Line Amount, GST with navy header; refunded orders shown separately; GST presets (gst_1mo, gst_2mo, gst_6mo) available |
| 5 | Owner can process a full refund on any order; refunded orders appear with refund status in the order list and in reporting | VERIFIED | `processRefund.ts` validates with RefundSchema, calls `stripe.refunds.create` for online orders, updates order status to 'refunded', restores stock optionally; RefundConfirmationStep UI is wired in OrderDetailDrawer; reporting page includes refunded orders in query and displays them separately |

**Score:** 4/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/admin/dashboard/page.tsx` | Real dashboard with server-side data | VERIFIED | 67 lines, Server Component, queries orders and products, renders DashboardHeroCard and LowStockAlertList |
| `src/app/admin/orders/page.tsx` | Paginated order list Server Component | VERIFIED | 79 lines, Server Component, PAGE_SIZE=50, searchParams-driven filters, joins staff and order_items |
| `src/app/admin/cash-up/page.tsx` | Admin cash-up history page | VERIFIED | 90 lines, Server Component, fetches last 10 sessions with staff names, passes currentSession to CashUpAdminPageClient |
| `src/app/admin/reports/page.tsx` | Reports Server Component with date queries | VERIFIED | 183 lines, Server Component, all 5 queries implemented with correct two-query approach for cross-table data |
| `src/actions/orders/processRefund.ts` | Refund Server Action with Stripe | VERIFIED | 'use server' + 'server-only', RefundSchema validation, Stripe refunds.create, status update, stock restoration, revalidatePath |
| `src/actions/cash-sessions/openCashSession.ts` | Open cash session Server Action | VERIFIED | resolveAuth dual-auth, OpenSessionSchema, checks for existing open session, inserts with opened_by |
| `src/actions/cash-sessions/closeCashSession.ts` | Close cash session with variance | VERIFIED | resolveAuth, CloseSessionSchema, fetches cash orders in session window, computes expectedCashCents and varianceCents |
| `src/components/admin/orders/OrderDetailDrawer.tsx` | Order detail slide-out drawer | VERIFIED | 301 lines, 'use client', 480px width, overlay with bg-black/40, translate-x animation, RefundConfirmationStep, click-and-collect transitions, Refund Order button |
| `src/components/admin/orders/RefundConfirmationStep.tsx` | In-drawer refund confirmation UI | VERIFIED | 'use client', reason select, Restock items checkbox, Confirm Refund (amber), Back to Order (ghost), processRefund wired |
| `src/components/admin/reports/GSTSummaryBlock.tsx` | GST summary and per-line detail | VERIFIED | Summary and Per-line Detail tabs, navy active pill, formatNZD throughout, navy header on detail table |
| `src/components/admin/reports/ExportCSVButton.tsx` | CSV export using papaparse | VERIFIED | 'use client', Papa.unparse, Blob download, bg-amber styling, SVG download icon, cents-to-dollars transformation |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/admin/dashboard/page.tsx` | supabase orders table | createSupabaseServerClient query | WIRED | `.from('orders').select('total_cents, channel')` with store_id and status filters |
| `src/app/admin/dashboard/page.tsx` | `src/lib/money.ts` | formatNZD import | WIRED | `import { formatNZD } from '@/lib/money'`, used on totalSalesCents |
| `src/app/admin/orders/page.tsx` | supabase orders table | createSupabaseServerClient with searchParams | WIRED | `select('*, staff(name), order_items(*)')` with pagination range and conditional filters |
| `src/components/admin/orders/OrderFilterBar.tsx` | URL search params | useRouter + useSearchParams | WIRED | Confirmed present in file listing; pattern matches plan spec |
| `src/components/admin/orders/OrderDetailDrawer.tsx` | `src/actions/orders/updateOrderStatus.ts` | Server Action import | WIRED | `import { updateOrderStatus } from '@/actions/orders/updateOrderStatus'`, called in handleStatusTransition |
| `src/actions/orders/processRefund.ts` | `src/lib/stripe.ts` | stripe.refunds.create | WIRED | `stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })` |
| `src/actions/orders/processRefund.ts` | supabase orders table | admin client update status to refunded | WIRED | `.update({ status: 'refunded', notes: reason }).eq('id', orderId)` |
| `src/components/admin/orders/RefundConfirmationStep.tsx` | `src/actions/orders/processRefund.ts` | Server Action call | WIRED | `import { processRefund } from '@/actions/orders/processRefund'`, called in handleConfirm |
| `src/actions/cash-sessions/closeCashSession.ts` | supabase orders table | sum cash payments in session window | WIRED | `.eq('payment_method', 'cash').in('status', ['completed']).gte('created_at', session.opened_at)` |
| `src/app/admin/cash-up/page.tsx` | `src/components/admin/cash-up/CashUpAdminPageClient.tsx` | Server Component passes data | WIRED | `<CashUpAdminPageClient sessions={formattedSessions} currentSession={...} />` |
| `src/app/admin/reports/page.tsx` | supabase orders + order_items tables | createSupabaseServerClient aggregate queries | WIRED | Five separate queries, two-query approach for cross-table data |
| `src/components/admin/reports/SalesBarChart.tsx` | recharts | BarChart import | WIRED | `import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'` |
| `src/components/admin/reports/ExportCSVButton.tsx` | papaparse | Papa.unparse | WIRED | `import Papa from 'papaparse'`, `Papa.unparse(transformed)` |
| `src/components/admin/reports/GSTSummaryBlock.tsx` | gst_cents data | stored values not recalculation | WIRED | Uses `gst_cents` from props passed from server-side query |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `src/app/admin/dashboard/page.tsx` | todayOrders, lowStockProducts | Supabase orders + products tables | Supabase queries with store_id, date, status filters | FLOWING |
| `src/app/admin/orders/page.tsx` | orders, count | Supabase orders table | Paginated query with exact count | FLOWING |
| `src/app/admin/reports/page.tsx` | orders, topItemsRaw, stockLevels | Supabase orders, order_items, products | Five real DB queries, two-query approach for join data | FLOWING |
| `src/app/admin/cash-up/page.tsx` | rawSessions, staffNameMap | Supabase cash_sessions + staff | Admin client queries with store_id filter | FLOWING |
| `src/components/admin/orders/OrderDetailDrawer.tsx` | order (prop) | Passed from OrdersPageClient which receives server-fetched data | Real order data from server Component | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — server-side data fetching requires a running Supabase instance; route components cannot be exercised with static file checks. Behavioral verification routed to human verification items above.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ADMIN-01 | 05-02 | Dashboard shows today's sales total, order count, by channel (POS vs online) | SATISFIED | dashboard/page.tsx queries orders, computes posCount/onlineCount, renders DashboardHeroCard with Today's Sales, Orders Today, POS vs Online |
| ADMIN-02 | 05-05 | End-of-day cash-up report: totals by payment method, expected vs actual cash, variance | BLOCKED | Expected vs actual cash and variance are implemented. "Totals by payment method" breakdown is absent. REQUIREMENTS.md traceability explicitly marks this Pending. The session history table shows Expected Cash / Cash Counted / Variance but no EFTPOS/Stripe/Cash total columns. |
| ADMIN-03 | 05-01, 05-05 | Cash sessions tracked (opening float, close time, closed by) | SATISFIED | Migration 007 creates cash_sessions with opened_by/closed_by. openCashSession and closeCashSession Server Actions insert and update sessions. Admin page displays session history. |
| ADMIN-04 | 05-06 | Basic sales reports: daily totals, top products, stock levels | SATISFIED | reports/page.tsx fetches all three datasets; ReportsPageClient renders SalesSummaryTable, TopProductsTable, StockLevelsTable |
| ADMIN-05 | 05-06 | GST period summary with breakdown for filing | SATISFIED | GSTSummaryBlock has Summary tab (Total Sales, GST Collected, Sales excl. GST) and Per-line Detail tab; GST presets in date picker |
| ADMIN-06 | 05-02 | Low stock alerts on dashboard when products hit reorder threshold | SATISFIED | LowStockAlertList receives filtered products (stock_quantity <= reorder_threshold) from dashboard/page.tsx |
| ADMIN-07 | 05-03 | Order list with status, channel, payment method, staff, date | SATISFIED | orders/page.tsx with searchParams filters, OrderDataTable renders 7 columns per spec, OrderFilterBar filters by status/channel/payment_method/date |
| REF-01 | 05-04 | Owner can process full refund (marks order as refunded) | SATISFIED | processRefund Server Action marks order as refunded, handles Stripe for online orders, supports stock restoration |
| REF-02 | 05-04 | Refunded orders visible in reporting with refund status | SATISFIED | reports/page.tsx query includes 'refunded' status; refundedTotalCents/refundedGSTCents computed and displayed in GSTSummaryBlock; OrderDataTable shows OrderStatusBadge with refunded=error color |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | No TODO/FIXME/placeholder comments detected in verified files | — | — |

No stub implementations, empty returns, or hardcoded placeholder data detected in the verified source files. All components render from real props passed from server-side Supabase queries.

---

### Human Verification Required

#### 1. Payment Method Totals in Cash-Up (ADMIN-02 gap)

**Test:** Open a cash session, process sales with different payment methods (cash, EFTPOS), then close the session and view the session history at /admin/cash-up
**Expected:** Session history should show a breakdown of totals by payment method (Cash: $X, EFTPOS: $X, Online: $X) in addition to the Expected/Actual/Variance columns
**Why human:** Requires live Supabase data, a running POS session, and visual confirmation that the breakdown columns exist

#### 2. Stripe Refund Integration

**Test:** Find a completed online order in /admin/orders that has a stripe_payment_intent_id, open the detail drawer, click Refund Order, select a reason, and click Confirm Refund
**Expected:** Stripe refund is processed; order status updates to Refunded; RefundConfirmationStep disappears; order list refreshes; the order shows a red Refunded badge
**Why human:** Requires live Stripe test credentials and a real payment intent ID

#### 3. CSV Export Download

**Test:** Navigate to /admin/reports, set a date range that includes completed orders, click Export CSV on the Sales Summary or GST sections
**Expected:** A properly formatted CSV file downloads with human-readable dollar values (not raw cent integers) and correct column headers
**Why human:** File download requires browser interaction; Papa.unparse output format cannot be verified from static analysis

#### 4. Cash-Up Variance Color Coding

**Test:** Close a cash session with a counted amount that is more than $5 short of expected (e.g., expected $200, counted $190)
**Expected:** Variance displayed in red (--color-error) in the session history table
**Why human:** Color-coded variance requires real session data and visual inspection

---

### Gaps Summary

One gap blocks full goal achievement:

**ADMIN-02 — Totals by payment method not implemented.** The requirement explicitly states "totals by payment method" as part of the end-of-day cash-up report. The current implementation correctly computes expected cash (opening float + cash sales), actual counted cash, and variance — but does not surface EFTPOS totals, cash totals, or Stripe/online totals as a side-by-side breakdown. This is not a code bug; it is a feature that was planned (05-05-PLAN.md) but the session history table and server-side data fetching for the cash-up page do not include per-payment-method aggregation.

REQUIREMENTS.md explicitly marks ADMIN-02 as `[ ]` (Pending) and the Traceability table shows `Pending`, confirming this was known-incomplete at phase close.

All other 8 requirements (ADMIN-01, ADMIN-03 through ADMIN-07, REF-01, REF-02) are fully implemented with real data flowing from Supabase through verified Server Components to wired client components.

---

_Verified: 2026-04-01_
_Verifier: Claude (gsd-verifier)_
