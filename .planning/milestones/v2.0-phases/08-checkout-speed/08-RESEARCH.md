# Phase 08: Checkout Speed - Research

**Researched:** 2026-04-02
**Domain:** Browser barcode scanning (EAN-13/UPC-A), receipt data modeling, Supabase schema migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Scan button in POSTopBar (icon button next to nav links). Tap opens camera overlay sheet using existing `fixed inset-0 z-50` overlay pattern.
- **D-02:** Scanner stays open between scans (batch mode). Staff closes manually.
- **D-03:** Successful scan plays audible beep + brief haptic vibration.
- **D-04:** Manual barcode entry available via keyboard icon inside scanner overlay.
- **D-05:** Unknown barcode shows inline error in scanner overlay — red status pill: "Barcode not found". Scanner stays open.
- **D-06:** Failed barcode number NOT shown to staff — just the "not found" message.
- **D-07:** When staff closes scanner after failed scan, product search bar auto-focuses.
- **D-08:** Enhance existing SaleSummaryScreen into a proper receipt. One screen serves both roles.
- **D-09:** Receipt includes store name, address, phone, date/time, staff name, GST number, line items, discounts, subtotal, GST, total, payment method, order ID.
- **D-10:** Email capture field on receipt screen (stored on order, Phase 9 sends it).
- **D-11:** Receipt data stored as JSONB `receipt_data` column on orders table.
- **D-12:** Old receipts viewable from admin order detail page via "View Receipt" button. Same component renders both.
- **D-13:** Store details (name, address, phone, GST number) stored as columns on stores table. Snapshotted into receipt_data at sale time.

### Claude's Discretion

- Barcode scanning library choice (quagga2, zxing, html5-qrcode, or Web API)
- Camera permission handling UX
- Receipt JSONB schema structure
- Migration strategy for new stores/orders columns
- Scanner overlay animation and transitions
- Receipt component architecture (shared between POS and admin)
- Sound file format and implementation for scan beep

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCAN-01 | Staff can scan EAN-13/UPC-A barcode via iPad camera to add product to cart | Barcode library selection, getUserMedia pattern, cart dispatch integration |
| SCAN-02 | If scanned barcode has no match, error shown and search bar focused | Error state pattern, search bar ref forwarding from POSClientShell |
| RCPT-01 | Screen receipt displays after sale completion (store info, items, GST, total, payment method) | ReceiptScreen component replacing SaleSummaryScreen, ReceiptData type |
| RCPT-02 | Receipt data model is shared between screen display and future physical printer | receipt_data JSONB column, ReceiptData TypeScript type, migration |
</phase_requirements>

---

## Summary

Phase 8 adds two distinct capabilities: (1) iPad camera barcode scanning with `@ericblade/quagga2` for fast EAN-13/UPC-A lookup, and (2) a structured on-screen receipt that snapshots sale data into a JSONB column for future printer compatibility.

