# Phase 9: Notifications - Research

**Researched:** 2026-04-02
**Domain:** Email delivery (Resend + React Email), Vercel cron jobs, Web Audio API / browser polling
**Confidence:** HIGH

## Summary

Phase 9 adds six notification capabilities: two email receipts (online Stripe webhook + POS capture), a pickup-ready email, a daily summary email with low stock section, and an audible/visual order alert on the iPad. The email stack is Resend SDK + React Email component templates. The alert stack is a 30-second polling API route with Web Audio API playback and localStorage state persistence. All trigger points are already stubbed in the codebase — this phase wires them up.

The architecture is straightforward: no queue infrastructure is needed. Resend is fire-and-forget inline (D-05). The daily summary uses a new Vercel cron entry at UTC 19:00 (= NZST 07:00, safe year-round). `updateOrderStatus.ts` already has a TODO comment marking the exact pickup-ready email insertion point.

**Primary recommendation:** Install `resend` + `react-email` + `@react-email/components` + `@react-email/render`, add `serverExternalPackages` to `next.config.ts`, create email templates in `src/emails/`, and send via inline fire-and-forget calls at the four existing trigger points.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Email Design & Branding**
- D-01: Branded HTML emails using React Email templates via Resend. Emails use the store's design system (deep navy #1E293B + amber #E67E22, Satoshi/DM Sans typography).
- D-02: Receipt emails include the full line-item breakdown — every item, quantity, price, discounts, GST breakdown, total, and payment method. Mirrors the on-screen receipt.
- D-03: Sender identity: `"Store Name" <noreply@yourdomain.co.nz>`. Requires DNS verification with Resend for the custom domain.
- D-04: Pickup-ready email includes order summary, store address, phone number, and opening hours. Customer has everything they need in one email.

**Email Trigger Timing**
- D-05: Fire-and-forget inline — call Resend API during the webhook/server action but don't await the result. Order completes immediately, email sends in background. No queue infrastructure.
- D-06: POS receipt email fires on email capture — the moment staff enters the customer's email on the receipt screen, not on sale completion.
- D-07: Online receipt email fires during the Stripe webhook handler after `complete_online_sale` RPC succeeds.
- D-08: Pickup-ready email triggers when staff clicks "Mark Ready" in admin order management (status change to `ready`).
- D-09: Low stock alerts are included as a section within the daily summary email — one email, not two. No separate low stock notification.

**Daily Summary**
- D-10: Daily summary sends at 7 AM NZST. Covers the previous day's full trading activity.
- D-11: Revenue split is by payment method: EFTPOS, cash, and online (Stripe).
- D-12: Top 5 products by quantity sold shown in the daily summary.
- D-13: Daily summary always sends, even on zero-sale days.

