---
phase: 09-notifications
verified: 2026-04-02T22:20:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 09: Notifications Verification Report

**Phase Goal:** Customers are automatically notified at key moments and the founder stays informed without checking the admin dashboard
**Verified:** 2026-04-02T22:20:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Online customer receives email receipt within 60s of Stripe payment confirming | VERIFIED | `src/app/api/webhooks/stripe/route.ts` imports `sendEmail` + `OnlineReceiptEmail`, fires `void sendEmail(...)` after `complete_online_sale` RPC succeeds. Uses `receipt_data` from RPC or fallback join. |
| 2 | POS customer receives email receipt when staff enters their email after the sale | VERIFIED | `src/actions/orders/sendPosReceipt.ts` server action created, wired into `POSClientShell.tsx` `onEmailCapture` callback at line 426. Fires `void sendEmail(...)` with `PosReceiptEmail`. |
| 3 | Customer receives pickup-ready email when order status changes to "ready" | VERIFIED | `src/actions/orders/updateOrderStatus.ts` checks `if (newStatus === 'ready')`, fetches `customer_email`, fires `void sendEmail(...)` with `PickupReadyEmail`. Migration 011 adds `opening_hours` column used by template. |
| 4 | Founder receives daily summary email covering sales count, revenue split, top products, and stock warnings | VERIFIED | `src/app/api/cron/daily-summary/route.ts` queries orders (aggregated by payment method), top products via order_items, and low stock items. Awaits `sendEmail` with `DailySummaryEmail`. Scheduled at `0 19 * * *` in `vercel.json` (UTC 19:00 = NZST 07:00). |
| 5 | iPad plays audible sound within 30 seconds when a new online order arrives | VERIFIED | `src/hooks/useNewOrderAlert.ts` polls `/api/pos/new-orders` every 30 seconds (`POLL_INTERVAL_MS = 30_000`). On new orders: plays `new Audio('/sounds/chime.mp3')`, increments badge, shows toast. `public/sounds/chime.mp3` exists (35,324 bytes). Wired into `POSClientShell` and `POSTopBar`. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Plan | Status | Details |
|----------|------|--------|---------|
| `src/lib/email.ts` | 09-01 | VERIFIED | `import 'server-only'`, `new Resend(RESEND_API_KEY)`, `export async function sendEmail`, error logged without re-throwing |
| `src/emails/OnlineReceiptEmail.tsx` | 09-01 | VERIFIED | Exports `OnlineReceiptEmail`, renders "Thanks for your order", uses `LineItemTable`, `EmailHeader`, `EmailFooter` |
| `src/emails/PosReceiptEmail.tsx` | 09-01 | VERIFIED | Exports `PosReceiptEmail`, renders "Here's your receipt" |
| `src/emails/PickupReadyEmail.tsx` | 09-01 | VERIFIED | Exports `PickupReadyEmail`, renders "Ready for pickup" pill, condensed item list, collection details |
| `src/emails/DailySummaryEmail.tsx` | 09-01 | VERIFIED | Exports `DailySummaryEmail`, hero stats row, revenue by method, top products, conditional low-stock section, zero-sale empty state "No sales yesterday. The system is working." |
| `src/emails/components/EmailHeader.tsx` | 09-01 | VERIFIED | Navy `#1E293B` background, amber `#E67E22` strip |
| `src/emails/components/EmailFooter.tsx` | 09-01 | VERIFIED | `#78716C` muted text |
| `src/emails/components/LineItemTable.tsx` | 09-01 | VERIFIED | `formatNZD` imported, "GST (15%)" row, discount rows |
| `supabase/migrations/011_notifications.sql` | 09-02 | VERIFIED | `ADD COLUMN IF NOT EXISTS opening_hours TEXT` |
| `src/app/api/webhooks/stripe/route.ts` | 09-02 | VERIFIED | `import { sendEmail }`, `import { OnlineReceiptEmail }`, `void sendEmail(` (two paths: receipt_data + fallback) |
| `src/actions/orders/sendPosReceipt.ts` | 09-02 | VERIFIED | `'use server'`, `import 'server-only'`, `export async function sendPosReceipt`, `void sendEmail(` |
| `src/actions/orders/updateOrderStatus.ts` | 09-02 | VERIFIED | `import { sendEmail }`, `import { PickupReadyEmail }`, `if (newStatus === 'ready')`, `void sendEmail(` |
| `src/app/api/cron/daily-summary/route.ts` | 09-03 | VERIFIED | `export const dynamic = 'force-dynamic'`, `CRON_SECRET`, `FOUNDER_EMAIL`, `Pacific/Auckland`, `await sendEmail(`, `DailySummaryEmail(`, `reorder_threshold` |
| `vercel.json` | 09-03 | VERIFIED | Three cron entries: xero-sync 0 13, expire-orders 0 14, daily-summary 0 19 |
| `src/app/api/pos/new-orders/route.ts` | 09-04 | VERIFIED | `resolveStaffAuth`, filters `channel = 'online'`, `status in ('pending_pickup', 'ready')`, `since` query param |
| `src/hooks/useNewOrderAlert.ts` | 09-04 | VERIFIED | `POLL_INTERVAL_MS = 30_000`, `setInterval`, `new Audio('/sounds/chime.mp3')`, `pos_sound_muted`, `pos_last_order_check`, resets badge on `/pos/pickups` |
| `src/components/pos/OrderNotificationBadge.tsx` | 09-04 | VERIFIED | `bg-amber`, `aria-label`, `9+` cap, returns null when count=0 |
| `src/components/pos/MuteToggleButton.tsx` | 09-04 | VERIFIED | `Volume2`/`VolumeX`, `w-11 h-11` (44px touch target), `aria-label` with current-state copy |
| `src/components/pos/NewOrderToast.tsx` | 09-04 | VERIFIED | `fixed bottom-4 right-4`, "New order"/"N new orders" copy, "Tap Pickups to view" |
| `src/components/pos/POSTopBar.tsx` | 09-04 | VERIFIED | Imports `OrderNotificationBadge` and `MuteToggleButton`, `unreadOrderCount` and `onToggleMute` props |
| `src/components/pos/POSClientShell.tsx` | 09-04 | VERIFIED | Imports `useNewOrderAlert`, `NewOrderToast`, `sendPosReceipt`; calls `useNewOrderAlert()`, passes props to `POSTopBar`, renders `{toast && <NewOrderToast .../>}` |
| `public/sounds/chime.mp3` | 09-04 | VERIFIED | 35,324 bytes (WAV data with .mp3 extension — Safari/iOS compatible per plan decision) |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `src/lib/email.ts` | Resend SDK | `new Resend(RESEND_API_KEY)` | WIRED | Line 5: `const resend = new Resend(process.env.RESEND_API_KEY!)` |
| `src/emails/*.tsx` | `@react-email/components` | `from '@react-email/components'` | WIRED | All four templates import `Html`, `Body`, `Container` etc. |
| `src/app/api/webhooks/stripe/route.ts` | `src/lib/email.ts` | `void sendEmail({...})` | WIRED | Lines 108 and 152: `void sendEmail(` with `OnlineReceiptEmail` |
| `src/actions/orders/sendPosReceipt.ts` | `src/lib/email.ts` | `import sendEmail` | WIRED | Line 6: `import { sendEmail } from '@/lib/email'`, line 47: `void sendEmail(` |
| `src/components/pos/POSClientShell.tsx` | `src/actions/orders/sendPosReceipt.ts` | `onEmailCapture calls sendPosReceipt` | WIRED | Line 10 import, line 426: `await sendPosReceipt({ orderId: lastReceiptData.orderId, email })` |
| `src/actions/orders/updateOrderStatus.ts` | `src/lib/email.ts` | `void sendEmail when newStatus === 'ready'` | WIRED | Lines 7-8 imports, line 73: `if (newStatus === 'ready')`, line 94: `void sendEmail(` |
| `src/app/api/cron/daily-summary/route.ts` | `src/lib/email.ts` | `await sendEmail` | WIRED | Line 125: `const result = await sendEmail({` |
| `src/app/api/cron/daily-summary/route.ts` | `src/emails/DailySummaryEmail.tsx` | `import DailySummaryEmail` | WIRED | Line 5: `import { DailySummaryEmail }`, line 128: `react: DailySummaryEmail({...})` |
| `vercel.json` | `/api/cron/daily-summary` | cron schedule entry | WIRED | `"path": "/api/cron/daily-summary"`, `"schedule": "0 19 * * *"` |
| `src/components/pos/POSClientShell.tsx` | `src/hooks/useNewOrderAlert.ts` | `useNewOrderAlert()` | WIRED | Line 4 import, line 57: `const { unreadCount, toast, isMuted, toggleMute } = useNewOrderAlert()` |
| `src/hooks/useNewOrderAlert.ts` | `/api/pos/new-orders` | `fetch every 30 seconds` | WIRED | Line 45: `fetch('/api/pos/new-orders?since=...')`, `setInterval(poll, 30_000)` |
| `src/components/pos/POSTopBar.tsx` | `src/components/pos/MuteToggleButton.tsx` | renders MuteToggleButton | WIRED | Line 10 import, lines 74-76: conditionally renders `<MuteToggleButton .../>` |
| `src/components/pos/POSTopBar.tsx` | `src/components/pos/OrderNotificationBadge.tsx` | renders badge on Pickups link | WIRED | Line 9 import, line 49: `<OrderNotificationBadge count={unreadOrderCount ?? 0} />` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `OnlineReceiptEmail` | `receipt: ReceiptData` | Stripe webhook: `orderData.receipt_data` from DB, or `order_items` join fallback | Yes — Supabase query with product name join | FLOWING |
| `PosReceiptEmail` | `receipt: ReceiptData` | `sendPosReceipt`: `orders.receipt_data` from Supabase (stored at POS completion in Phase 8) | Yes — existing receipt_data from completed POS sale | FLOWING |
| `PickupReadyEmail` | `orderItems`, store fields | `updateOrderStatus`: `orders.customer_email + order_items(products(name))` + `stores` query | Yes — Supabase joins | FLOWING |
| `DailySummaryEmail` | sales/products/lowStock | Cron: `orders` aggregation + `order_items` join + `products` low-stock query | Yes — three Supabase queries with NZ timezone | FLOWING |
| `useNewOrderAlert` → badge/toast/chime | `orders` from polling endpoint | `GET /api/pos/new-orders`: `orders` filtered by channel/status/since from Supabase | Yes — live Supabase query per poll | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 68 phase tests pass | `npx vitest run [7 test files]` | 7 files, 68 tests, all passed, 1.80s | PASS |
| TypeScript compilation (source files) | `npx tsc --noEmit` | 0 source file errors (2 errors in `.next/types/validator.ts` are pre-existing Next.js generated types, not phase-09 code) | PASS |
| chime.mp3 has content | `ls -la public/sounds/chime.mp3` | 35,324 bytes | PASS |
| vercel.json cron schedule | grep daily-summary vercel.json | `"schedule": "0 19 * * *"` | PASS |
| All commits documented in summaries exist in git history | `git log --oneline [8 hashes]` | All 8 commits present | PASS |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| NOTIF-01 | 09-01, 09-02 | Online customer email receipt within 60s of Stripe payment | SATISFIED | Stripe webhook fires `void sendEmail(OnlineReceiptEmail)` after RPC success |
| NOTIF-02 | 09-01, 09-02 | POS customer email receipt if email provided at checkout | SATISFIED | `sendPosReceipt` server action wired to `onEmailCapture` in POSClientShell |
| NOTIF-03 | 09-01, 09-02 | Pickup-ready email on order status change to "ready" | SATISFIED | `updateOrderStatus` sends `PickupReadyEmail` when `newStatus === 'ready'` |
| NOTIF-04 | 09-01, 09-03 | Founder daily summary email (sales count, revenue split, top products, stock warnings) | SATISFIED | Cron at UTC 19:00 sends `DailySummaryEmail` with all four data sections |
| NOTIF-05 | 09-01, 09-03 | Low stock alert batched into daily summary | SATISFIED | `DailySummaryEmail` has conditional `lowStockItems` section; cron queries products below `reorder_threshold` |
| NOTIF-06 | 09-04 | iPad plays sound when new online order arrives within 30s | SATISFIED | `useNewOrderAlert` polls every 30s, plays `chime.mp3`, shows badge and toast |