The critical library decision (Claude's Discretion) favors `@ericblade/quagga2` over competing options. The native `BarcodeDetector` Web API is unavailable on iPad Safari (WebKit has not shipped it). ZXing (`@zxing/browser`) is in maintenance mode. `html5-qrcode` last released April 2023 and has known iOS initialization failures. Quagga2 is actively maintained, ships TypeScript types, supports EAN-13/UPC-A via the `ean_reader`/`upc_reader` readers, and integrates directly with `getUserMedia` (no React-specific wrapper needed).

For the receipt, the design contract (`08-UI-SPEC.md`) has already specified the `ReceiptData` type and `ReceiptScreen` component structure. The main engineering work is: (a) three database migrations — add `address`/`phone`/`gst_number` to `stores`, add `receipt_data JSONB` to `orders`, update the `complete_pos_sale` RPC to accept and store `p_receipt_data` and `p_customer_email` — and (b) implementing the new components and wiring them in `POSClientShell`.

**Primary recommendation:** Use `@ericblade/quagga2` (v1.12.1) for barcode scanning. Use Web Audio API oscillator for beep sound (no external audio package). Haptic via `navigator.vibrate()` with silent fallback (unsupported on iOS Safari). Follow the `ReceiptData` type as defined in `08-UI-SPEC.md` exactly.

---

## Standard Stack

### Core (already installed — no new packages required)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| lucide-react | ^1.7.0 | Scan button icon | `ScanBarcode` icon confirmed present in installed version |
| Supabase JS | ^2.101.1 | Barcode lookup (products.barcode column) | Direct client query, no new ORM needed |
| React useRef / useEffect | (React 19) | Camera stream lifecycle, search bar ref forwarding | Standard React patterns |

### New Package Required

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @ericblade/quagga2 | ^1.12.1 | EAN-13/UPC-A camera decoding | Actively maintained fork; TypeScript support; works on iOS Safari 14+; direct `getUserMedia` integration without React wrapper |

**Installation:**
```bash
npm install @ericblade/quagga2
```

**Version verification:** Confirmed current version is 1.12.1 via npm registry 2026-04-02.

### Supporting (built-in browser APIs — no install)

| API | Purpose | When to Use |
|-----|---------|-------------|
| `AudioContext` (Web Audio API) | Scan success beep tone | Works on all modern browsers incl. Safari. Must be created after user gesture (tap). |
| `navigator.vibrate()` | Haptic feedback on scan success | Supported on Android Chrome. Not supported on iOS Safari — always guard with `if (navigator.vibrate)`. |
| `getUserMedia({ video: { facingMode: 'environment' } })` | Rear camera access | Standard MediaDevices API, available on iOS Safari 11+. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @ericblade/quagga2 | BarcodeDetector Web API | NOT VIABLE — Safari/WebKit does not ship this API; only Chromium |
| @ericblade/quagga2 | @zxing/browser | ZXing is in maintenance mode (no new features); lower decode accuracy on damaged barcodes |
| @ericblade/quagga2 | html5-qrcode | No releases since April 2023; documented iOS initialization failures; in maintenance mode |
| Web Audio API beep | External audio file (.mp3) | Audio files require network fetch and iOS autoplay policy complications. Web Audio API is zero-dependency and instantaneous. |

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
├── components/pos/
│   ├── BarcodeScannerSheet.tsx    # Camera overlay (new)
│   ├── BarcodeScannerButton.tsx   # Top bar icon button (new)
│   └── ReceiptScreen.tsx          # Replaces SaleSummaryScreen (new)
├── lib/
│   └── receipt.ts                 # ReceiptData type + buildReceiptData() util (new)
├── actions/orders/
│   └── completeSale.ts            # Modified: add receipt_data, customer_email params
└── schemas/
    └── order.ts                   # Modified: add customer_email field
supabase/migrations/
└── 010_checkout_speed.sql         # New migration (stores + orders columns + RPC update)
```

### Pattern 1: Quagga2 Camera Integration in a React Client Component

**What:** Initialize Quagga in `useEffect` on mount, stop it on unmount. Use `Quagga.onDetected` callback to capture decoded barcodes. Render the `<video>` element via a ref attached to a `<div>`.

**When to use:** Inside `BarcodeScannerSheet` which is a `'use client'` component loaded with `dynamic(() => import(...), { ssr: false })` from `POSClientShell`.

**Critical detail — Next.js SSR:** Quagga2 uses browser APIs (`getUserMedia`, `Worker`). It MUST be dynamically imported with `{ ssr: false }` in Next.js App Router. Failure to do so will cause build errors.

```typescript
// In POSClientShell.tsx — dynamic import pattern
import dynamic from 'next/dynamic'

const BarcodeScannerSheet = dynamic(
  () => import('./BarcodeScannerSheet').then(m => ({ default: m.BarcodeScannerSheet })),
  { ssr: false }
)
```

**Quagga2 init pattern inside BarcodeScannerSheet:**
```typescript
// Source: @ericblade/quagga2 README + github.com/ericblade/quagga2-react-example
import Quagga from '@ericblade/quagga2'

useEffect(() => {
  if (!viewfinderRef.current) return

  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: viewfinderRef.current,
      constraints: {
        facingMode: 'environment',  // rear camera
        width: { min: 640 },
        height: { min: 480 },
      },
    },
    decoder: {
      readers: ['ean_reader', 'upc_reader'],  // EAN-13 + UPC-A only
    },
    locate: true,
  }, (err) => {
    if (err) { /* handle camera permission denied */ return }
    Quagga.start()
  })

  Quagga.onDetected((result) => {
    const code = result.codeResult.code
    if (code) onBarcodeDetected(code)
  })

  return () => {
    Quagga.offDetected()
    Quagga.stop()
  }
}, [])
```

**EAN-13 vs UPC-A reader order:** Place `ean_reader` first in the `readers` array. Quagga2 attempts readers in order; EAN-13 is the primary format for NZ retail barcodes.

### Pattern 2: Barcode Lookup Server Action

**What:** A new `lookupBarcode` server action that queries `products` by `barcode` column, scoped to `store_id` from staff JWT.

**Integration point:** `BarcodeScannerSheet` calls this on each detected barcode. On success, dispatches `ADD_PRODUCT` to the cart reducer. On no-match, shows error state.

```typescript
// src/actions/products/lookupBarcode.ts
'use server'
import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveStaffAuth } from '@/lib/resolveAuth'