**Order Sound Alert**
- D-14: 30-second polling interval with localStorage for state persistence.
- D-15: Pleasant retail chime/bell sound — attention-getting but not jarring. Distinct from the barcode scan beep.
- D-16: Visual indicator: red badge/dot on the orders nav item showing unread count, plus a brief toast notification with the order total.
- D-17: Mute toggle in POSTopBar — small speaker icon that toggles sound on/off, state persisted in localStorage.
- D-18: Multiple orders between polls: single chime, toast shows "N new orders", badge shows total unread count.

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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTIF-01 | Online customer receives email receipt within 60s of Stripe payment | Resend fire-and-forget in stripe webhook after RPC success (line ~90 of route.ts) — 60s target is trivially met inline |
| NOTIF-02 | POS customer receives email receipt if email provided at checkout | `onEmailCapture` callback in POSClientShell.tsx (lines 416-422) — call a new server action from this callback |
| NOTIF-03 | Customer receives pickup-ready email when order status changes to "ready" | `updateOrderStatus.ts` has a TODO comment at the exact insertion point |
| NOTIF-04 | Founder receives daily summary email (sales count, revenue split, top products, stock warnings) | New Vercel cron at UTC 19:00 + new cron route handler + Supabase aggregation query |
| NOTIF-05 | Founder receives low stock email when product drops below reorder_threshold (batched daily) | Bundled into NOTIF-04 daily summary per D-09 — same cron, same email, low stock section |
| NOTIF-06 | iPad plays sound when new online order arrives (within 30s) | New polling API route + useEffect in POSClientShell.tsx + Web Audio API + POSTopBar badge/mute |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16.2 App Router (Server Components, Server Actions, Route Handlers)
- **Database:** Supabase (use admin client for webhook/cron handlers to bypass RLS)
- **Validation:** Zod `z.safeParse()` on all Server Action inputs — mandatory
- **Auth guard:** `server-only` import in all server-side modules
- **Testing:** Vitest for unit tests (jsdom environment, mock `server-only` + `next/cache` + `next/headers`), Playwright for E2E
- **No Prisma, no Zustand, no ORM** — Supabase JS client is the data layer
- **Tailwind v4** — CSS-native config, no `tailwind.config.js`
- **Design system:** Always read DESIGN.md before UI decisions (navy #1E293B, amber #E67E22, Satoshi/DM Sans)

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | 6.10.0 (latest) | Email delivery API | Resend is the standard transactional email choice for Next.js. Native React Email integration via `react:` prop. SDK returns `{ data, error }` — no exceptions needed. |
| react-email | 5.2.10 (latest) | Email template authoring + preview server | React components for email; handles cross-client compatibility. Owned by Resend team. |
| @react-email/components | 1.0.11 (latest) | Primitive components (Html, Head, Body, Container, etc.) | The component library used inside template files — replaces raw HTML tables. |
| @react-email/render | 2.0.5 (latest) | Converts React Email component to HTML string | Used when you need the HTML string directly (not using `react:` prop). Async-first API. |

**Note on `react:` prop vs `@react-email/render`:** Resend SDK accepts `react: EmailTemplate({ ...props })` directly and handles rendering internally. Use this approach — it is cleaner and avoids an extra async render step. Only use `@react-email/render` if you need the HTML string for another purpose (e.g., plain-text fallback generation).

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns-tz | 3.2.0 (already installed) | Timezone-aware date formatting | Format dates as NZST/NZDT in email templates and cron scheduling logic |
| lucide-react | 1.7.0 (already installed) | Speaker icon for mute toggle | Use `Volume2` / `VolumeX` icons in POSTopBar |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend SDK | REST calls to `api.resend.com/emails` | SDK provides TypeScript types, handles retries, simpler error handling — use SDK |
| `react:` prop | `@react-email/render` + `html:` prop | `react:` prop is simpler and idiomatic — use it unless you need raw HTML |
| Web Audio API | HTML5 `<audio>` element | HTML5 Audio is simpler; Web Audio API adds unnecessary complexity for a simple chime. Use `new Audio('/sounds/chime.mp3')` — but guard with `typeof window !== 'undefined'` for SSR safety |

**Installation:**
```bash
npm install resend react-email @react-email/components @react-email/render
```

**Version verification (confirmed 2026-04-02 via npm registry):**
- resend: 6.10.0
- react-email: 5.2.10
- @react-email/components: 1.0.11
- @react-email/render: 2.0.5

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── emails/                    # All React Email templates
│   ├── components/            # Shared email sub-components (EmailHeader, EmailFooter, LineItemTable)
│   ├── OnlineReceiptEmail.tsx # NOTIF-01
│   ├── PosReceiptEmail.tsx    # NOTIF-02
│   ├── PickupReadyEmail.tsx   # NOTIF-03
│   └── DailySummaryEmail.tsx  # NOTIF-04 + NOTIF-05
├── lib/
│   └── email.ts               # Resend client singleton + sendEmail() helper
├── app/api/
│   ├── cron/
│   │   └── daily-summary/route.ts   # NOTIF-04+05 — new cron handler
│   └── pos/
│       └── new-orders/route.ts      # NOTIF-06 — polling endpoint
public/
└── sounds/
    └── chime.mp3              # NOTIF-06 — order arrival sound
```

### Pattern 1: Resend Email Module (`src/lib/email.ts`)
**What:** A singleton Resend client + a typed helper that wraps `resend.emails.send()` and logs errors without throwing.
**When to use:** All four email trigger points import from here.
```typescript
// Source: resend.com/docs/send-with-nextjs (verified 2026-04-02)
import 'server-only'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendEmail(params: {
  to: string
  subject: string
  react: React.ReactElement
}): Promise<void> {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_ADDRESS!,   // e.g. "Store Name <noreply@yourdomain.co.nz>"
    to: params.to,
    subject: params.subject,
    react: params.react,
  })
  if (error) {
    // Log but never throw — email failure must not break the primary transaction
    console.error('[email] Send failed:', error)
  }
}
```

### Pattern 2: Fire-and-Forget Inline (D-05)
**What:** Call `sendEmail()` without awaiting inside a webhook/server action. The primary flow completes first.
**When to use:** All inline email triggers (online receipt, POS receipt, pickup-ready).
```typescript
// After successful RPC — do NOT await, do NOT block the response
void sendEmail({
  to: customerEmail,
  subject: 'Your receipt from ' + storeName,
  react: OnlineReceiptEmail({ receipt }),
})
```
**Important:** `void` is intentional and documents the intent. Use it consistently. The `sendEmail` helper logs errors internally so they are still observable.

### Pattern 3: Polling API Route (NOTIF-06)
**What:** A lightweight GET route that returns new orders since a given timestamp.
**When to use:** POSClientShell polls this every 30 seconds.
```typescript
// src/app/api/pos/new-orders/route.ts
export async function GET(req: NextRequest) {
  // Auth: verify staff_session cookie (use resolveStaffAuth)
  // Query: orders WHERE store_id = ? AND channel = 'online' AND status = 'pending_pickup'
  //        AND created_at > since param
  // Return: { orders: [{ id, total_cents, created_at }], serverTime: ISO }
}
```
The client stores `lastCheckedAt` in localStorage. On each poll, it sends `?since=<lastCheckedAt>` and updates the stored value to `serverTime` from the response.

### Pattern 4: React Email Template Structure
```tsx
// Source: react.email/docs (verified via npm package + WebSearch 2026-04-02)
import { Html, Head, Body, Container, Section, Text, Hr } from '@react-email/components'

