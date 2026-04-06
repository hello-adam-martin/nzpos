# Phase 28: Marketing Landing Page - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete rewrite of the marketing landing page content and structure to accurately showcase all shipped features across v1.0-v4.0, display all three paid add-ons with correct pricing, and present copy that reflects a mature multi-tenant SaaS platform rather than an early MVP.

</domain>

<decisions>
## Implementation Decisions

### Features Section Layout
- **D-01:** Features organized into 3-4 grouped categories (e.g. "Sell In-Store", "Sell Online", "Manage Your Business", "Stay Compliant") with compact feature cards under each heading
- **D-02:** Each card has an inline SVG icon + title + 1-line description (compact style, not rich cards)
- **D-03:** Must cover all 10+ shipped capabilities: POS, online store, GST, inventory, barcode scanning, customer accounts, staff management, reporting, receipts, click-and-collect, promo codes, partial refunds

### Pricing Section Structure
- **D-04:** Free tier hero card at top, followed by 3 equal add-on cards below (Xero $9/mo, Email Notifications $5/mo, Inventory Management $9/mo)
- **D-05:** Free tier list includes core features only: POS checkout, online storefront, GST-compliant receipts, staff management, customer accounts, reporting. No mention of inventory (it's a paid add-on)
- **D-06:** Add-on cards are informational only — no per-card subscribe/CTA buttons. Main "Get started free" CTA handles all signup flow

### Hero Copy & Messaging Tone
- **D-07:** Confident Kiwi SaaS tone — keep NZ identity but upgrade confidence to reflect mature platform. Not MVP-era "ring up sales" messaging
- **D-08:** Keep the CSS-only iPad mockup illustration in the hero (desktop only). Update mock screen content if needed
- **D-09:** Sub-copy wording at Claude's discretion — should complement new headline and match confident Kiwi SaaS tone

### Page Structure & Navigation
- **D-10:** Page order: Hero → Features → NZ Callout Strip → Pricing → CTA → Footer
- **D-11:** New section: NZ callout strip as a full-width highlighted banner (amber or navy) between Features and Pricing. Content: GST-compliant, NZD pricing, Built in NZ
- **D-12:** No "How it works" section — keep it tight
- **D-13:** CTA section copy to be refreshed to match new confident tone

### Claude's Discretion
- Features section heading — Claude picks wording that fits the overall messaging tone
- Nav anchor links — Claude decides based on final page length
- Sub-copy wording — Claude writes to complement the headline
- NZ callout strip exact content and color choice (amber or navy)
- Feature grouping names and assignment of features to groups

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Full design system: colors (navy #1E293B, amber #E67E22), typography (Satoshi display, DM Sans body), spacing (8px base), border radius, motion. All sections must comply.

### Existing Marketing Components
- `src/app/(marketing)/components/LandingNav.tsx` — Sticky nav, mobile hamburger via details/summary
- `src/app/(marketing)/components/LandingHero.tsx` — 2-col hero with CSS iPad mockup
- `src/app/(marketing)/components/LandingFeatures.tsx` — Feature cards with inline SVGs (current: 4 features only)
- `src/app/(marketing)/components/LandingPricing.tsx` — Free tier card + 2 add-on cards (missing Inventory)
- `src/app/(marketing)/components/LandingCTA.tsx` — Bottom CTA section
- `src/app/(marketing)/components/LandingFooter.tsx` — Copyright + footer links

### Requirements
- `.planning/REQUIREMENTS.md` — MKT-01 through MKT-09 define acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LandingNav` — sticky header with mobile hamburger; may need anchor links added
- `LandingHero` — iPad mockup CSS illustration is reusable, just update copy
- `LandingFooter` — minimal changes expected
- All components use CSS custom properties (`var(--color-navy)`, `var(--space-md)`, etc.) consistent with DESIGN.md

### Established Patterns
- Components are standalone, no shared state — each is a simple function component
- Inline SVG icons for feature cards (hand-crafted, no icon library)
- Tailwind v4 CSS-native config with custom properties for all design tokens
- `max-w-[1200px]` container pattern used consistently
- Responsive: `md:` breakpoint for desktop, mobile-first

### Integration Points
- Marketing page layout in `src/app/(marketing)/page.tsx` — imports and composes all Landing* components
- Signup link points to `/signup` (existing merchant self-serve signup flow)
- Login link points to `/login`

</code_context>

<specifics>
## Specific Ideas

- NZ callout strip should be a prominent highlighted banner (not a subtle icon strip) — user wants it to stand out
- Free tier must NOT list inventory management — that's a paid add-on
- iPad mockup stays as-is (CSS illustration, no real screenshot needed)
- Overall direction: upgrade from MVP messaging to confident SaaS platform positioning while keeping the Kiwi identity

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-marketing-landing-page*
*Context gathered: 2026-04-06*
