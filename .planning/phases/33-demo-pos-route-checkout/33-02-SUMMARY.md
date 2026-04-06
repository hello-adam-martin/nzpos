---
phase: 33-demo-pos-route-checkout
plan: "02"
subsystem: pos-demo
tags: [demo, pos, client-side, feature-gating]
dependency_graph:
  requires: [33-01]
  provides: [demo-mode-sale-simulation, demo-badge-topbar]
  affects: [src/components/pos/POSClientShell.tsx, src/components/pos/POSTopBar.tsx]
tech_stack:
  added: []
  patterns:
    - demoMode prop pattern for conditional feature gating in shared components
    - crypto.getRandomValues for client-side fake order ID generation
    - Hook output override pattern to suppress polling side effects in demo mode
key_files:
  created:
    - src/components/pos/__tests__/POSClientShell.demo.test.tsx
  modified:
    - src/components/pos/POSClientShell.tsx
    - src/components/pos/POSTopBar.tsx
decisions:
  - demoMode prop uses override pattern for useNewOrderAlert output (hook called unconditionally per React rules, values overridden when demoMode=true)
  - Test file mocks cash session server actions to break server-only import chain from POSTopBar -> CashUpModal -> openCashSession
  - demo sale intercept returns early before completeSale call, no router.refresh() in demo mode
metrics:
  duration: "~5 min"
  completed: "2026-04-06T09:29:29Z"
  tasks_completed: 3
  files_modified: 3
---

# Phase 33 Plan 02: Demo Mode Feature Gating Summary

**One-liner:** demoMode prop threading through POSClientShell and POSTopBar with client-side sale simulation via buildReceiptData and DEMO amber badge

## What Was Built

Added `demoMode` and `demoStore` props to `POSClientShell` and `demoMode` to `POSTopBar`. When `demoMode=true`:

- **POSTopBar** renders an amber pill "DEMO" badge next to the store name, hides nav links (POS/Pickups), barcode scanner button, staff name, logout button, mute toggle, and cash session controls
- **POSClientShell** intercepts `handleCompleteSale` before calling the `completeSale` server action, builds receipt data client-side using `buildReceiptData` with a fake 8-char hex order ID (via `crypto.getRandomValues`), and dispatches `SALE_COMPLETE` directly
- **Order polling** — `useNewOrderAlert` hook still called (React rules), but its return values are overridden to `{unreadCount:0, toast:null, isMuted:false, toggleMute:()=>{}}` in demo mode
- **Visibility change** — `router.refresh()` call is guarded with `!demoMode`
- **Email capture** — `onEmailCapture` passed as `undefined` to `ReceiptScreen` in demo mode

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Create demo mode test skeleton | ddbf8ce | src/components/pos/__tests__/POSClientShell.demo.test.tsx |
| 1 | Add demoMode to POSClientShell and POSTopBar | 35ded09 | POSClientShell.tsx, POSTopBar.tsx, POSClientShell.demo.test.tsx |
| 2 | Verify demo POS full checkout flow | (auto-approved) | — |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Mock] Added vi.mock for server-only cash session actions in test file**
- **Found during:** Task 0/1 — test file would fail with "This module cannot be imported from a Client Component module"
- **Issue:** `POSTopBar` imports `CashUpModal` which imports `openCashSession`/`closeCashSession` which import `server-only`. Vitest's jsdom environment blocks this import.
- **Fix:** Added `vi.mock('@/actions/cash-sessions/openCashSession', ...)` and `vi.mock('@/actions/cash-sessions/closeCashSession', ...)` at the top of the test file, along with `vi.mock('next/navigation', ...)`.
- **Files modified:** `src/components/pos/__tests__/POSClientShell.demo.test.tsx`
- **Commit:** 35ded09

## Test Results

- 3 new demo mode tests added: all GREEN
- Total tests: 569 passed (was 566), 3 failed (all pre-existing, in processPartialRefund/processRefund tests unrelated to this plan)
- TypeScript: 0 new errors (3 pre-existing errors in adjustStock.ts, createProduct.ts, importProducts.ts remain)

## Known Stubs

None. All behaviors implemented: demo sale simulation, DEMO badge, feature gating for scanner/polling/email/logout/mute.

## Self-Check: PASSED