export function OnlineReceiptEmail({ receipt }: { receipt: ReceiptData }) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: '#FAFAF9', fontFamily: 'DM Sans, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Navy header */}
          <Section style={{ backgroundColor: '#1E293B', padding: '24px' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: 700 }}>{receipt.storeName}</Text>
          </Section>
          {/* Line items */}
          {receipt.items.map(item => (
            <Section key={item.productId}>
              <Text>{item.productName} × {item.quantity}</Text>
              <Text>{formatNZD(item.lineTotalCents)}</Text>
            </Section>
          ))}
          {/* GST summary */}
          <Hr />
          <Text>GST (15%): {formatNZD(receipt.gstCents)}</Text>
          <Text style={{ fontWeight: 700 }}>Total: {formatNZD(receipt.totalCents)}</Text>
        </Container>
      </Body>
    </Html>
  )
}
```
**Note on fonts:** Email clients do not load web fonts from Bunny Fonts or Google Fonts reliably. Use system font stacks in email templates: `'DM Sans', 'Helvetica Neue', Arial, sans-serif`. The branding color palette works fine.

### Pattern 5: Cron Handler (Daily Summary)
```typescript
// src/app/api/cron/daily-summary/route.ts
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Auth: CRON_SECRET Bearer token (matches existing expire-orders pattern)
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  // Query: yesterday's sales aggregated by payment_method
  // Query: top 5 products by quantity from order_items (yesterday)
  // Query: products WHERE stock_quantity <= reorder_threshold
  // Send DailySummaryEmail to founder
}
```

**vercel.json cron entry — NZST 7 AM:**
NZST is UTC+12, NZDT is UTC+13. To reliably hit "morning NZ time", schedule at UTC 19:00 (= 7 AM NZST, 8 AM NZDT). This is safe year-round without daylight saving adjustments.
```json
{
  "path": "/api/cron/daily-summary",
  "schedule": "0 19 * * *"
}
```

### Pattern 6: Order Sound Alert (NOTIF-06)
```typescript
// In POSClientShell.tsx (client component)
// HTML5 Audio — simpler than Web Audio API for a one-shot chime
const playChime = () => {
  if (typeof window === 'undefined') return
  const audio = new Audio('/sounds/chime.mp3')
  audio.play().catch(() => {
    // Autoplay blocked — requires prior user interaction. This is expected on first load.
    // The mute toggle (which is a user interaction) primes the audio context.
  })
}
```
**Autoplay policy:** Browsers block autoplay until the user interacts with the page. The POS requires staff login (a user interaction), so audio will be unblocked after login. No special workaround needed in practice.

### Anti-Patterns to Avoid
- **Awaiting email sends in critical paths:** Never `await sendEmail()` in a webhook handler or POS server action. Email failure would fail the transaction. Always fire-and-forget.
- **Inline Resend client construction:** Don't `new Resend(key)` in each handler — create the singleton in `src/lib/email.ts` and import the `sendEmail()` helper.
- **Using React Email `@react-email/tailwind`:** This package imports `react-dom/server` and requires `serverExternalPackages` config. Avoid it — use inline styles and the color variables directly. The design system colors are simple enough to hardcode.
- **Sending emails from client components:** All email sends must be server-side (webhook handlers, server actions, cron route handlers). Never call the Resend API from client code.
- **Polling without cleanup:** The `setInterval` in `useEffect` must return a cleanup function calling `clearInterval`. Failure causes duplicate polls after hot reload.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML email rendering | Custom HTML templates with table layouts | `@react-email/components` | Email client quirks (Outlook, Gmail) require table-based layout, inline styles, and specific attribute handling — react-email handles all of this |
| Email cross-client compatibility | CSS media queries, web fonts in email | React Email inline styles + system fonts | CSS classes are stripped by most email clients |
| Transactional email delivery | SMTP server, SES integration, custom retry logic | Resend SDK | Bounce handling, deliverability reputation, DKIM/SPF — all managed by Resend |
| Custom toast notifications | DIY toast component | Lightweight inline toast using React state + Tailwind | A full toast library (react-hot-toast, sonner) is acceptable but adds a dependency for a small feature — a simple state-based toast with Tailwind is sufficient given the POS already manages complex UI state |

**Key insight:** Email HTML is a different rendering target from browser HTML. The entire point of React Email is to abstract away the table-based, inline-style, quirky email rendering environment. Never bypass it.

---

## Runtime State Inventory

> This is a greenfield addition phase — no rename/refactor triggers apply. Skipping full inventory.

**Relevant state items:**
- `orders.customer_email` column: already exists (migration 010). No schema changes needed for email triggers.
- `orders.receipt_data` JSONB column: already populated by `completeSale.ts`. Online orders need receipt_data verified — the Stripe webhook currently does NOT build or store receipt_data. The planner should note this gap.
- `products.reorder_threshold` column: confirmed in STATE.md — column name is `reorder_threshold` (not `low_stock_threshold`).
- localStorage keys: new keys `pos_last_order_check`, `pos_sound_muted` — no migration needed (client-side only).

---

## Common Pitfalls

### Pitfall 1: next.config.ts Missing `serverExternalPackages`
**What goes wrong:** Build fails or runtime error when importing `@react-email/components` or `@react-email/render` in Server Components / Route Handlers. Error message references `react-dom/server` incompatibility.
**Why it happens:** React Email packages use `react-dom/server` internally, which conflicts with Next.js Server Component bundling.
**How to avoid:** Add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-email/components', '@react-email/render'],
  // ... existing config
}
```
**Note:** `serverExternalPackages` is a stable top-level option in Next.js 15+ (not `experimental`). The old `experimental.serverComponentsExternalPackages` name is deprecated.
**Warning signs:** Build error mentioning `react-dom/server`, or runtime error importing email templates.