export async function lookupBarcode(barcode: string) {
  const staff = await resolveStaffAuth()
  if (!staff) return { error: 'Not authenticated' }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', staff.store_id)
    .eq('barcode', barcode)
    .eq('is_active', true)
    .single()

  if (error || !data) return { error: 'not_found' }
  return { product: data }
}
```

**SCAN-02 implementation:** When `lookupBarcode` returns `{ error: 'not_found' }`, the scanner shows error state, then on close, `POSClientShell` must focus the search `<input>`. Use a `searchInputRef` passed down from `POSClientShell` (or a callback `onScanNotFound` that sets a state flag in shell, which triggers a `useEffect` to focus the input).

### Pattern 3: Web Audio API Beep (No External Package)

**What:** Synthesize a short 880Hz tone on scan success using `AudioContext`. No file to load, no network dependency.

```typescript
// Beep utility — call after successful scan
function playBeep() {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'square'
  osc.frequency.value = 880
  gain.gain.setValueAtTime(0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.15)
}
```

**iOS constraint:** `AudioContext` on iOS Safari requires a user gesture to create (or resume if suspended). The tap to open the scanner overlay IS a user gesture — create `AudioContext` in the click handler that opens the sheet, store on a ref, reuse for subsequent beeps.

### Pattern 4: Receipt Data Model and Snapshot

**What:** `ReceiptData` type in `src/lib/receipt.ts`. A `buildReceiptData()` function constructs it from order data + store data. The `completeSale` server action serializes it to JSON and passes to the RPC.

**Type (from 08-UI-SPEC.md — use exactly as specified):**
```typescript
// src/lib/receipt.ts
export type ReceiptLineItem = {
  productId: string
  productName: string
  quantity: number
  unitPriceCents: number
  discountCents: number
  lineTotalCents: number
  gstCents: number
}

export type ReceiptData = {
  orderId: string
  storeName: string
  storeAddress: string
  storePhone: string
  gstNumber: string       // NZ GST registration number
  completedAt: string     // ISO timestamp
  staffName: string
  items: ReceiptLineItem[]
  subtotalCents: number
  gstCents: number
  totalCents: number
  paymentMethod: 'eftpos' | 'cash' | 'split'
  cashTenderedCents?: number
  changeDueCents?: number
  customerEmail?: string  // captured on receipt, email sent in Phase 9
}
```

**Note:** The UI-SPEC.md `ReceiptData` type omits `storeAddress`, `storePhone`, `gstNumber`, and `staffName` — these must be added per D-09 and D-13. The planner should ensure the type in `receipt.ts` includes all D-09 fields.

### Pattern 5: Database Migration Strategy

**Migration file:** `supabase/migrations/010_checkout_speed.sql`

Three schema changes required:

```sql
-- 1. Add contact/compliance columns to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- 2. Add receipt_data JSONB column to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS receipt_data JSONB;

