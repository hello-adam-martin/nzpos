# Phase 34: Signup Conversion & Landing Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 34-signup-conversion-landing-page
**Areas discussed:** Signup CTA Presentation, CTA Copy & Messaging, Landing Page Demo Button Placement, Demo Button Visual Treatment
**Mode:** Auto (--auto flag, all recommended defaults selected)

---

## Signup CTA Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Inline banner below receipt | Non-intrusive section below receipt content | ✓ |
| Overlay/modal | Full-screen or centered modal overlay | |
| Slide-up panel | Bottom sheet that slides up over receipt | |

**User's choice:** [auto] Inline banner below receipt (recommended default)
**Notes:** Consistent with Phase 33 D-11 philosophy — no pushy overlays or watermarks. Receipt screen already has `onNewSale` callback for reset behavior.

| Option | Description | Selected |
|--------|-------------|----------|
| Close button resets to new sale | Dismiss triggers onNewSale callback | ✓ |
| Separate dismiss and new sale actions | Two buttons: dismiss (hide CTA) and new sale (reset cart) | |

**User's choice:** [auto] Close button resets to new sale (recommended default)
**Notes:** Matches CONV-03 requirement. Single action simplifies UX.

---

## CTA Copy & Messaging

| Option | Description | Selected |
|--------|-------------|----------|
| Confident Kiwi SaaS tone | Match established Phase 28 messaging | ✓ |
| Playful/casual tone | More informal, conversational | |
| Urgency-driven tone | "Limited time", "Start now" style | |

**User's choice:** [auto] Confident Kiwi SaaS tone (recommended default)
**Notes:** Established in Phase 28 D-07. Consistency across all touchpoints.

| Option | Description | Selected |
|--------|-------------|----------|
| Claude's Discretion | Planner writes copy matching tone constraints | ✓ |
| Prescriptive headline | Lock in specific headline now | |

**User's choice:** [auto] Claude's Discretion (recommended default)
**Notes:** Copy is a downstream planning concern. Key constraint: brief, action-oriented.

---

## Landing Page Demo Button Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Hero section (secondary CTA) | Next to "Get started free" in hero | ✓ |
| Features section | After feature cards, before pricing | |
| Own section | Dedicated demo section between hero and features | |

**User's choice:** [auto] Hero section as secondary CTA (recommended default)
**Notes:** Standard SaaS pattern (Stripe, Linear). First thing visitors see, both paths available without scrolling.

---

## Demo Button Visual Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Ghost/outlined (white border on navy) | Secondary visual hierarchy | ✓ |
| Amber filled (same as signup) | Equal visual weight to both CTAs | |
| Text link (no button) | Minimal, underlined text link | |

**User's choice:** [auto] Ghost/outlined button (recommended default)
**Notes:** Clear visual hierarchy — amber is primary, outlined is secondary. Avoids two competing amber buttons.

---

## Claude's Discretion

- Exact CTA copy (headline, sub-copy, button text)
- CTA banner background/border styling
- Spacing relative to receipt content
- Whether LandingCTA.tsx also gets a demo link
- CTA appearance animation

## Deferred Ideas

- 2-column signup page redesign (Stripe/Linear style) — future conversion optimization phase
- Demo-to-signup tracking/analytics — future phase
- A/B testing CTA copy — future optimization