### Pitfall 2: Web Fonts in Email Templates
**What goes wrong:** Email renders with fallback system font instead of Satoshi/DM Sans. Gmail and most desktop clients strip `<link>` tags and `@font-face` declarations.
**Why it happens:** Email clients have extremely limited CSS support. Web font loading is broadly unsupported.
**How to avoid:** Use system font stacks in all email `style` props: `fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif"`. The design system colors still apply correctly.

### Pitfall 3: `RESEND_FROM_ADDRESS` Not Matching Verified Domain
**What goes wrong:** Resend rejects sends with 403 error — "From address is not allowed".
**Why it happens:** Resend only allows sending from domains that have been DNS-verified in the dashboard. The `from` address domain must match a verified domain.
**How to avoid:** Complete DNS verification in Resend dashboard before testing. Use `onboarding@resend.dev` for local/preview testing only. Set `RESEND_FROM_ADDRESS=Store Name <noreply@yourdomain.co.nz>` in production env vars.

### Pitfall 4: Online Receipt Missing receipt_data
**What goes wrong:** Online receipt email sends but `buildReceiptData` has no product names because the Stripe webhook only has order items as `{ product_id, quantity }` — no product names.
**Why it happens:** The Stripe webhook handler does not build `receipt_data` (it was added in Phase 8 for POS only). The `order_items` fetched in the webhook have `product_id` and `quantity` but not `product_name`, `unit_price_cents`, etc.
**How to avoid:** The online receipt email handler needs to join `order_items` with `products` to get full receipt data. Alternatively, fetch the existing `receipt_data` JSONB if it was stored at order creation time (check if `complete_online_sale` RPC stores it). The planner should include a task to investigate this and build the online receipt data construction.

