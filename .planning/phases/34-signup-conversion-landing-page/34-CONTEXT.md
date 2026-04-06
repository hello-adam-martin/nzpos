# Phase 34: Signup Conversion & Landing Page - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

After a demo sale completes, visitors see a signup CTA that links to the merchant signup page and can be dismissed to start a new demo. The landing page gains a "Try POS Demo" button that navigates to `/demo/pos`. This phase connects the demo experience to the conversion funnel.

</domain>

<decisions>
## Implementation Decisions

### Signup CTA Presentation (CONV-01, CONV-03)
- **D-01:** Inline banner below the receipt content — not an overlay or modal. Appears after the sale completes as a natural next section below the receipt on the ReceiptScreen. Non-intrusive, consistent with Phase 33's demo UX philosophy (no watermarks, no pushy overlays).
- **D-02:** CTA includes a dismiss action (close button or "Start new sale" link) that resets to empty cart for a fresh demo session. Uses the existing `onNewSale` callback pattern from ReceiptScreen.
- **D-03:** CTA only appears when `demoMode` is true — production receipt screen is unaffected.

### CTA Copy & Messaging
- **D-04:** Confident Kiwi SaaS tone — matches Phase 28 D-07 established messaging direction. Brief, action-oriented, references the demo experience.
- **D-05:** Claude's Discretion on exact headline and sub-copy wording. Key constraint: should feel like a natural continuation of the demo, not a hard sell.

### CTA Navigation (CONV-02)
- **D-06:** CTA links to `/signup` — the existing merchant signup page. No special query params or tracking needed for v1.

### Landing Page Demo Button (LAND-01, LAND-02)
- **D-07:** "Try POS Demo" button placed in the hero section as a secondary CTA alongside the existing "Get started free" amber button. Two CTAs in the hero: primary (signup) and secondary (demo).
- **D-08:** Ghost/outlined button style — white border on navy background, contrasting with the filled amber primary CTA. Clear visual hierarchy: amber = primary action, outlined = secondary action.
- **D-09:** Button navigates to `/demo/pos` via standard Next.js `<Link>`.

### Claude's Discretion
- Exact CTA copy (headline, sub-copy, button text)
- Whether CTA banner uses a subtle background color or border to distinguish from receipt content
- Spacing and padding of the CTA section relative to the receipt
- Whether to also add a "Try POS Demo" link in the landing page bottom CTA section (LandingCTA.tsx)
- Animation/transition for CTA appearance (fade-in vs instant)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Receipt Screen (CTA integration point)
- `src/components/pos/ReceiptScreen.tsx` — Add demo signup CTA section below receipt content when demoMode is true
- `src/components/pos/POSClientShell.tsx` — Passes `demoMode` and `onNewSale` props; CTA dismiss triggers `onNewSale`

### Landing Page (demo button integration point)
- `src/app/(marketing)/components/LandingHero.tsx` — Add secondary "Try POS Demo" button alongside "Get started free"
- `src/app/(marketing)/components/LandingCTA.tsx` — Optional: add demo link here too

### Design System
- `DESIGN.md` — Colors (navy #1E293B, amber #E67E22), typography (Satoshi display, DM Sans body), spacing (8px base), border radius, motion. All new elements must comply.

### Existing Signup Flow
- `src/app/signup/page.tsx` — Merchant signup page (CTA target)
- `src/components/signup/SignupForm.tsx` — Signup form component

### Demo Mode Context
- `.planning/phases/33-demo-pos-route-checkout/33-CONTEXT.md` — Demo mode decisions (D-10 through D-12: DEMO badge, no watermark, receipt reset behavior)

### Requirements
- `.planning/REQUIREMENTS.md` — CONV-01 through CONV-03, LAND-01 through LAND-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ReceiptScreen.tsx` — Already accepts `onNewSale` callback and `mode` prop; CTA section can be added as a conditional block when demo mode is active
- `LandingHero.tsx` — Uses CSS custom properties from DESIGN.md, `<Link>` components for CTAs; adding a second button is straightforward
- `LandingCTA.tsx` — Simple CTA section; could optionally get a secondary demo link
- All marketing components use `var(--color-navy)`, `var(--color-amber)`, `var(--space-*)` consistently

### Established Patterns
- Marketing buttons: amber filled CTA with `hover:opacity-90 transition-opacity duration-150`
- Ghost/outline buttons: no existing pattern in marketing components — will establish one here
- ReceiptScreen: client component with internal state; CTA can be added as a new section below totals/footer
- Demo mode flag: `demoMode` prop flows through POSClientShell → child components

### Integration Points
- `ReceiptScreen.tsx`: Add `demoMode?: boolean` prop, render CTA section conditionally
- `POSClientShell.tsx`: Pass `demoMode` to ReceiptScreen (already passes other demo-conditional props)
- `LandingHero.tsx`: Add second `<Link>` button in the copy column
- Optionally `LandingCTA.tsx`: Add secondary link

</code_context>

<specifics>
## Specific Ideas

- Signup page redesign with 2-column layout (marketing content left, form right) is a separate future enhancement — not in scope for this phase. The CTA simply links to the existing `/signup` page.

</specifics>

<deferred>
## Deferred Ideas

- 2-column signup page redesign (Stripe/Linear style with value prop panel) — noted in project memory, belongs in a future conversion optimization phase
- Demo-to-signup tracking/analytics (UTM params, conversion funnel metrics) — future phase
- A/B testing CTA copy variants — future optimization

</deferred>

---

*Phase: 34-signup-conversion-landing-page*
*Context gathered: 2026-04-06*
