# Domain Pitfalls: NZ Retail POS

**Domain:** Retail POS — Next.js App Router + Supabase + Stripe, NZ market
**Researched:** 2026-04-01
**Confidence note:** Web search and WebFetch unavailable in this session. All findings sourced from training data (cutoff August 2025). Confidence levels reflect depth and stability of each topic in that corpus. Topics like GST rounding and Supabase RLS performance are well-documented and stable — MEDIUM confidence. Topics dependent on very recent library changes are flagged LOW.

---

## Critical Pitfalls

Mistakes that cause rewrites, data integrity failures, or legal/compliance exposure.

---

### Pitfall 1: GST Rounding Applied at Order Total Instead of Per Line

**What goes wrong:**
The subtotal for each line item is calculated correctly, but GST (15%) is extracted from the order total as a single calculation. When discounts apply to individual lines, the per-line GST base differs from what the total implies. The rounding error accumulates across lines and the GST figure on the receipt does not match an IRD-compliant per-line calculation. For a $19.99 item at 20% discount, the discounted price is $15.992 — rounded to $15.99, GST component is $15.99 / 1.15 = $13.9043... → GST = $1.9957, rounds to $2.00. If instead you take the order total and back-calculate GST you get a different cent figure.

**Why it happens:**
Developers treat GST as a display concern and compute it once at the end. NZ prices are always tax-inclusive so it feels natural to just divide the total. IRD's standard requires the GST shown on a tax invoice to reconcile with the supply value stated.

**Consequences:**
- GST invoice values don't reconcile with Xero sync (Xero will flag mismatches)
- IRD audit risk if invoices are systematically off
- Cash-up reconciliation produces unexplained cent differences
- Rounding bugs are invisible in testing with round-number prices, only surface with discounts on odd prices

**Prevention:**
Store all monetary values as integers (cents). Calculate GST per line item: `gst_cents = Math.round(line_total_cents / 115 * 15)`. Sum the per-line GST amounts to get order GST. Never back-calculate from order total. The PROJECT.md already notes "Per-line GST on discounted amounts" as a key decision — implement this as a pure function with a test suite of known IRD-compliant examples before using it anywhere in the codebase.

```typescript
// CORRECT: per-line, integer cents
function gstFromInclusivePrice(centsInclGST: number): number {
  return Math.round(centsInclGST * 15 / 115);
}

// WRONG: back-calc from order total after summing
function gstFromTotal(totalCents: number): number {
  return Math.round(totalCents / 1.15 * 0.15); // rounding error accumulates
}
```

**Detection (warning signs):**
- Cash-up totals have unexplained 1–2 cent discrepancies
- Xero sync producing line mismatch errors
- GST figures look right on whole-dollar items but wrong on odd-cent discounted prices

**Phase:** Foundation / Schema. Define the GST calculation module in Phase 1 before any checkout code is written. Unit-test it with IRD specimen invoice values.

---

### Pitfall 2: Supabase RLS Multi-Tenant Bypass via Missing store_id Constraint

**What goes wrong:**
The schema has `store_id` on every table and the RLS policy checks `store_id = current_setting('app.store_id')::uuid` (or equivalent JWT claim). But one or two tables are missed — typically junction tables, audit logs, or tables added later. A staff member from Store A can read Store B's data through those unprotected tables, or a Server Action that skips the Supabase client and uses `service_role` key leaks tenant data.

**Why it happens:**
RLS policies are set table-by-table. New tables added during development don't automatically inherit policies. Service role connections bypass RLS entirely and are often used for "convenience" in Server Actions without realising the implication. Developers test with a single store and never verify cross-tenant isolation.

**Consequences:**
- Tenant data leakage — a future second-store customer can see first-store inventory, sales, and customer data
- GDPR/Privacy Act 2020 (NZ) exposure
- Silent failure: no error thrown, wrong data silently returned

**Prevention:**
1. Every table MUST have `store_id uuid NOT NULL REFERENCES stores(id)`. Add a DB constraint, not just an application convention.
2. Write a test that creates two stores with separate auth tokens and asserts that queries from Store A return zero rows from Store B's data.
3. Audit service role usage: `service_role` key should only be used in trusted server-side contexts (webhooks, scheduled jobs) where you explicitly filter by `store_id`. Never expose it to client-side code or pass it into generic helpers.
4. Create a Postgres function `assert_store_ownership(store_id uuid)` that raises an exception if the JWT's store claim doesn't match. Call it at the top of any PL/pgSQL function that mutates data.
5. Enable RLS on every table at creation time. Use `ALTER TABLE foo ENABLE ROW LEVEL SECURITY` in every migration. Add a CI check that queries `pg_tables` and fails if any non-system table has `rowsecurity = false`.