### Pitfall 5: Vercel Free Tier Cron Daily Limit
**What goes wrong:** Deployment fails if any cron expression would run more than once per day.
**Why it happens:** Vercel Hobby plan only allows daily (once per 24h) cron jobs. Expressions like `*/30 * * * *` fail at deploy time with an explicit error.
**How to avoid:** All crons in this phase are daily (`0 X * * *`). The 30-second order polling is a client-side `setInterval` — NOT a Vercel cron. Keep them clearly separated.

### Pitfall 6: Audio Autoplay Blocked on First Load
**What goes wrong:** First chime after page load is silently blocked by the browser.
**Why it happens:** Browsers block `Audio.play()` until the user has interacted with the page.
**How to avoid:** The POS requires staff login before reaching the order-polling UI. After login, the browser considers user interaction satisfied. The `audio.play().catch()` wrapper suppresses the console error on the rare case it is blocked. No workaround needed in practice — log the catch but don't surface it as a UI error.

### Pitfall 7: Polling Leaks on POSClientShell Unmount
**What goes wrong:** Multiple overlapping polls, or stale closures reading old order state.
**Why it happens:** `setInterval` inside `useEffect` without proper cleanup.
**How to avoid:** Always `return () => clearInterval(intervalId)` from the `useEffect`. Use a `useRef` for the callback to avoid stale closure.

### Pitfall 8: Daily Summary Timezone Edge Cases
**What goes wrong:** Summary covers the wrong day — e.g., covers UTC day instead of NZ day.
**Why it happens:** Vercel crons run in UTC. The cron fires at UTC 19:00, which is NZ 7 AM. The SQL query must use NZ-local date boundaries, not UTC midnight.
**How to avoid:** In the cron handler, compute "yesterday in NZ time" using `date-fns-tz`:
```typescript
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
const NZ_TZ = 'Pacific/Auckland'
const nowNZ = toZonedTime(new Date(), NZ_TZ)
const yesterdayStartNZ = startOfDay(subDays(nowNZ, 1))
const yesterdayEndNZ = endOfDay(subDays(nowNZ, 1))
// Convert back to UTC for Postgres query
const startUTC = fromZonedTime(yesterdayStartNZ, NZ_TZ).toISOString()
const endUTC = fromZonedTime(yesterdayEndNZ, NZ_TZ).toISOString()
```

---

## Code Examples