-- 3. Update complete_pos_sale RPC to accept receipt_data and customer_email
-- (CREATE OR REPLACE the existing function with new params)
CREATE OR REPLACE FUNCTION complete_pos_sale(
  p_store_id UUID,
  p_staff_id UUID,
  p_payment_method TEXT,
  p_subtotal_cents INTEGER,
  p_gst_cents INTEGER,
  p_total_cents INTEGER,
  p_discount_cents INTEGER,
  p_cash_tendered_cents INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_receipt_data JSONB DEFAULT NULL,    -- NEW
  p_customer_email TEXT DEFAULT NULL    -- NEW (STATE.md notes this is needed)
) RETURNS JSONB ...
```

**Database types file:** After migration, `database.ts` needs regeneration (`npx supabase gen types typescript`) OR manual addition of the new columns to the `stores.Row` and `orders.Row` type blocks. Either approach is valid; manual is faster for a solo dev.

**STATE.md note:** "complete_pos_sale RPC needs customer_email param added" — this is the same migration. Add both `p_receipt_data` and `p_customer_email` together in the same `CREATE OR REPLACE FUNCTION`.

### Anti-Patterns to Avoid

- **Using BarcodeDetector Web API:** Not available on iPad Safari. Always wrap in `typeof BarcodeDetector !== 'undefined'` if referenced at all — but do not rely on it as the primary scanner.
- **Importing Quagga2 at top level in a Server Component or without `ssr: false`:** Build will fail. Always dynamic import.
- **Starting AudioContext on page load:** Browsers (especially Safari) block it without a user gesture. Create and resume in response to user tap.
- **Storing receipt fields only on the ReceiptScreen component props:** D-12 requires old receipts viewable from admin. Receipt data must be in the database, not reconstructed at display time.
- **Forgetting to update `database.ts` generated types:** The `completeSale` action calls `supabase.rpc()` — TypeScript will fail to compile if the RPC signature in `database.ts` doesn't match the new function signature.
- **Using `SaleSummaryScreen` for the new receipt:** The UI-SPEC deprecates it in favor of `ReceiptScreen`. `SaleSummaryScreen` stays in the repo until `ReceiptScreen` is verified, then is deleted.
- **Quagga2 false positives:** Reading EAN-13 and UPC-A together can produce misreads. Always validate that the detected barcode string is the correct length (EAN-13: 13 digits, UPC-A: 12 digits) before dispatching the lookup. Quagga2 includes a checksum validator — enable it via `config.decoder.multiple = false` and trust `result.codeResult.decodedCodes` confidence check.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera barcode decoding | Custom WebGL/canvas image processing | @ericblade/quagga2 | EAN checksum validation, subpixel decode, scan line location — weeks of work |
| Beep sound generation | Audio file + `<audio>` element | Web Audio API oscillator | No file to host, works without network, bypasses iOS autoplay policy when tied to user gesture |
| Barcode checksum validation | Custom EAN-13/UPC-A checksum | Quagga2's built-in decoder | Checksum is part of the decode result; misread barcodes return low confidence |

**Key insight:** Camera-based barcode decoding requires subpixel analysis, perspective correction, and format-specific checksum validation. Quagga2 encapsulates all of this. The value of this phase is the UX integration (overlay, batch mode, cart dispatch), not the decoder itself.

---

## Common Pitfalls

### Pitfall 1: AudioContext blocked on iOS before user gesture

**What goes wrong:** `new AudioContext()` on iOS Safari throws or produces a suspended context — no beep on first scan.
**Why it happens:** Apple requires user gesture (touch, click) before audio context can play.
**How to avoid:** Create `AudioContext` in the tap handler that opens the scanner sheet. Store on a `useRef`. Call `ctx.resume()` before scheduling the oscillator on each beep.
**Warning signs:** `audioContext.state === 'suspended'` — always check and `await ctx.resume()` before playing.

### Pitfall 2: Quagga2 doesn't stop cleanly on React strict mode double-mount

**What goes wrong:** In development with React Strict Mode, `useEffect` runs twice. Quagga may initialize twice, causing duplicate `onDetected` callbacks and two active camera streams.
**Why it happens:** React 18/19 Strict Mode calls `useEffect` cleanup and re-mount in development.
**How to avoid:** In the `useEffect` cleanup, call `Quagga.offDetected()` (remove all listeners) then `Quagga.stop()`. Use an `initialized` ref flag to guard double-init.

```typescript
const initializedRef = useRef(false)
useEffect(() => {
  if (initializedRef.current) return
  initializedRef.current = true
  // ... init Quagga
  return () => {
    Quagga.offDetected()
    Quagga.stop()
    initializedRef.current = false
  }
}, [])
```

### Pitfall 3: Camera permissions denied — no recovery path in-app

**What goes wrong:** iOS Safari shows a permission prompt once. If denied, the app has no way to re-trigger the prompt — the user must go to iOS Settings.
**Why it happens:** Safari's permission model is persistent; `getUserMedia` throws `NotAllowedError` on denial.
**How to avoid:** Catch `NotAllowedError` on Quagga init, show: "Camera access denied. Use the search bar to find products." Close button auto-focuses search. Do NOT show a retry button — it will never succeed without an OS-level settings change.
**Warning signs:** `err.name === 'NotAllowedError'` in the Quagga init callback.

### Pitfall 4: Barcode lookup race condition with batch scanning

**What goes wrong:** Staff scans two barcodes quickly. First `lookupBarcode` is still in-flight when second triggers. Both calls eventually resolve and dispatch `ADD_PRODUCT` twice for the first item.
**Why it happens:** Server Actions are async; no debounce on `onDetected`.
**How to avoid:** Use a `scanningRef` boolean in `BarcodeScannerSheet`. Set `true` when decode fires, set `false` after lookup resolves. Ignore `onDetected` events while a lookup is in flight. 200ms minimum gap between accepted scans is sufficient for batch scanning UX.

### Pitfall 5: `receipt_data` not populated for old orders

**What goes wrong:** Admin "View Receipt" button errors when `receipt_data` is NULL on orders created before this migration.
**Why it happens:** The new JSONB column is NULL for all pre-Phase-8 orders.
**How to avoid:** The `ReceiptScreen` component (used in admin view) must handle `receipt_data === null` gracefully — show a "Receipt not available for older orders" message. Do not attempt to reconstruct receipt from order_items for Phase 8 (out of scope).

### Pitfall 6: `navigator.vibrate()` crashes on iOS

**What goes wrong:** Calling `navigator.vibrate(100)` on iPad Safari throws or silently fails.
**Why it happens:** Vibration API is not implemented in WebKit/Safari as of 2026.
**How to avoid:** Always guard: `if (typeof navigator !== 'undefined' && navigator.vibrate) { navigator.vibrate(100) }`.

### Pitfall 7: RPC type mismatch after adding new parameters

**What goes wrong:** TypeScript compilation error in `completeSale.ts` after updating the Postgres function — the `database.ts` generated types still show the old function signature.
**Why it happens:** `database.ts` is auto-generated from the Supabase schema and is not automatically updated.
**How to avoid:** After running the migration locally, regenerate types: `npx supabase gen types typescript --local > src/types/database.ts`. OR manually add the new params to the `complete_pos_sale` function signature in `database.ts`.

---

## Code Examples

### Barcode lookup with debounce guard

```typescript
// Source: research synthesis from Quagga2 README + React patterns
const scanLockRef = useRef(false)