**Detection (warning signs):**
- Tests only use a single user/store
- Any Server Action imports `supabaseAdmin` (service role) for routine CRUD
- Tables added in sprint 3+ don't have RLS policies in the migration file

**Phase:** Foundation / Schema (Phase 1). The multi-tenant model must be proven before any feature work lands. Write the cross-tenant isolation test in Phase 1 and keep it in CI permanently.

---

### Pitfall 3: Stripe Webhook Duplicate Event Processing Causing Double Inventory Decrement

**What goes wrong:**
Stripe delivers webhooks at-least-once. Under normal conditions each event arrives once, but on retries (your endpoint returned a 5xx, or timed out) the same `checkout.session.completed` event arrives twice. If the handler is not idempotent, stock is decremented twice, the order is created twice, and the Xero sync sends a duplicate invoice.

**Why it happens:**
Developers write webhook handlers that perform the full business logic (create order, decrement stock, send confirmation) without checking whether the event was already processed. Tests use mocked events that always arrive exactly once.

**Consequences:**
- Inventory goes negative (or to an incorrect level) without a corresponding sale
- Duplicate orders visible in admin dashboard
- Xero receives duplicate line items, causing reconciliation failures
- Customer may receive double confirmation emails (when email receipts are added in v1.1)

**Prevention:**
1. Record every processed Stripe event ID in a `stripe_events` table with a `UNIQUE` constraint on `stripe_event_id`.
2. At the start of every webhook handler, attempt to insert the event ID. If the insert fails with a unique violation, return 200 immediately — the event was already processed.
3. Wrap the entire handler in a Postgres transaction: insert event record + decrement stock + create order all commit together or all roll back.
4. Set a `created_at` on the event record and purge records older than 30 days via a cron job (Supabase pg_cron).

```typescript
// Idempotency guard — first thing in every webhook handler
const { error } = await supabase
  .from('stripe_events')
  .insert({ stripe_event_id: event.id, processed_at: new Date() });

if (error?.code === '23505') {
  // unique violation — already processed
  return new Response('OK', { status: 200 });
}
```

5. Always return 200 to Stripe after successfully processing OR after detecting a duplicate. Never return 4xx for a duplicate (that causes Stripe to retry indefinitely).
6. Verify the webhook signature using `stripe.webhooks.constructEvent(body, sig, secret)` — reject unsigned requests before any DB work.

**Detection (warning signs):**
- Webhook handler has no event deduplication logic
- Handler uses `upsert` on orders instead of `insert` (masks duplicates instead of preventing them)
- No `stripe_events` table in schema
- Stock levels drift from order counts over time

**Phase:** Online Storefront / Stripe integration phase. Build idempotency guard before going live with any payment flow.

---

### Pitfall 4: Supabase RLS Performance Degradation from auth.users Joins in Policies

**What goes wrong:**
A common RLS pattern joins `auth.users` or a separate `user_profiles` table inside the policy to check the store a user belongs to: `auth.uid() IN (SELECT user_id FROM store_members WHERE store_id = orders.store_id)`. This subquery executes on every row evaluated by every query against that table. At modest data sizes (1,000+ orders) queries become noticeably slow (200–800ms added latency per query).

**Why it happens:**
It feels natural to look up permissions in the policy. The Supabase docs show simple uid() checks but don't always warn about the cost of table joins inside policies at the scale a POS system reaches quickly.

**Consequences:**
- POS checkout slows down as the orders table grows — unacceptable in a retail environment
- Reports that scan large tables (end-of-day, stock levels) become unusably slow
- Adding indexes helps but doesn't fully mitigate the per-row policy evaluation cost

**Prevention:**
Use custom JWT claims. At login, embed the user's `store_id` and `role` into the JWT as custom claims. The RLS policy then checks `(auth.jwt() ->> 'store_id')::uuid = orders.store_id` — this is a direct claim lookup with no table join, and Postgres can use it efficiently.

