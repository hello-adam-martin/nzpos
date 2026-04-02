# Phase 9: Notifications - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated email notifications at key customer and business moments, plus an audible/visual alert on the iPad POS when new online orders arrive. Six requirements: email receipts (online + POS), pickup-ready notification, daily summary with low stock alerts, and order arrival sound.

</domain>

<decisions>
## Implementation Decisions

### Email Design & Branding
- **D-01:** Branded HTML emails using React Email templates via Resend. Emails use the store's design system (deep navy #1E293B + amber #E67E22, Satoshi/DM Sans typography).
- **D-02:** Receipt emails include the full line-item breakdown — every item, quantity, price, discounts, GST breakdown, total, and payment method. Mirrors the on-screen receipt.
- **D-03:** Sender identity: `"Store Name" <noreply@yourdomain.co.nz>`. Requires DNS verification with Resend for the custom domain.
- **D-04:** Pickup-ready email includes order summary, store address, phone number, and opening hours. Customer has everything they need in one email.

### Email Trigger Timing
- **D-05:** Fire-and-forget inline — call Resend API during the webhook/server action but don't await the result. Order completes immediately, email sends in background. No queue infrastructure.
- **D-06:** POS receipt email fires on email capture — the moment staff enters the customer's email on the receipt screen, not on sale completion. Staff can tell the customer "receipt is on its way".
- **D-07:** Online receipt email fires during the Stripe webhook handler after `complete_online_sale` RPC succeeds.
- **D-08:** Pickup-ready email triggers when staff clicks "Mark Ready" in admin order management (status change to `ready`).
- **D-09:** Low stock alerts are included as a section within the daily summary email — one email, not two. No separate low stock notification.

### Daily Summary
- **D-10:** Daily summary sends at 7 AM NZST. Covers the previous day's full trading activity.
- **D-11:** Revenue split is by payment method: EFTPOS, cash, and online (Stripe). Matches the existing cash-up report pattern.
- **D-12:** Top 5 products by quantity sold shown in the daily summary.
- **D-13:** Daily summary always sends, even on zero-sale days. Confirms the system is working.

### Order Sound Alert
- **D-14:** 30-second polling interval with localStorage for state persistence (carried from STATE.md).
- **D-15:** Pleasant retail chime/bell sound — attention-getting but not jarring for customers in the store. Distinct from the barcode scan beep.
- **D-16:** Visual indicator: red badge/dot on the orders nav item showing unread count, plus a brief toast notification with the order total.
- **D-17:** Mute toggle in POSTopBar — small speaker icon that toggles sound on/off, state persisted in localStorage.
- **D-18:** Multiple orders between polls: single chime, toast shows "N new orders", badge shows total unread count.

### Claude's Discretion
- React Email template architecture and component structure
- Resend API integration pattern (SDK vs REST)
- DNS verification workflow documentation
- Polling endpoint implementation (API route design, what data it returns)
- Sound file format, source, and Web Audio API vs HTML5 Audio
- Toast component implementation (existing library vs custom)
- Badge component styling and positioning
- Cron job timezone handling for NZST/NZDT
- Daily summary SQL query structure
- Error handling for failed email sends (logging, retry policy)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Order Completion Flows (Email Trigger Points)
- `src/app/api/webhooks/stripe/route.ts` — Online order completion webhook; email trigger goes after `complete_online_sale` RPC (line ~81)
- `src/actions/orders/completeSale.ts` — POS sale completion server action; receipt data built here
- `src/components/pos/POSClientShell.tsx` — Email capture handler (lines 416-422); POS email trigger point

### Receipt Data (Email Content Source)
- `src/lib/receipt.ts` — `ReceiptData` type and `buildReceiptData()` factory; email templates read from this structure
- `src/schemas/order.ts` — Zod schema including `customer_email` (line 24)

### Store Details (Email Header/Footer)
- `supabase/migrations/001_initial_schema.sql` — Stores table (lines 7-13)
- `supabase/migrations/010_checkout_speed.sql` — Added `address`, `phone`, `gst_number` to stores; `customer_email` and `receipt_data` to orders

### Existing Cron Pattern
- `vercel.json` — Cron job configuration (xero-sync at 1 PM UTC, expire-orders at 2 PM UTC)
- `src/app/api/cron/expire-orders/route.ts` — Example cron handler pattern (auth via CRON_SECRET)

### POS UI (Sound Alert Integration)
- `src/components/pos/POSTopBar.tsx` — Where mute toggle and notification badge will be placed
- `src/components/pos/POSClientShell.tsx` — Polling logic and state management home

### Order Status Management
- `supabase/migrations/006_online_store.sql` — Online order RPCs, order status values
- `src/components/pos/PickupOrderCard.tsx` — Displays customer_email on pickup cards (lines 50-52)

### Database Schema
- `supabase/migrations/005_pos_rpc.sql` — `complete_pos_sale` RPC (needs customer_email awareness)
- `supabase/migrations/002_rls_policies.sql` — RLS policies (cron/webhook handlers use admin client)

### Design System
- `DESIGN.md` — Design system for email branding (navy #1E293B, amber #E67E22, Satoshi + DM Sans)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/receipt.ts` — `ReceiptData` type and `buildReceiptData()` provide structured receipt data that email templates can consume directly
- `src/components/pos/ReceiptScreen.tsx` — Email capture UI with `onEmailCapture` callback already wired up
- `vercel.json` cron pattern — Established pattern for adding daily summary cron job
- `src/app/api/cron/expire-orders/route.ts` — Reference implementation for cron handler (auth, admin client, force-dynamic)

### Established Patterns
- Server Actions for mutations (`src/actions/orders/completeSale.ts`)
- Supabase admin client for webhook/cron handlers (bypass RLS)
- Idempotency via `stripe_events` table for Stripe webhooks
- Zod validation on all server action inputs
- `server-only` imports for server-side modules

### Integration Points
- Stripe webhook handler — add email send after successful `complete_online_sale` RPC
- `POSClientShell.tsx` `onEmailCapture` — add email send when customer email is captured
- Admin order management — add email send on status change to "ready"
- `POSTopBar.tsx` — add mute toggle icon and notification badge
- `POSClientShell.tsx` — add polling hook for new order detection
- `vercel.json` — add daily summary cron entry

</code_context>

<specifics>
## Specific Ideas

- Receipt email mirrors the on-screen receipt exactly — same data, branded HTML presentation
- Pickup email is a self-contained "everything you need" message (order + address + phone + hours)
- Daily summary is the founder's single morning briefing — sales, revenue by payment method, top 5 products, and low stock warnings all in one email
- Order sound is a retail-appropriate chime, not a tech notification — pleasant for a store environment
- Visual badge persists on the orders nav item until staff views the new orders — toast is temporary, badge is sticky

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-notifications*
*Context gathered: 2026-04-02*