async function handleBarcodeDetected(code: string) {
  if (scanLockRef.current) return
  scanLockRef.current = true

  playBeep()
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(80)
  }

  const result = await lookupBarcode(code)

  if ('product' in result) {
    onProductFound(result.product)  // dispatch ADD_PRODUCT in parent
    // sheet stays open for next scan (batch mode)
  } else {
    onNotFound()  // show error state, schedule close
  }

  // Unlock after 200ms minimum gap
  setTimeout(() => { scanLockRef.current = false }, 200)
}
```

### Receipt data construction

```typescript
// src/lib/receipt.ts
export function buildReceiptData(params: {
  orderId: string
  store: { name: string; address: string | null; phone: string | null; gst_number: string | null }
  staffName: string
  items: CartItem[]
  totals: { subtotalCents: number; gstCents: number; totalCents: number }
  paymentMethod: 'eftpos' | 'cash' | 'split'
  cashTenderedCents?: number
  changeDueCents?: number
  customerEmail?: string
}): ReceiptData {
  return {
    orderId: params.orderId,
    storeName: params.store.name,
    storeAddress: params.store.address ?? '',
    storePhone: params.store.phone ?? '',
    gstNumber: params.store.gst_number ?? '',
    completedAt: new Date().toISOString(),
    staffName: params.staffName,
    items: params.items.map(i => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      discountCents: i.discountCents,
      lineTotalCents: i.lineTotalCents,
      gstCents: i.gstCents,
    })),
    subtotalCents: params.totals.subtotalCents,
    gstCents: params.totals.gstCents,
    totalCents: params.totals.totalCents,
    paymentMethod: params.paymentMethod,
    cashTenderedCents: params.cashTenderedCents,
    changeDueCents: params.changeDueCents,
    customerEmail: params.customerEmail,
  }
}
```

### completeSale modification pattern

The `completeSale` action currently passes `p_staff_id` from resolved JWT. Store details needed for receipt must be fetched inside `completeSale` BEFORE calling the RPC, then built into `receipt_data`:

```typescript
// Inside completeSale server action — after resolveStaffAuth()
const { data: store } = await supabase
  .from('stores')
  .select('name, address, phone, gst_number')
  .eq('id', staff.store_id)
  .single()