Implementation: Create a Supabase Auth hook (Database Webhook on `auth.users` insert/update, or the newer Auth Hooks feature) that sets custom claims. Store a `users` table in your public schema with `store_id` and call `supabase.auth.admin.updateUserById(uid, { app_metadata: { store_id, role } })` from a trusted server context.

The PROJECT.md already lists "Custom JWT claims for RLS" as a key decision. This must be implemented from the very first migration — retrofitting it later requires updating every RLS policy and re-testing all isolation cases.

**Detection (warning signs):**
- RLS policies contain `SELECT` subqueries or `JOIN`s
- Query times increase linearly as orders/products table row count grows
- Supabase dashboard query analyzer shows "Policy" as a slow node

**Phase:** Foundation / Auth (Phase 1). Non-negotiable. Every RLS policy must use JWT claims from the start.

---

### Pitfall 5: EFTPOS "Phantom Sale" — Terminal Declined but POS Recorded Payment

**What goes wrong:**
Staff taps "Charge EFTPOS" on the POS. The Supabase transaction writes the sale (status: `completed`, payment_method: `eftpos`). The terminal then declines the card (insufficient funds, network timeout, customer cancels). Staff doesn't notice or doesn't know how to handle it. The sale is in the system as paid but no money was collected.

**Why it happens:**
For v1, EFTPOS is a manual/standalone terminal. There is no software confirmation from the terminal. The POS has no way to know whether the terminal approved or declined — it only knows what the staff member tells it. A two-step flow (charge terminal → confirm result → then complete sale) is the only safe architecture.

**Consequences:**
- Inventory decremented for a sale that generated no revenue
- Cash-up shows EFTPOS total that doesn't match the terminal's end-of-day report
- Owner has no audit trail of the discrepancy
- Repeated mistakes can go undetected until end-of-day cash-up

**Prevention:**
1. The sale must NOT be persisted until staff explicitly confirms "Terminal approved". The cart should transition through states: `in_progress` → `awaiting_eftpos_confirmation` → `completed` (or `cancelled`).
2. Show a prominent, full-screen confirmation modal: "Did the EFTPOS terminal approve?" with two visually distinct buttons — "Yes, Approved" (green) and "No, Declined / Cancel" (red). No default action. Staff must make a deliberate choice.
3. The `awaiting_eftpos_confirmation` state should be persisted (not just client-side) so a browser refresh during confirmation doesn't leave orphaned cart state.
4. Log the confirmation event with staff user ID and timestamp for audit purposes.
5. End-of-day report should show EFTPOS transaction count and total — staff reconcile this against the physical terminal printout.

The PROJECT.md already lists "EFTPOS confirmation step" as a key decision. The modal must be impossible to dismiss without an explicit choice — no click-outside-to-close, no back button shortcut.

**Detection (warning signs):**
- EFTPOS payment completes in a single action without a confirmation step
- Cash-up EFTPOS total doesn't match terminal report
- Sale records show `eftpos` payment method without a corresponding `eftpos_confirmed_at` timestamp

**Phase:** POS Checkout phase. Before any EFTPOS flow is shipped, the confirmation state machine must be implemented and tested with manual QA (simulate decline path explicitly).

---

## Moderate Pitfalls

Mistakes that cause operational pain or technical debt requiring significant rework.

---

### Pitfall 6: Next.js App Router Server Actions Without Zod Validation Accepting Malformed Input

**What goes wrong:**
A Server Action receives form data and passes it directly to a Supabase insert. A malformed price (e.g., `"$19.99"` string instead of integer cents), a negative quantity, or a crafted `store_id` in the payload bypasses application logic and either crashes the DB insert or — worse — silently writes corrupt data.

**Why it happens:**
Server Actions feel "safe" because they run server-side, but they accept arbitrary POST bodies. Without explicit validation, any data the client sends is trusted.

**Prevention:**
Define a Zod schema for every Server Action's input. Validate before any business logic. The PROJECT.md already mandates "Zod validation on all Server Actions" — treat this as a linting rule, not an optional practice. Specifically: monetary amounts must be `z.number().int().nonnegative()` (integer cents only), quantities must be `z.number().int().positive()`, and `store_id` must never come from client input (always derived from the authenticated JWT).

**Detection (warning signs):**
- Server Actions that destructure `formData` without a Zod parse step
- Price values stored as floats (NUMERIC/FLOAT column type instead of INTEGER cents)
- `store_id` accepted as a form field

