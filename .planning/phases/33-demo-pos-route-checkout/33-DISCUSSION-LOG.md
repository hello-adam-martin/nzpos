# Phase 33: Demo POS Route & Checkout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 33-demo-pos-route-checkout
**Areas discussed:** Route Architecture, Component Reuse Strategy, Sale Simulation, Demo Mode UX
**Mode:** Auto (--auto flag, all recommended defaults selected)

---

## Route Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| New route group `(demo)` | Separate route group with own layout, middleware passthrough | ✓ |
| Shared `(pos)` group with auth bypass | Reuse existing POS layout, conditional auth in page | |
| API route proxy | Proxy demo requests through API route to existing POS | |

**User's choice:** [auto] New route group `(demo)/demo/pos/page.tsx` with middleware passthrough
**Notes:** Cleanest separation. Middleware already has route-specific early returns. No risk of breaking production POS auth.

---

## Component Reuse Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| demoMode prop on POSClientShell | Pass boolean, conditionally disable features | ✓ |
| Fork DemoPOSShell | Duplicate component with demo-specific logic | |
| HOC wrapper | Wrap POSClientShell with demo behavior injection | |

**User's choice:** [auto] demoMode prop — minimal code, keeps demo in sync with production
**Notes:** All child components (ProductGrid, CartPanel, payment screens) work as-is with props/state. Only POSClientShell and POSTopBar need conditional logic.

---

## Sale Simulation

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side receipt build | Build receipt from cart state, no server action call | ✓ |
| Demo-aware server action | completeSale checks demo mode, skips DB writes | |
| Separate demo action | New server action that only returns mock data | |

**User's choice:** [auto] Client-side only — zero DB interaction, simplest approach
**Notes:** cart.ts has all calculation logic. Generate fake order ID client-side. Receipt screen renders identically.

---

## Demo Mode UX

| Option | Description | Selected |
|--------|-------------|----------|
| DEMO badge in top bar | Small pill/tag next to store name, no other indicators | ✓ |
| Persistent banner | Full-width banner at top saying "Demo Mode" | |
| Watermark overlay | Semi-transparent watermark across the POS | |

**User's choice:** [auto] DEMO badge — non-intrusive, showcases real POS experience
**Notes:** No staff name, logout, mute, or notification badge shown. Store name "Aroha Home & Gift" displayed.

---

## Claude's Discretion

- Conditional logic placement in POSClientShell
- Demo receipt builder extraction
- Category filter default state
- Loading states for demo page

## Deferred Ideas

- Signup CTA overlay after demo sale → Phase 34
- Landing page "Try POS Demo" button → Phase 34