const receiptData = buildReceiptData({
  orderId: '<will be set after insert — pass null, update after>',
  store: store ?? { name: '', address: null, phone: null, gst_number: null },
  staffName: staff.name,  // resolveStaffAuth must return staff name
  items: parsed.data.items as CartItem[],
  totals: { ... },
  paymentMethod: parsed.data.payment_method,
  ...
})
// Pass to RPC as p_receipt_data
```

**Problem:** `orderId` is generated by the RPC insert — it's not available before the RPC call. Two options:
1. Generate a UUID client-side and pass it as `p_order_id` override (requires RPC to accept it — more invasive).
2. Build `receipt_data` with `orderId: ''`, call RPC, then UPDATE `orders SET receipt_data = ...` with the real order ID in a second query (simpler, two queries).
3. Build `receipt_data` after RPC returns, then do a single UPDATE with the complete data including the real orderId.

**Recommended:** Option 3 — call the RPC, get `order_id` back, then build complete `ReceiptData` with real `orderId`, then `UPDATE orders SET receipt_data = $1 WHERE id = $2`. This is two DB operations but avoids RPC signature complexity. Both happen server-side; atomicity is not critical for receipt data.

### resolveStaffAuth — staff name availability

`completeSale` currently uses `resolveStaffAuth()`. Check whether it returns `staff.name`:

```typescript
// src/lib/resolveAuth.ts — verify this returns name
const staff = await resolveStaffAuth()
// staff.name needed for receipt — if absent, add to the resolver's query
```

If `resolveStaffAuth` doesn't currently return `name`, this needs to be added (or receipt uses a `staffName` prop passed through from `POSClientShell` where it's already available).

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code + Supabase migration changes. No new external services, CLIs, or infrastructure. Supabase local is already set up from prior phases.

---

## Runtime State Inventory

Step 2.5: NOT APPLICABLE — this is a greenfield feature addition. No rename/refactor/migration of existing runtime state. The schema additions are additive (new nullable columns). Existing orders will have `receipt_data = NULL` — handled by graceful fallback in admin view (Pitfall 5).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vitest.config.mts` (jsdom environment) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-01 | `lookupBarcode('123456789012')` returns product when barcode matches | unit | `npm test -- src/actions/products/lookupBarcode.test.ts` | ❌ Wave 0 |
| SCAN-01 | `BarcodeScannerSheet` renders camera viewfinder div on mount | component | `npm test -- src/components/pos/BarcodeScannerSheet.test.tsx` | ❌ Wave 0 |
| SCAN-02 | `lookupBarcode('000000000000')` returns `{ error: 'not_found' }` for unknown barcode | unit | `npm test -- src/actions/products/lookupBarcode.test.ts` | ❌ Wave 0 |
| RCPT-01 | `buildReceiptData()` returns correct structure with all D-09 fields | unit | `npm test -- src/lib/receipt.test.ts` | ❌ Wave 0 |
| RCPT-02 | `ReceiptData` type serialises to JSON and back without loss | unit | `npm test -- src/lib/receipt.test.ts` | ❌ Wave 0 |