### Email Template with Receipt Data
```tsx
// Source: react-email.com npm package v5.2.10 + Resend docs (verified 2026-04-02)
import { Html, Head, Body, Container, Section, Text, Hr, Row, Column } from '@react-email/components'
import type { ReceiptData } from '@/lib/receipt'
import { formatNZD } from '@/lib/money'

export function PosReceiptEmail({ receipt }: { receipt: ReceiptData }) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerTitle}>{receipt.storeName}</Text>
            <Text style={headerSub}>Tax Invoice — GST {receipt.gstNumber}</Text>
          </Section>
          {receipt.items.map(item => (
            <Row key={item.productId}>
              <Column>{item.productName} × {item.quantity}</Column>
              <Column style={{ textAlign: 'right' }}>{formatNZD(item.lineTotalCents)}</Column>
            </Row>
          ))}
          <Hr />
          <Text>GST included (15%): {formatNZD(receipt.gstCents)}</Text>
          <Text style={totalText}>Total: {formatNZD(receipt.totalCents)}</Text>
          <Text>Paid by: {receipt.paymentMethod.toUpperCase()}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#FAFAF9', fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const header = { backgroundColor: '#1E293B', padding: '24px', borderRadius: '8px 8px 0 0' }
const headerTitle = { color: '#FFFFFF', fontWeight: 700, fontSize: '20px', margin: 0 }
const headerSub = { color: '#94A3B8', fontSize: '14px', margin: '4px 0 0' }
const totalText = { fontWeight: 700, fontSize: '18px', color: '#1C1917' }
```

### Sending in Stripe Webhook (Fire-and-Forget)
```typescript
// After RPC success at line ~90 of src/app/api/webhooks/stripe/route.ts
void sendEmail({
  to: session.customer_details?.email ?? '',
  subject: `Your receipt from ${storeName}`,
  react: OnlineReceiptEmail({ receipt: onlineReceipt }),
})
```

### Polling Hook Pattern
```typescript
// In POSClientShell.tsx
const POLL_INTERVAL_MS = 30_000
const STORAGE_KEY_LAST_CHECK = 'pos_last_order_check'
const STORAGE_KEY_MUTED = 'pos_sound_muted'

useEffect(() => {
  const intervalId = setInterval(async () => {
    const since = localStorage.getItem(STORAGE_KEY_LAST_CHECK) ?? new Date(0).toISOString()
    const res = await fetch(`/api/pos/new-orders?since=${encodeURIComponent(since)}`)
    if (!res.ok) return
    const { orders, serverTime } = await res.json()
    localStorage.setItem(STORAGE_KEY_LAST_CHECK, serverTime)
    if (orders.length === 0) return
    setUnreadOrderCount(prev => prev + orders.length)
    // Play chime unless muted
    const muted = localStorage.getItem(STORAGE_KEY_MUTED) === 'true'
    if (!muted) {
      const audio = new Audio('/sounds/chime.mp3')
      audio.play().catch(() => {})
    }
    // Show toast
    setNewOrderToast(orders.length > 1 ? `${orders.length} new orders` : 'New order')
  }, POLL_INTERVAL_MS)
  return () => clearInterval(intervalId)
}, []) // Empty deps — interval is stable, localStorage reads are at poll time
```

### vercel.json Addition
```json
{
  "crons": [
    { "path": "/api/cron/xero-sync", "schedule": "0 13 * * *" },
    { "path": "/api/cron/expire-orders", "schedule": "0 14 * * *" },
    { "path": "/api/cron/daily-summary", "schedule": "0 19 * * *" }
  ]
}
```

### next.config.ts Update Required
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-email/components', '@react-email/render'],
  images: {
    remotePatterns: [ /* existing */ ],
  },
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `experimental.serverComponentsExternalPackages` | `serverExternalPackages` (stable, top-level) | Next.js v15.0.0 | Use the stable option — no `experimental` wrapper |
| HTML string email templates | React Email component templates | 2022-present | React Email is now the standard for code-based transactional email |
| `react-email` v4 `render()` sync | `@react-email/render` v2 async `render()` | 2024 | `render()` is now async — `await render(<Template />)` if using HTML string approach |