All 6 requirements satisfied. No orphaned requirements found for Phase 9.

---

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `public/sounds/chime.mp3` | WAV data in .mp3 file | Info | Documented decision: ffmpeg unavailable, WAV data written to .mp3 extension. Safari/iOS WebKit accepts this. Production upgrade to real MP3 encoder noted in summary. Not a functional blocker. |
| `src/app/api/webhooks/stripe/route.ts` | `(item.products as { name: string } | null)` — `any`-adjacent cast | Info | Type cast needed because Supabase's joined type inference loses the nested shape. Not a stub. Standard pattern in this codebase. |

No stub indicators found. No TODO/FIXME comments. No empty return values in rendering paths.

---

### Human Verification Required

#### 1. Email delivery to real inbox (NOTIF-01, NOTIF-02, NOTIF-03)

**Test:** Configure `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, complete a test online purchase via Stripe test mode, check the email address used at checkout.
**Expected:** Branded email receipt with store name, line items, GST breakdown, and order number arrives within 60 seconds.
**Why human:** Cannot verify real Resend API delivery in automated tests. Resend is mocked in all unit tests.

#### 2. POS receipt email via onEmailCapture (NOTIF-02)

**Test:** Complete a POS sale in the running app, reach the receipt screen, enter a valid email address, tap Send.
**Expected:** Email arrives in inbox with "Here's your receipt" heading, correct items and totals.
**Why human:** Requires the running app with a staff session, completed sale, and real email address. Cannot unit-test the full end-to-end path.

#### 3. Daily summary email content quality (NOTIF-04, NOTIF-05)

**Test:** Configure `FOUNDER_EMAIL` and trigger the cron manually via `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/daily-summary`.
**Expected:** Email arrives with yesterday's actual sales, correct revenue totals, top products, and low-stock section (if applicable). Format is readable and branded.
**Why human:** Requires production database data and real Resend delivery.

#### 4. Chime audibility on iPad (NOTIF-06)

**Test:** Load the POS on an iPad (Safari/iOS WebKit). Simulate a new online order arriving by placing a test order on the storefront while logged into the POS. Wait up to 30 seconds.
**Expected:** An audible bell tone plays once, an amber badge appears on the Pickups nav link, and a slide-up toast appears bottom-right.
**Why human:** Audio playback requires a real device — automated tests cannot verify WAV-as-MP3 plays correctly on Safari/iOS WebKit. The summary notes this format works but should be validated on device.

#### 5. Mute toggle persists across page refreshes (NOTIF-06)

**Test:** Tap the mute toggle in POSTopBar (speaker icon becomes muted). Refresh the page. Check that the speaker icon still shows the muted state.
**Expected:** `localStorage.getItem('pos_sound_muted')` returns `'true'` and the icon shows VolumeX after refresh.
**Why human:** localStorage persistence requires a real browser session.

---

## Gaps Summary

No gaps. All five observable truths are verified. All 22 artifacts pass three-level verification (exists, substantive, wired). All 13 key links are confirmed wired. All 6 requirements are satisfied. 68 tests pass. TypeScript compiles clean on source files.

The phase goal — "Customers are automatically notified at key moments and the founder stays informed without checking the admin dashboard" — is achieved in code. The five human verification items listed above are production smoke tests requiring real service credentials and a physical iPad; none represent code deficiencies.

---

_Verified: 2026-04-02T22:20:00Z_
_Verifier: Claude (gsd-verifier)_