**Phase:** Foundation. Establish the pattern with the first Server Action written. A linting rule or code review checklist item prevents regression.

---

### Pitfall 7: Floating-Point Currency Arithmetic

**What goes wrong:**
`$19.99 * 0.15 = 2.9985000000000004` in JavaScript. When prices and totals are stored as floats (or `NUMERIC` in Postgres treated as float in JavaScript), rounding errors accumulate across a busy trading day. The end-of-day total is off by a few cents from the sum of individual transactions.

**Why it happens:**
JavaScript's `number` type is IEEE 754 double. `NUMERIC` in Postgres is precise but when serialised to JSON and parsed in JS it becomes a float. Developers don't notice in testing because they test with round numbers.

**Prevention:**
Store all monetary values as `INTEGER` (cents) in Postgres. Never store dollars. Do all arithmetic in integer cents. Only convert to display format (`(cents / 100).toFixed(2)`) at the render layer. Use Zod to enforce integer-only input at Server Action boundaries.

**Detection (warning signs):**
- `DECIMAL`, `FLOAT`, or `NUMERIC` column types for price/amount fields
- Any arithmetic like `price * 0.15` on a `number` type in JS
- Cash-up totals with unexplained cent differences

**Phase:** Foundation / Schema. Database schema migration must use `INTEGER` for all monetary columns before any feature work.

---

### Pitfall 8: Supabase Realtime for Inventory Sync Causing WebSocket Failures Under Load

**What goes wrong:**
Supabase Realtime WebSocket connections drop on mobile networks, Safari on iPad (aggressive background tab management), and under certain Supabase free-tier rate limits. A dropped connection means the POS stops receiving stock updates silently — staff oversell without knowing.

**Why it happens:**
Realtime feels like the obvious solution for keeping POS inventory current. The failure mode (silent stale state) is worse than the problem being solved.

**Prevention:**
The PROJECT.md already made the right call: "Refresh-on-transaction over Supabase Realtime." Every time a sale is completed or a product is viewed in the checkout grid, fire a server-side refetch of current stock. This is slightly less "live" but always correct and self-healing. Reserve Realtime (if used at all) for non-critical notifications (e.g., low stock badge update) where a missed event is cosmetic, not transactional.

**Detection (warning signs):**
- Any `supabase.channel().on('postgres_changes', ...)` subscription in the POS checkout flow
- No explicit stock refetch on checkout grid load or sale completion

**Phase:** POS Checkout. Confirm the refresh-on-transaction pattern is implemented before testing iPad-specific behavior.

---

### Pitfall 9: Xero OAuth Token Expiry Causing Silent Sync Failures

**What goes wrong:**
Xero OAuth 2.0 access tokens expire after 30 minutes. Refresh tokens expire after 60 days of inactivity. If the daily sync job runs but the refresh token has expired (owner hasn't used the integration in 2+ months), the sync silently fails — no invoices are sent to Xero, owner doesn't notice for weeks, then has a large manual reconciliation job.

**Why it happens:**
Token expiry is tested at initial build time when tokens are fresh. 60-day expiry isn't hit during development. Production monitoring of sync jobs is often not set up until there's a problem.

**Prevention:**
1. Store Xero tokens in a `xero_connections` table with `access_token`, `refresh_token`, `expires_at`, `refresh_token_expires_at`.
2. Before every sync, check `refresh_token_expires_at`. If within 14 days of expiry, send an email/notification to the owner: "Xero connection needs re-authorisation."
3. After any sync failure due to auth error, set a `connection_status: 'disconnected'` flag and surface it prominently in the admin dashboard — not just a log entry.
4. The daily sync job must write a result record (success/failure/rows_synced) that the admin dashboard can display. Owner should see "Last synced: today at 2:14am — 12 invoices" or "Last sync FAILED — re-connect Xero."

**Detection (warning signs):**
- Xero sync is a fire-and-forget cron job with no result logging
- No admin UI showing last sync status
- No proactive notification of impending token expiry

**Phase:** Xero Integration phase. Build the monitoring UI and failure notification before shipping the integration.

---

### Pitfall 10: click-and-collect Status Transitions Without Atomic Stock Decrement

**What goes wrong:**
An online order arrives. Stock is not decremented at order creation — it's decremented when the order is marked "ready" or "collected." In the meantime, in-store staff sell the same item on the POS (stock shows as available). The online customer arrives to collect their order and the item is out of stock.

**Why it happens:**
Developers conflate "reserved" with "sold." The intent is to hold stock at the point of order, but the implementation delays the decrement until a staff action.

**Prevention:**
Decrement stock atomically at the point of Stripe `checkout.session.completed` (or order creation for cash/EFTPOS). Use a Postgres function with a check constraint: if `stock_quantity - decrement_amount < 0`, raise an exception and roll back. The `PENDING_PICKUP` state means "paid and stock reserved" — not "payment received, stock TBD."

The click-and-collect status model (`PENDING_PICKUP → READY → COLLECTED`) tracks fulfilment state, not inventory state. Keep these concerns separate.

**Detection (warning signs):**
- Stock decrement occurs in a state transition handler (e.g., when marking "ready") rather than at order creation
- No DB-level check preventing negative stock

**Phase:** Online Storefront / Order management. The stock decrement must be in the Stripe webhook handler, wrapped in the same transaction as order creation.

---

### Pitfall 11: iPad POS UX Failures That Frustrate Retail Staff

**What goes wrong (multiple related sub-issues):**

**a) Touch targets too small for gloved or rushed hands**
Buttons under 44px × 44px are fine on desktop but unusable at a checkout register where staff are moving fast or wearing gloves. The product grid is the most common offender.

