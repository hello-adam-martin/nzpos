---
phase: 08-checkout-speed
plan: 02
subsystem: ui
tags: [barcode, quagga2, camera, pos, server-action, vitest]

dependency_graph:
  requires:
    - phase: 08-01
      provides: ReceiptData type, database migration (barcode column confirmed on products table)
  provides:
    - lookupBarcode server action (barcode-to-product query, store-scoped)
    - BarcodeScannerSheet component (Quagga2 camera overlay, batch mode, beep/haptics, manual entry, error states)
    - BarcodeScannerButton component (icon button for POSTopBar)
    - POSTopBar wired with onScanOpen and scanDisabled guard
    - POSClientShell with dynamic import, scanner state, searchInputRef, AudioContext on user gesture
    - ProductGrid searchInputRef forwarding for post-scan search focus
  affects: [08-03-receipt-screen]

tech-stack:
  added: ["@ericblade/quagga2 (EAN-13/UPC-A barcode decoding from camera)"]
  patterns:
    - "Dynamic import with ssr: false for browser-only libraries (Quagga2)"
    - "AudioContext created on user gesture tap (iOS Safari requirement for beep)"
    - "scanLockRef boolean to prevent barcode detection race conditions"
    - "initializedRef guard to prevent Quagga2 double-init in React Strict Mode"
    - "dynamic() import with named export extraction: .then(m => ({ default: m.BarcodeScannerSheet }))"

key-files:
  created:
    - src/actions/products/lookupBarcode.ts
    - src/actions/products/lookupBarcode.test.ts
    - src/components/pos/BarcodeScannerSheet.tsx
    - src/components/pos/BarcodeScannerButton.tsx
  modified:
    - src/components/pos/POSTopBar.tsx
    - src/components/pos/POSClientShell.tsx
    - src/components/pos/ProductGrid.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "Quagga2 loaded via dynamic import inside useEffect (not top-level import) to survive SSR safety check at component level even with ssr: false on the parent dynamic()"
  - "Quagga2 init 'name' field removed — not in the TypeScript types for @ericblade/quagga2; init works without it"
  - "AudioContext created in handleScanOpen (user gesture handler) and stored on scannerAudioCtxRef — passed to BarcodeScannerSheet as prop to enable beep on iOS"
  - "Scanner disabled (scanDisabled prop) when cart.phase !== 'idle' — prevents opening during EFTPOS/cash/processing flows"
  - "scanLine CSS animation uses @keyframes in <style> tag inside component — Tailwind v4 does not support arbitrary @keyframes in utilities"

patterns-established:
  - "Pattern: Browser-only overlay components dynamically imported with ssr: false and named export extraction"
  - "Pattern: AudioContext lifecycle — create on user gesture, store on ref, reuse across beeps with resume()"

requirements-completed: [SCAN-01, SCAN-02]

duration: 4min
completed: "2026-04-02"
---

# Phase 8 Plan 2: Barcode Scanner Summary

**Quagga2 camera overlay with EAN-13/UPC-A decode, store-scoped barcode lookup, batch mode, beep/haptics, and search-focus fallback wired into the POS shell.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-02T08:25:10Z
- **Completed:** 2026-04-02T08:29:02Z
- **Tasks:** 2 (Task 3 is checkpoint:human-verify — awaiting device verification)
- **Files modified:** 9

## Accomplishments

- lookupBarcode server action: Zod-validated barcode input, store-scoped `products` query, 4 typed error responses, 5 Vitest tests passing
- BarcodeScannerSheet: Quagga2 camera overlay with batch mode, Web Audio API beep (iOS-safe), 80ms haptic vibration, manual barcode entry keyboard fallback, error states, focus trap, ARIA attributes
- BarcodeScannerButton: accessible icon button with disabled state for payment flow guard
- POSTopBar/POSClientShell/ProductGrid fully wired — scan button appears in top bar, scanner opens as overlay, successful scan adds to cart, failed scan closes and focuses search bar

## Task Commits

Each task was committed atomically:

1. **Task 1: lookupBarcode server action and scanner components** - `c652a8b` (feat)
2. **Task 2: Wire scanner into POSTopBar, POSClientShell, ProductGrid** - `408a8aa` (feat)
3. **Task 3: Verify barcode scanning on device** - PENDING (checkpoint:human-verify)

## Files Created/Modified

- `src/actions/products/lookupBarcode.ts` — Server action: Zod-validated barcode lookup, store-scoped, typed error union
- `src/actions/products/lookupBarcode.test.ts` — 5 Vitest tests: valid match, not_found, invalid input, non-numeric, unauthenticated
- `src/components/pos/BarcodeScannerSheet.tsx` — Camera overlay: Quagga2 init, batch mode, beep, haptics, manual entry, error/denied states, ARIA dialog, focus trap
- `src/components/pos/BarcodeScannerButton.tsx` — Icon button with disabled state and aria-label
- `src/components/pos/POSTopBar.tsx` — Added onScanOpen, scanDisabled props; renders BarcodeScannerButton after nav
- `src/components/pos/POSClientShell.tsx` — Dynamic import BarcodeScannerSheet (ssr: false), scannerOpen state, searchInputRef, AudioContext on user gesture, scanner overlay
- `src/components/pos/ProductGrid.tsx` — Added searchInputRef prop, attached to search input element
- `package.json` / `package-lock.json` — Added @ericblade/quagga2

## Decisions Made

- Quagga2 init `name` field removed (not in TypeScript types) — camera initializes correctly without it
- AudioContext created in the scan button handler (user gesture) and passed as prop to BarcodeScannerSheet — ensures iOS Safari audio is unlocked before first beep
- Scanner button disabled (not hidden) during non-idle cart phases — prevents opening during EFTPOS/cash payment flows
- scanLine animation defined in inline `<style>` tag — Tailwind v4 does not support arbitrary `@keyframes` definitions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unsupported 'name' field from Quagga2 inputStream config**
- **Found during:** Task 1 (TypeScript compile check)
- **Issue:** `Quagga.init({ inputStream: { name: 'Live', ... } })` caused TS2353 — 'name' does not exist in Quagga2's TypeScript types
- **Fix:** Removed the `name` field; Quagga2 initializes correctly without it (it is cosmetic only)
- **Files modified:** src/components/pos/BarcodeScannerSheet.tsx
- **Verification:** `npx tsc --noEmit` — no new errors
- **Committed in:** c652a8b (included in Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minimal — cosmetic field removed, no functional change.

## Issues Encountered

- Pre-existing `.next/types/validator.ts` errors (2 errors re: dev-login routes) confirmed pre-existing per 08-01-SUMMARY.md — not introduced by this plan.

## Known Stubs

None — all functionality is fully wired. The `BarcodeScannerSheet` renders a real camera overlay with Quagga2 and calls the real `lookupBarcode` server action.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Barcode scanner is fully implemented and wired into the POS shell
- Task 3 (human-verify) requires device testing with a real camera and product barcodes
- Phase 08-03 (receipt screen) can proceed independently of Task 3 verification
- The `lookupBarcode` action follows the same pattern as other server actions and is ready for production

---
*Phase: 08-checkout-speed*
*Completed: 2026-04-02*