**Deprecated/outdated:**
- `experimental.serverComponentsExternalPackages`: renamed to `serverExternalPackages` in Next.js 15. Still works but shows deprecation warning.
- Resend `react:` prop receiving JSX (e.g., `react: <Template />`): Must be a function call `react: Template({ ...props })` per Resend docs — JSX syntax may not resolve correctly in server contexts.

---

## Open Questions

1. **Does `complete_online_sale` RPC store `receipt_data`?**
   - What we know: The POS `completeSale.ts` builds and stores `receipt_data`. The Stripe webhook does NOT call `buildReceiptData()`.
   - What's unclear: Whether `complete_online_sale` stores a receipt_data blob, or whether the online receipt email needs to reconstruct it from joined queries.
   - Recommendation: The planner should include an investigation task to inspect the `complete_online_sale` RPC in `supabase/migrations/006_online_store.sql` and add receipt_data storage if missing, OR the email handler should query products to reconstruct item details.

2. **Store opening hours field**
   - What we know: D-04 says pickup-ready email includes opening hours. The stores table has `address`, `phone`, `gst_number` (migration 010) but no `opening_hours` field verified.
   - What's unclear: Whether `opening_hours` exists on the stores table or needs to be added.
   - Recommendation: The planner should include a task to check the stores table schema and add an `opening_hours` text column via migration if needed.

3. **Founder email address for daily summary**
   - What we know: D-10 says daily summary sends to the founder. No configuration for the founder's email exists yet.
   - What's unclear: Where to store the founder's email — hardcoded env var (`FOUNDER_EMAIL`) vs. stored on the stores table.
   - Recommendation: Use `FOUNDER_EMAIL` env var (simplest, no schema change). The planner should include an env var in the Wave 0 setup task.

4. **Chime sound file source**
   - What we know: D-15 specifies a retail chime. No sound file exists in the repo yet.
   - What's unclear: Exact file source and format (MP3 vs OGG).
   - Recommendation: Use a free-licensed retail chime (e.g., from freesound.org). MP3 is the right format for broad browser support. Place at `public/sounds/chime.mp3`. Include this as a Wave 0 setup task.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All npm installs | ✓ | Project uses Next.js 16.2 | — |
| resend (npm) | NOTIF-01 to 04 | ✗ (not installed) | 6.10.0 available | — (must install) |
| react-email (npm) | All email templates | ✗ (not installed) | 5.2.10 available | — (must install) |
| @react-email/components (npm) | All email templates | ✗ (not installed) | 1.0.11 available | — (must install) |
| @react-email/render (npm) | Optional HTML string use | ✗ (not installed) | 2.0.5 available | Not strictly required if using `react:` prop |
| Resend account + API key | NOTIF-01 to 04 | Unknown (env var needed) | — | `onboarding@resend.dev` for dev testing only |
| Verified domain in Resend | NOTIF-01 to 04 (production) | Unknown | — | Use Resend test address for dev; block on DNS for prod |
| Sound file (chime.mp3) | NOTIF-06 | ✗ (file not in repo) | — | Use placeholder tone or omit sound in dev |
| `FOUNDER_EMAIL` env var | NOTIF-04+05 | ✗ (not configured) | — | Must add to .env.local and Vercel env |
| date-fns-tz | Cron timezone | ✓ | 3.2.0 (already installed) | — |
| lucide-react | Mute toggle icon | ✓ | 1.7.0 (already installed) | — |

**Missing dependencies with no fallback:**
- `resend`, `react-email`, `@react-email/components` — must install before any email task
- `RESEND_API_KEY` env var — required for all email sends
- `RESEND_FROM_ADDRESS` env var — required for sender identity