**b) Keyboard pops up on every quantity/price edit**
iOS Safari shows the software keyboard whenever a numeric input is focused, covering the bottom half of the screen. Staff lose context of the cart while typing a quantity.

**c) No visual feedback on slow operations**
A sale completion might take 500–800ms (Supabase write + stock decrement). If there's no loading state, staff tap the "Complete Sale" button multiple times, creating duplicate orders.

**d) Accidental navigation away from active cart**
If the POS is a standard web app, the browser back button or an accidental swipe gesture can navigate away from an in-progress sale. The cart state may or may not survive (depends on whether it's in URL state, React state, or persisted).

**e) Session timeout mid-shift**
Supabase JWT expires (default 1 hour). Staff are in the middle of a transaction when the session expires. The next Server Action call returns a 401. With no graceful handling, the POS silently fails or shows a JSON error in the UI.

**Prevention:**
- All interactive elements on the POS checkout screen: minimum 48px × 48px touch targets (Apple HIG recommends 44pt minimum).
- Use `inputMode="numeric"` + `pattern="[0-9]*"` on quantity inputs to get the numeric keypad instead of full keyboard on iOS.
- Every async operation (sale completion, product search, stock refetch) must have an explicit loading state that disables the triggering button to prevent double-submission.
- Persist cart state to Supabase (not just React state) so a refresh/accidental navigation restores the active cart.
- Implement session auto-refresh: call `supabase.auth.getSession()` on a 45-minute interval in the POS layout component. Redirect to PIN re-entry (not full logout) on expiry.
- Consider locking the POS view to a single-page layout (no browser chrome) using Progressive Web App (PWA) manifest with `"display": "standalone"`. This eliminates browser back button and address bar.

**Detection (warning signs):**
- Button heights defined in rem/px without an explicit minimum of 44–48px
- `<input type="number">` used without `inputMode="numeric"` on iOS-targeted forms
- "Complete Sale" button not disabled during the async submission
- Cart state stored only in React `useState` with no persistence

**Phase:** POS Checkout UX phase. Run a manual checkout test on an actual iPad (not Chrome DevTools emulation) early — iPad-specific issues are invisible in browser testing.

---

## Minor Pitfalls

Mistakes that create friction but are recoverable without rewrites.

---

### Pitfall 12: CSV Product Import Without Duplicate Detection

**What goes wrong:**
Owner imports a CSV of 200 products. They notice a typo and fix 5 rows, then re-import. Without duplicate detection, all 200 products are duplicated. The POS grid now shows every product twice.

**Prevention:**
Treat `sku` as the natural key. CSV import logic: if a product with matching `sku` exists → update. If not → insert. Surface a preview diff ("5 products will be updated, 195 unchanged, 0 new") before committing.

**Phase:** Product Catalog phase.

---

### Pitfall 13: Missing Compound Indexes for Multi-Tenant Queries

**What goes wrong:**
Every query filters by `store_id` AND another column (e.g., `WHERE store_id = $1 AND category_id = $2`). Without a compound index, Postgres scans the full table filtered by `store_id` first, then filters by `category_id`. At 10K+ products across all tenants this is perceptibly slow on the POS product grid.

