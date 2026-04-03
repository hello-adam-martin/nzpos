# Phase 9: Notifications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 09-notifications
**Areas discussed:** Email design & branding, Email trigger timing, Daily summary content, Order sound alert UX

---

## Email Design & Branding

### Email Format

| Option | Description | Selected |
|--------|-------------|----------|
| Branded HTML | HTML emails with store logo, navy/amber design system colors, structured layout. React email templates via Resend. | ✓ |
| Simple HTML | Clean HTML with basic formatting but no heavy branding. | |
| Plain text | No HTML at all. Maximum compatibility, zero design effort. | |

**User's choice:** Branded HTML
**Notes:** None

### Receipt Detail Level

| Option | Description | Selected |
|--------|-------------|----------|
| Full receipt | Mirror on-screen receipt: every line item, quantities, prices, discounts, GST breakdown, total, payment method. | ✓ |
| Summary only | Just total, payment method, date, and order ID. | |

**User's choice:** Full receipt
**Notes:** None

### Sender Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Store name + noreply | From: "Store Name" <noreply@yourdomain.co.nz>. Requires DNS verification with Resend. | ✓ |
| Store name + Resend domain | From: "Store Name" <noreply@resend.dev>. Works immediately, no DNS setup. | |
| You decide | Claude picks based on simplicity for v1.1 launch. | |

**User's choice:** Store name + noreply (custom domain)
**Notes:** None

### Pickup Email Content

| Option | Description | Selected |
|--------|-------------|----------|
| Order details + store info | Include order summary, store address, phone number, and opening hours. | ✓ |
| Minimal notification | Just "Your order #X is ready for pickup at Store Name". | |
| You decide | Claude picks the right level of detail. | |

**User's choice:** Order details + store info
**Notes:** None

---

## Email Trigger Timing

### Send Method

| Option | Description | Selected |
|--------|-------------|----------|
| Fire-and-forget inline | Call Resend API during webhook/server action, don't await result. No queue infrastructure. | ✓ |
| Await inline | Send email and wait for Resend confirmation before completing response. | |
| Separate cron/queue | Mark orders as "needs_email", process via cron job. | |

**User's choice:** Fire-and-forget inline
**Notes:** None

### POS Email Trigger Point

| Option | Description | Selected |
|--------|-------------|----------|
| On email capture | Email fires when staff enters customer email on receipt screen. | ✓ |
| On sale completion | Email fires during completeSale, only if email provided upfront. | |
| You decide | Claude picks best trigger point. | |

**User's choice:** On email capture
**Notes:** None

### Low Stock Alert Batching

| Option | Description | Selected |
|--------|-------------|----------|
| Include in daily summary | Low stock warnings as a section of daily summary email. One email. | ✓ |
| Separate daily email | Dedicated low stock alert at different time. | |
| Real-time per product | Email fires immediately per product below threshold. | |

**User's choice:** Include in daily summary
**Notes:** None

### Pickup-Ready Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Admin status change | Triggers when staff clicks "Mark Ready" in admin order management. | ✓ |
| You decide | Claude determines best trigger point. | |

**User's choice:** Admin status change
**Notes:** None

---

## Daily Summary Content

### Send Time

| Option | Description | Selected |
|--------|-------------|----------|
| 7 AM NZST | Founder sees it before store opens. Covers yesterday. | ✓ |
| 6 PM end of day | Summary after closing. | |
| You decide | Claude picks sensible time. | |

**User's choice:** 7 AM NZST
**Notes:** None

### Revenue Split Definition

| Option | Description | Selected |
|--------|-------------|----------|
| By payment method | EFTPOS, cash, and online (Stripe). Matches cash-up report. | ✓ |
| By channel | POS total vs online storefront total. | |
| Both | Channel split AND payment method breakdown. | |

**User's choice:** By payment method
**Notes:** None

### Top Products Count

| Option | Description | Selected |
|--------|-------------|----------|
| Top 5 | Quick glance at best sellers. | ✓ |
| Top 10 | More comprehensive view. | |
| You decide | Claude picks reasonable number. | |

**User's choice:** Top 5
**Notes:** None

### Zero-Sale Days

| Option | Description | Selected |
|--------|-------------|----------|
| Always send | Consistent cadence. Confirms system is working. | ✓ |
| Skip zero-sale days | No email if nothing happened. | |

**User's choice:** Always send
**Notes:** None

---

## Order Sound Alert UX

### Sound Type

| Option | Description | Selected |
|--------|-------------|----------|
| Retail chime | Pleasant bell/chime sound. Not jarring for store customers. | ✓ |
| Simple beep | Short functional beep. Distinct from barcode scan beep. | |
| You decide | Claude picks appropriate sound. | |

**User's choice:** Retail chime
**Notes:** None

### Visual Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Badge + toast | Red badge on orders nav + brief toast with order total. Persistent + temporary. | ✓ |
| Toast only | Temporary banner that disappears. | |
| Sound only | No visual component. | |

**User's choice:** Badge + toast
**Notes:** None

### Mute Control

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, in POS top bar | Speaker icon toggle, state in localStorage. | ✓ |
| No mute toggle | Staff uses iPad system volume. | |
| You decide | Claude decides based on simplicity. | |

**User's choice:** Mute toggle in POSTopBar
**Notes:** None

### Multiple Orders Between Polls

| Option | Description | Selected |
|--------|-------------|----------|
| Single chime + count | One chime, toast shows "N new orders", badge shows unread count. | ✓ |
| Chime per order | Play chime once per new order. | |
| You decide | Claude picks for retail environment. | |

**User's choice:** Single chime + count
**Notes:** None

---

## Claude's Discretion

- React Email template architecture and component structure
- Resend API integration pattern (SDK vs REST)
- DNS verification workflow documentation
- Polling endpoint implementation details
- Sound file format, source, and playback API
- Toast component implementation
- Badge component styling
- Cron job timezone handling
- Daily summary SQL queries
- Error handling for failed email sends

## Deferred Ideas

None — discussion stayed within phase scope