**Missing dependencies with fallback:**
- Verified domain: use `onboarding@resend.dev` during development
- Sound file: create placeholder or skip sound in development
- `FOUNDER_EMAIL`: can stub with developer email during development

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `/Users/adam-personal/CODER/IDEAS/NZPOS/vitest.config.mts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` (all files via `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTIF-01 | Online receipt email fires after Stripe webhook RPC success | unit | `npm test -- src/app/api/webhooks/stripe/webhook.test.ts` | ✅ (exists, extend it) |
| NOTIF-02 | POS receipt email fires when `onEmailCapture` is called | unit | `npm test -- src/actions/orders/__tests__/sendPosReceipt.test.ts` | ❌ Wave 0 |
| NOTIF-03 | Pickup-ready email fires when status transitions to "ready" | unit | `npm test -- src/actions/orders/__tests__/updateOrderStatus.test.ts` | ❌ Wave 0 |
| NOTIF-04 | Daily summary cron handler sends email with correct aggregations | unit | `npm test -- src/app/api/cron/__tests__/daily-summary.test.ts` | ❌ Wave 0 |
| NOTIF-05 | Low stock items appear in daily summary when below threshold | unit | covered by NOTIF-04 test | ❌ (part of Wave 0 above) |
| NOTIF-06 | Polling endpoint returns new orders since timestamp | unit | `npm test -- src/app/api/pos/__tests__/new-orders.test.ts` | ❌ Wave 0 |

**Note on email send mocking:** All tests must mock the `sendEmail` helper (or the Resend SDK directly). Use `vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))` and assert it was called with correct `to` and `subject`. Never make real Resend API calls in tests.

### Sampling Rate
- **Per task commit:** `npm test` (full unit suite — all tests run in < 30s)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/orders/__tests__/sendPosReceipt.test.ts` — covers NOTIF-02
- [ ] `src/actions/orders/__tests__/updateOrderStatus.test.ts` — covers NOTIF-03 (updateOrderStatus already tested? verify)
- [ ] `src/app/api/cron/__tests__/daily-summary.test.ts` — covers NOTIF-04 + NOTIF-05
- [ ] `src/app/api/pos/__tests__/new-orders.test.ts` — covers NOTIF-06 polling route
- [ ] Install packages: `npm install resend react-email @react-email/components @react-email/render`
- [ ] Update `next.config.ts` with `serverExternalPackages`
- [ ] Add env vars: `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, `FOUNDER_EMAIL`
- [ ] Add `public/sounds/chime.mp3` (source a free-licensed retail chime)

---

## Sources

### Primary (HIGH confidence)
- [Resend Next.js docs](https://resend.com/docs/send-with-nextjs) — SDK usage, `react:` prop pattern, env vars — fetched 2026-04-02
- [Next.js `serverExternalPackages` docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) — stable config option syntax, Next.js 16.2.2 — fetched 2026-04-02
- [Vercel Cron Jobs docs](https://vercel.com/docs/cron-jobs) — cron expression format, UTC-only, vercel.json syntax — fetched 2026-04-02
- [Vercel Cron Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Hobby tier: once per day max, 100 crons per project — fetched 2026-04-02
- npm registry: resend@6.10.0, react-email@5.2.10, @react-email/components@1.0.11, @react-email/render@2.0.5 — verified 2026-04-02

### Secondary (MEDIUM confidence)
- [react-email/issues/977](https://github.com/resend/react-email/issues/977) — `serverExternalPackages` fix for RSC compatibility — cross-verified with Next.js docs
- WebSearch: NZST UTC+12 / NZDT UTC+13, NZ DST ends April 2026 — multiple sources agree; cross-verified NZST schedule at UTC 19:00

### Tertiary (LOW confidence)
- WebSearch: fire-and-forget pattern in Next.js — community recommendations consistent but no official Next.js doc mandates specific pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry versions verified, official Resend docs fetched
- Architecture: HIGH — based on existing codebase patterns (stripe webhook, cron handlers, POSClientShell), locked decisions, and verified library APIs
- Pitfalls: HIGH for most — several (next.config, web fonts, autoplay) verified against official docs; open questions flagged honestly
- Timezone calculation: MEDIUM — UTC 19:00 = NZ 7 AM confirmed via multiple sources, but NZ DST edge cases acknowledged

**Research date:** 2026-04-02
**Valid until:** 2026-07-02 (stable libraries, 90-day validity)