**Prevention:**
Index every table as `(store_id, [next_most_common_filter_column])`. For `products`: `(store_id, category_id)` and `(store_id, is_active)`. For `orders`: `(store_id, created_at DESC)`. These indexes also support the RLS policy evaluation efficiently.

**Phase:** Foundation / Schema. Add in the initial migration, not after performance issues appear.

---

### Pitfall 14: Supabase Free Tier Pause After 1 Week Inactivity

**What goes wrong:**
Supabase free tier pauses the database after 1 week of inactivity. During development, if the developer takes a week off, the next time they open the app the database is paused and takes 30–60 seconds to resume. This is invisible until it happens, and in production (before upgrading to Pro) it could affect a live store if there's a quiet week.

**Prevention:**
Upgrade to Supabase Pro ($25/month) before going live with the first real customer. The free tier is suitable for development only. Add a note in the deployment checklist: "Upgrade Supabase to Pro before customer go-live."

**Detection:**
First sign is a 30–60 second cold start on the first request after inactivity.

**Phase:** Deployment / Go-live checklist.

---

### Pitfall 15: Staff PIN Lockout With No Owner Override

**What goes wrong:**
Staff enters wrong PIN 3 times. Account is locked. Owner is not in-store. There is no way for owner to unlock remotely. The POS becomes unusable mid-shift.

**Prevention:**
The PIN lockout must be clearable by the owner from the admin dashboard remotely. Implement: `staff_pin_attempts` counter + `pin_locked_until` timestamp. Owner dashboard shows locked accounts with a one-click unlock. Consider: lockout is time-based (e.g., 15 minutes) rather than permanent, to prevent complete lockout if owner is unreachable.

**Phase:** Auth phase. Design the lockout model to include remote unlock from day one.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema / Foundation | Missing RLS on new tables; float currency columns | CI check for tables without RLS; INTEGER-only monetary columns |
| Auth | Per-request user table join in RLS; PIN lockout with no override | JWT custom claims from day 1; remote unlock in owner dashboard |
| POS Checkout | EFTPOS phantom sale; no loading state on submit; iPad touch targets | Explicit confirmation state machine; disable-on-submit; 48px minimums |
| Inventory | Stock decrement not atomic; Realtime WebSocket silent failures | DB-level check constraint; refresh-on-transaction pattern |
| Online Storefront | Stripe duplicate events; click-and-collect stock not reserved at order | Idempotency table; stock decrement in webhook handler |
| GST / Receipts | Rounding at total instead of per-line | Pure GST function with IRD specimen tests |
| Xero Integration | Silent sync failures; token expiry not surfaced | Sync result logging; proactive expiry notification |
| Product Catalog | CSV import duplicates | SKU-based upsert with preview diff |
| Deployment | Supabase free tier pauses in production | Pro upgrade on go-live checklist |

---

## Sources

All findings based on training data (cutoff August 2025). No live documentation was accessible in this session.

**Topics with HIGH training confidence (stable, well-documented):**
- Stripe webhook idempotency patterns — canonical Stripe documentation, unchanged for years
- Supabase RLS JWT claims performance — documented in Supabase blog posts and GitHub issues, pre-cutoff
- NZ GST IRD rules — IRD.govt.nz published guidance, 15% rate unchanged since 2010
- iOS touch target minimums — Apple Human Interface Guidelines, stable
- Floating-point currency arithmetic — fundamental IEEE 754, not version-dependent

**Topics with MEDIUM training confidence (correct at cutoff, verify before implementation):**
- Supabase Auth Hooks for custom JWT claims — feature was in beta/GA transition around cutoff; verify current implementation syntax at supabase.com/docs
- Xero OAuth 2.0 token lifetime (60-day refresh token) — verify at developer.xero.com as Xero occasionally adjusts this
- Supabase free tier inactivity pause policy — verify current threshold at supabase.com/pricing (was 7 days at cutoff)

**Topics to verify against current docs before implementation:**
- `supabase.com/docs/guides/auth/custom-claims-and-role-based-access-control` — JWT custom claims implementation
- `stripe.com/docs/webhooks/best-practices` — Idempotency and signature verification
- `developer.xero.com/documentation/oauth2/overview` — Token lifetime and refresh flow