**Note on SCAN-01 camera test:** The full `BarcodeScannerSheet` component cannot be unit tested for actual camera decode (requires real device). The component test only verifies rendering, state transitions, and callback invocation (mock Quagga2). Integration testing of actual barcode decode is manual-only on iPad.

**Manual-only tests (no automated command):**
- Pointing iPad camera at an EAN-13 barcode adds product to cart
- Unknown barcode closes scanner and focuses search bar
- Camera permission denied shows correct copy
- Beep sound plays on successful scan
- Batch mode keeps scanner open between scans

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/actions/products/lookupBarcode.test.ts` — covers SCAN-01, SCAN-02
- [ ] `src/lib/receipt.test.ts` — covers RCPT-01, RCPT-02
- [ ] `src/components/pos/BarcodeScannerSheet.test.tsx` — covers SCAN-01 rendering (mock Quagga)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BarcodeDetector polyfill | @ericblade/quagga2 directly | 2023+ | Safari never shipped BarcodeDetector; polyfills add complexity |
| QuaggaJS (original) | @ericblade/quagga2 (maintained fork) | 2019 | Original repo is abandoned; fork has TypeScript + active fixes |
| SaleSummaryScreen (props-based) | ReceiptScreen (ReceiptData type) | Phase 8 | Typed data model enables future printer path |

**Deprecated/outdated:**
- `SaleSummaryScreen`: Replaced by `ReceiptScreen`. Keep file until ReceiptScreen is verified live, then delete.
- `quagga` (original npm package): Abandoned. Use `@ericblade/quagga2`.

---

## Open Questions

1. **Does `resolveStaffAuth()` return `staff.name`?**
   - What we know: `POSClientShell` receives `staffName` prop from the page. `completeSale` calls `resolveStaffAuth()` which returns `staff_id` and `store_id` at minimum.
   - What's unclear: Whether `name` is in the JWT claims or requires a DB lookup inside `resolveStaffAuth`.
   - Recommendation: Read `src/lib/resolveAuth.ts` before implementing. If `name` is absent, simplest fix is to add it there. Alternatively, pass `staffName` as an input to `completeSale` — but this is less secure (client-supplied).

2. **Quagga2 bundle size on iPad**
   - What we know: `@ericblade/quagga2` unpacked is 3.7MB; the browser bundle is smaller after tree-shaking. It uses `Worker` for decode — the worker JS chunk will be lazily loaded.
   - What's unclear: Whether the Quagga2 worker file is correctly bundled by Next.js webpack. Some users report needing `next.config.ts` adjustments for Web Worker loading.
   - Recommendation: Test build output. If the worker fails to load, add `config.module.rules.push({ test: /worker\.js$/, use: { loader: 'worker-loader' } })` or use Quagga2's `locator: { halfSample: true }` mode which is less compute-intensive.

3. **Admin "View Receipt" page location**
   - What we know: D-12 says old receipts viewable from admin order detail page. The admin orders page exists at `/admin/orders`. There is no `/admin/orders/[id]` route in the current codebase — only the `OrderDetailDrawer` component.
   - What's unclear: Whether "View Receipt" is inside the drawer or a separate page.
   - Recommendation: Add "View Receipt" button inside `OrderDetailDrawer` that renders `ReceiptScreen` in a modal/sheet. No new page route needed.

---

## Project Constraints (from CLAUDE.md)

All constraints from CLAUDE.md apply. Key ones relevant to this phase:

| Constraint | Application |
|------------|-------------|
| No Prisma / raw pg | Barcode lookup uses Supabase JS client only (`supabase.from('products').eq('barcode', ...)`) |
| No CSS Modules / styled-components | Scanner overlay and receipt use Tailwind v4 utility classes only |
| No Tailwind v3 | Use v4 syntax — CSS-native config, no `tailwind.config.js` |
| Zod validation on all Server Actions | `lookupBarcode` must validate the barcode string input with Zod before querying |
| `server-only` import on server files | `lookupBarcode.ts` must import `server-only` |
| Vitest for unit tests (not Jest) | All new tests use Vitest + jsdom |
| Read DESIGN.md before visual decisions | Done via 08-UI-SPEC.md which already encodes DESIGN.md constraints |
| No Supabase Realtime | Not applicable to this phase |
| No Stripe Terminal SDK | Not applicable to this phase |

---

## Sources

### Primary (HIGH confidence)
- Codebase direct read — `POSClientShell.tsx`, `SaleSummaryScreen.tsx`, `POSTopBar.tsx`, `EftposConfirmScreen.tsx`, `cart.ts`, `completeSale.ts`, `005_pos_rpc.sql`, `001_initial_schema.sql`, `database.ts`, `vitest.config.mts` — 2026-04-02
- `08-UI-SPEC.md` — UI design contract, component spec, `ReceiptData` type, copywriting contract — 2026-04-02
- `08-CONTEXT.md` — All locked decisions (D-01 through D-13) — 2026-04-02
- npm registry — `@ericblade/quagga2@1.12.1`, `@zxing/browser@0.1.5`, `html5-qrcode@2.3.8` — versions confirmed 2026-04-02
- lucide-react installed package — `ScanBarcode` icon confirmed present — 2026-04-02

### Secondary (MEDIUM confidence)
- MDN Web Docs — BarcodeDetector API — Safari not supported, WebKit flag only — cross-referenced with caniuse.com — 2025
- scanbot.io blog — Quagga2 vs html5-qrcode comparison — maintenance status, iOS limitations confirmed — 2025
- ericblade/quagga2 GitHub README — `ean_reader`/`upc_reader` config, init pattern — MEDIUM (not Context7 verified)
- MDN Web Docs — Vibration API — iOS Safari not supported — 2025

### Tertiary (LOW confidence)
- WebSearch — Quagga2 Strict Mode double-mount behavior — single source, needs validation at implementation time
- WebSearch — Next.js webpack + Web Worker for Quagga2 — community reports only, not in official Next.js docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — library versions confirmed from npm registry; existing package versions from package.json
- Architecture: HIGH — patterns derived from existing codebase code (EftposConfirmScreen, completeSale) and UI-SPEC.md
- Barcode library choice: MEDIUM — Quagga2 is the correct choice but iOS behavior requires real-device validation
- Pitfalls: MEDIUM — AudioContext/iOS pitfall is well-documented; Quagga2 Strict Mode pitfall is community-sourced
- Receipt data model: HIGH — ReceiptData type specified in UI-SPEC.md; JSONB pattern is standard Postgres/Supabase

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable libraries; Quagga2 updates infrequently)
