# Phase 28: Marketing Landing Page - Research

**Researched:** 2026-04-06
**Domain:** Marketing landing page — content rewrite and structural expansion of existing React/Tailwind components
**Confidence:** HIGH

## Summary

This phase is a content and layout rewrite of six existing marketing components (`LandingNav`, `LandingHero`, `LandingFeatures`, `LandingPricing`, `LandingCTA`, `LandingFooter`) plus the addition of one new component (`LandingNZCallout`). The codebase is fully established — no new dependencies, no new patterns to introduce, no architectural decisions outstanding. All components are stateless function components with inline SVG icons and Tailwind v4 utility classes.

The central tasks are: (1) expand `LandingFeatures` from 4 cards to 12+ cards organised into category groups, (2) fix `LandingPricing` to remove Inventory Management from the free tier and add it as a third add-on card, (3) upgrade hero and CTA copy from MVP-era messaging to confident SaaS tone, (4) add the new `LandingNZCallout` strip between Features and Pricing, and (5) wire all of this into `page.tsx` in the correct order.

The biggest correctness risk is the free tier feature list: the current `LandingPricing.tsx` includes "Inventory management" in the free tier. Decision D-05 locks this out — Inventory Management is a paid add-on only. This must not appear in the free tier list.

**Primary recommendation:** Rewrite each component in place. No new libraries. No structural changes to the route or layout. One new component file for the NZ callout strip.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Features organised into 3-4 grouped categories (e.g. "Sell In-Store", "Sell Online", "Manage Your Business", "Stay Compliant") with compact feature cards under each heading
- **D-02:** Each card has an inline SVG icon + title + 1-line description (compact style, not rich cards)
- **D-03:** Must cover all 10+ shipped capabilities: POS, online store, GST, inventory, barcode scanning, customer accounts, staff management, reporting, receipts, click-and-collect, promo codes, partial refunds
- **D-04:** Free tier hero card at top, followed by 3 equal add-on cards below (Xero $9/mo, Email Notifications $5/mo, Inventory Management $9/mo)
- **D-05:** Free tier list includes core features only: POS checkout, online storefront, GST-compliant receipts, staff management, customer accounts, reporting. No mention of inventory (it's a paid add-on)
- **D-06:** Add-on cards are informational only — no per-card subscribe/CTA buttons. Main "Get started free" CTA handles all signup flow
- **D-07:** Confident Kiwi SaaS tone — keep NZ identity but upgrade confidence to reflect mature platform. Not MVP-era "ring up sales" messaging
- **D-08:** Keep the CSS-only iPad mockup illustration in the hero (desktop only). Update mock screen content if needed
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MKT-01 | Features section showcases all major shipped capabilities (POS, online store, GST, inventory, barcode scanning, customer accounts, staff management, reporting, receipts, click-and-collect) | D-01 through D-03 define grouping and card structure; inline SVG pattern already established in current LandingFeatures.tsx |
| MKT-02 | Each feature card has a clear title, description, and icon | D-02 locks compact style; existing SVG icon pattern (24x24, stroke="currentColor") is the template |
| MKT-03 | Pricing section lists all 3 add-ons: Xero ($9/mo), Email Notifications ($5/mo), Inventory Management ($9/mo) | Current LandingPricing.tsx has only 2 add-ons; must add Inventory Management card |
| MKT-04 | Free tier feature list accurately reflects what's included at no cost | D-05 explicitly bans Inventory Management from free tier; current code has it listed — this is the key correction |
| MKT-05 | Each add-on card lists its key benefits | Current Xero and Email Notifications cards already have benefit lists; Inventory Management card needs one |
| MKT-06 | Hero copy reflects mature SaaS platform (not just MVP) | D-07/D-08/D-09 guide tone and structure; headline and sub-copy rewrite only |
| MKT-07 | CTA sections updated with compelling messaging | D-13; LandingCTA.tsx heading and sub-copy rewrite |
| MKT-08 | All sections follow DESIGN.md (navy/amber, Satoshi/DM Sans, spacing tokens) | All existing components already use CSS custom properties; new LandingNZCallout must follow same pattern |
| MKT-09 | Page is responsive (mobile, tablet, desktop) | Existing breakpoint pattern: mobile-first, `md:` for desktop; new components must follow same approach |
</phase_requirements>

---

## Standard Stack

### Core

No new dependencies for this phase. All implementation uses the existing stack.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2 | Page composition and static rendering | `export const dynamic = 'force-static'` already set in page.tsx — keep this |
| Tailwind CSS v4 | 4.2 | Utility-first styling | CSS-native config already in place; custom properties (`var(--color-navy)` etc.) are the project's token system |
| React | 19 | Component rendering | Stateless function components — no hooks needed for this phase |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| server-only | latest | Prevent accidental client import | Not needed here — all marketing components are pure presentational, no server secrets |

**Installation:** No new packages required.

---

## Architecture Patterns

### Component File Locations

```
src/app/(marketing)/
├── components/
│   ├── LandingNav.tsx          — existing, minor changes (anchor links if decided)
│   ├── LandingHero.tsx         — existing, copy rewrite only
│   ├── LandingFeatures.tsx     — existing, full content rewrite + grouped layout
│   ├── LandingNZCallout.tsx    — NEW component
│   ├── LandingPricing.tsx      — existing, fix free tier + add third add-on card
│   ├── LandingCTA.tsx          — existing, copy rewrite only
│   └── LandingFooter.tsx       — existing, no changes expected
src/app/
└── page.tsx                    — add LandingNZCallout import + insert between Features and Pricing
```

### Pattern 1: Grouped Features Layout (LandingFeatures rewrite)

**What:** Replace flat 2-column grid of 4 cards with grouped sections. Each group has a heading and a compact grid of feature cards.

**When to use:** When feature count is too high for a single flat grid. Groups aid scanability.

**Structure:**
```tsx
// Source: existing LandingFeatures.tsx pattern + D-01/D-02 decisions
const featureGroups = [
  {
    heading: 'Sell In-Store',
    features: [
      { title: 'POS Checkout', description: '...', icon: <svg .../> },
      { title: 'Barcode Scanning', description: '...', icon: <svg .../> },
      { title: 'EFTPOS Payments', description: '...', icon: <svg .../> },
      { title: 'Receipts', description: '...', icon: <svg .../> },
    ],
  },
  {
    heading: 'Sell Online',
    features: [...],
  },
  // ...
]

// Render pattern
featureGroups.map(group => (
  <div key={group.heading}>
    <h3 className="font-sans text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
      {group.heading}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[var(--space-md)] mt-[var(--space-md)]">
      {group.features.map(f => (
        <div key={f.title} className="flex gap-[var(--space-sm)] items-start">
          <div className="text-[var(--color-navy)] shrink-0">{f.icon}</div>
          <div>
            <p className="font-sans text-sm font-bold text-[var(--color-text)]">{f.title}</p>
            <p className="font-sans text-sm text-[var(--color-text-muted)]">{f.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
))
```

**Note on card density:** D-02 specifies compact style. The existing rich card pattern (white bg + border + shadow + padding) is appropriate for 4 cards but becomes visually heavy at 12+. Switch to the inline icon + text pattern shown above rather than bordered cards for the expanded feature list.

### Pattern 2: Pricing Layout — Free hero + 3-column add-ons (LandingPricing rewrite)

**What:** Free tier in a full-width featured card, then 3 equal add-on cards in a row below.

**When to use:** D-04 locks this structure.

**Structure:**
```tsx
{/* Free tier — full width hero card */}
<div className="bg-white border-2 border-[var(--color-navy)] rounded-lg p-[var(--space-xl)] max-w-lg mx-auto mt-[var(--space-xl)]">
  {/* ... */}
</div>

{/* Add-ons — 3 equal columns */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-lg)] mt-[var(--space-lg)]">
  {/* Xero, Email Notifications, Inventory Management */}
</div>
```

Current code uses `md:grid-cols-2 max-w-lg` for add-ons. Must change to `md:grid-cols-3` with no max-width restriction to accommodate the third card.

### Pattern 3: NZ Callout Strip (new component)

**What:** Full-width banner between Features and Pricing. No max-width container on the background. Content inside max-w-[1200px] container.

**When to use:** D-11 requires this new section.

**Structure:**
```tsx
// Source: pattern derived from LandingCTA.tsx (navy full-width section)
export default function LandingNZCallout() {
  return (
    <section className="bg-[var(--color-amber)]"> {/* or navy — Claude's discretion */}
      <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-xl)]">
        {/* 3-item horizontal strip: GST-compliant | NZD pricing | Built in NZ */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-[var(--space-xl)] text-center">
          {/* each item: icon + label */}
        </div>
      </div>
    </section>
  )
}
```

### Pattern 4: SVG Icon Convention

All existing icons follow this exact template. New icons must match:

```tsx
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  {/* paths */}
</svg>
```

Color is inherited via `currentColor` — the parent sets `text-[var(--color-navy)]` or `text-white` as needed.

### Anti-Patterns to Avoid

- **Importing an icon library:** Project uses inline SVG exclusively. Do not import lucide-react, heroicons, or similar — adds a dependency for zero benefit when icons are hand-crafted.
- **Adding Inventory Management to the free tier list:** This is the key correctness bug in the existing code. D-05 explicitly excludes it.
- **Using bordered rich cards for 12+ features:** At scale, the existing rich card pattern (full border + shadow + padding) becomes visually overwhelming. Use the compact inline icon + text pattern instead.
- **Removing `export const dynamic = 'force-static'` from page.tsx:** This keeps the landing page statically rendered. It must stay.
- **Using `font-display` for body text:** `font-display` maps to Satoshi (headings). Body text and descriptions use `font-sans` (DM Sans). Check existing components — all description text correctly uses `font-sans`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon set | Custom icon design system | Hand-crafted inline SVGs following existing convention | Existing pattern is already in place; consistency matters more than a library |
| Responsive grid | Custom CSS grid logic | Tailwind `grid-cols-1 md:grid-cols-3` | Already the project pattern; no custom CSS needed |
| Color tokens | Hard-coded hex values | `var(--color-navy)`, `var(--color-amber)`, etc. | CSS custom properties are the design token system — hardcoding creates drift |

---

## Common Pitfalls

### Pitfall 1: Free Tier Inventory Bug

**What goes wrong:** Leaving "Inventory management" in the free tier list in LandingPricing.tsx.
**Why it happens:** It's currently there — easy to miss if not reading D-05 carefully.
**How to avoid:** The free tier list per D-05 is exactly: POS checkout, online storefront, GST-compliant receipts, staff management, customer accounts, reporting. Nothing else.
**Warning signs:** If "inventory" appears in the `ul` inside the free tier card.

### Pitfall 2: Add-On Grid Not 3 Columns

**What goes wrong:** Leaving the add-on grid as `md:grid-cols-2` with a `max-w-lg` constraint — the third add-on card won't fit properly.
**Why it happens:** Current code was designed for 2 add-ons.
**How to avoid:** Change to `grid-cols-1 md:grid-cols-3` and remove the max-width constraint on the add-on grid wrapper.
**Warning signs:** Inventory Management card is full-width on desktop rather than 1/3 width.

### Pitfall 3: Feature Cards at Wrong Density

**What goes wrong:** Using the existing rich card layout (white card + border + shadow + xl padding) for all 12+ features — creates a visually overwhelming wall.
**Why it happens:** Copy-pasting existing LandingFeatures card markup without adaptation.
**How to avoid:** Switch to compact inline icon + text layout for grouped features. Reserve rich cards for the pricing section.
**Warning signs:** Feature section height exceeds 2-3 viewport heights on desktop.

### Pitfall 4: Missing `font-display` on Hero Heading

**What goes wrong:** Using `font-sans` instead of `font-display` on the hero H1.
**Why it happens:** Copy/paste error.
**How to avoid:** Hero H1 uses `font-display font-bold` — this maps to Satoshi. All other text uses `font-sans`.
**Warning signs:** Hero heading renders in DM Sans instead of Satoshi.

### Pitfall 5: NZCallout Section Background Bleeding

**What goes wrong:** Applying max-width to the section element itself rather than just the inner content wrapper — the colored background stops at 1200px instead of spanning full viewport width.
**Why it happens:** Misreading the existing pattern.
**How to avoid:** The section element has no max-width. Only the inner `div` has `max-w-[1200px] mx-auto`. This is the established pattern in every existing section — verify by reading any existing component.
**Warning signs:** On wide screens, the callout strip has a visible white gap on left and right sides.

---

## Code Examples

### Existing spacing token reference

```tsx
// Source: All existing Landing* components
// These are the CSS custom properties already defined in the project:
var(--space-xs)   // 4px
var(--space-sm)   // 8px
var(--space-md)   // 16px
var(--space-lg)   // 24px
var(--space-xl)   // 32px
var(--space-2xl)  // 48px
var(--space-3xl)  // 64px
```

### Existing color token reference

```tsx
// Source: DESIGN.md + all existing Landing* components
var(--color-navy)         // #1E293B
var(--color-navy-dark)    // #0F172A
var(--color-navy-light)   // #334155
var(--color-amber)        // #E67E22
var(--color-bg)           // #FAFAF9
var(--color-surface)      // #F5F5F4
var(--color-text)         // #1C1917
var(--color-text-muted)   // #78716C
var(--color-border)       // #E7E5E4
var(--color-success)      // #059669
```

### page.tsx composition (current vs required)

```tsx
// CURRENT (src/app/page.tsx)
<LandingNav />
<LandingHero />
<LandingFeatures />
<LandingPricing />    // no NZ callout
<LandingCTA />
<LandingFooter />

// REQUIRED (per D-10)
<LandingNav />
<LandingHero />
<LandingFeatures />
<LandingNZCallout />  // NEW — must be imported and inserted here
<LandingPricing />
<LandingCTA />
<LandingFooter />
```

### Checkmark icon (existing, reuse in pricing)

```tsx
// Source: existing LandingPricing.tsx — reuse this exact SVG for free tier checklist
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2.5"
  strokeLinecap="round"
  strokeLinejoin="round"
  className="text-[var(--color-success)] shrink-0"
  aria-hidden="true"
>
  <polyline points="20 6 9 17 4 12" />
</svg>
```

---

## State of the Art

This phase is pure content and layout work within the existing codebase. No ecosystem changes relevant.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat 4-card feature grid | Grouped categories with compact inline cards | Phase 28 | Better scanability at 12+ features |
| 2 add-on cards in a 2-col grid | 3 add-on cards in a 3-col grid | Phase 28 | Accurately represents all shipped add-ons |
| MVP-era hero copy ("ring up sales") | Confident Kiwi SaaS tone | Phase 28 | Reflects mature platform v4.0 |
| No NZ callout section | Dedicated full-width callout strip | Phase 28 | Surfaces NZ-specific differentiators prominently |

---

## Open Questions

1. **NZ Callout color: amber or navy?**
   - What we know: D-11 leaves this to Claude's discretion. The hero and CTA are already navy. The callout sits between two light-background sections (Features = `var(--color-bg)`, Pricing = `var(--color-surface)`).
   - What's unclear: Which color creates better visual rhythm.
   - Recommendation: Use navy (`var(--color-navy)`) for the callout — it creates visual rhythm by echoing the hero and CTA sections, and avoids back-to-back amber (the amber pay button is the primary CTA accent). Amber background for a strip risks looking promotional rather than authoritative for a "Built in NZ" trust statement.

2. **Nav anchor links?**
   - What we know: D decision left to Claude's discretion.
   - What's unclear: Page length after rewrite.
   - Recommendation: Add `#features`, `#pricing` anchor links to the nav desktop links — standard SaaS landing page pattern, low effort, helpful for longer pages.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/content changes. No external dependencies, services, or CLI tools required beyond the existing Next.js dev server.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x/3.x + @testing-library/react 16.x |
| Config file | `vitest.config.mts` (project root) |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MKT-01 | Features section renders all capability titles | unit | `npm test -- --reporter=verbose` (visual verification in browser) | ❌ Wave 0 |
| MKT-02 | Each feature card has title, description, icon | unit | visual verification | ❌ Wave 0 |
| MKT-03 | Pricing lists 3 add-ons with correct prices | unit | `npm test -- LandingPricing` | ❌ Wave 0 |
| MKT-04 | Free tier does NOT include Inventory Management | unit | `npm test -- LandingPricing` | ❌ Wave 0 |
| MKT-05 | Each add-on card shows benefit list | unit | visual verification | ❌ Wave 0 |
| MKT-06 | Hero copy does not contain MVP-era phrases | manual | visual review | N/A |
| MKT-07 | CTA copy updated | manual | visual review | N/A |
| MKT-08 | Design tokens used (no hardcoded colors) | manual | grep for hardcoded hex in new code | N/A |
| MKT-09 | No horizontal scroll on mobile | manual | browser dev tools resize | N/A |

**Note on test approach for this phase:** MKT-01 through MKT-05 are content-correctness requirements that are most efficiently verified visually or via simple smoke tests. The project's Vitest configuration covers logic-heavy modules (GST, auth). For this UI-content phase, the primary verification mechanism is a browser review against DESIGN.md rather than automated unit tests. The plan should specify a wave where the implementer opens the page on mobile/tablet/desktop viewports.

### Sampling Rate
- **Per task commit:** `npm test` (existing suite must stay green)
- **Per wave merge:** `npm test` (full suite green)
- **Phase gate:** Full suite green + visual review on mobile/tablet/desktop before `/gsd:verify-work`

### Wave 0 Gaps

The existing test suite covers logic utilities, not marketing components. For this phase, test coverage of the marketing page is not the existing pattern — no marketing component tests exist and none are required by the vitest coverage config. The plan should NOT add component tests for Landing* files unless the user specifically requests this (it's outside the scope of MKT-01 through MKT-09).

- None required — existing test infrastructure is sufficient; marketing component tests are out of scope for this phase

---

## Project Constraints (from CLAUDE.md)

The following directives from `CLAUDE.md` apply to this phase:

| Directive | Impact on Phase 28 |
|-----------|-------------------|
| Always read DESIGN.md before visual/UI decisions | Read. All new components must use navy #1E293B, amber #E67E22, Satoshi display, DM Sans body, 8px base spacing, warm stone bg |
| Tech stack: Next.js App Router + Supabase + Stripe + Tailwind CSS — non-negotiable | No new frameworks or libraries; all work is within existing stack |
| Tailwind v4 — CSS-native config, custom properties | Use `var(--color-*)` and `var(--space-*)` tokens; no hardcoded values |
| Do not use Tailwind v3 config patterns | No `tailwind.config.js` changes; no `theme.extend` patterns |
| No icon libraries | Continue using inline SVG; do not import lucide-react, heroicons, or similar |
| GSD Workflow Enforcement | Use `/gsd:execute-phase` entry point for implementation |

---

## Sources

### Primary (HIGH confidence)

- Source code audit — `src/app/(marketing)/components/*.tsx` — all 6 existing components read in full
- `src/app/page.tsx` — current page composition confirmed
- `DESIGN.md` — full design token system read
- `.planning/phases/28-marketing-landing-page/28-CONTEXT.md` — all decisions read, constraints extracted
- `CLAUDE.md` — project constraints read

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — MKT-01 through MKT-09 verified
- `.planning/STATE.md` — current project state and accumulated decisions confirmed
- `vitest.config.mts` — test infrastructure confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing, no new dependencies
- Architecture: HIGH — existing patterns fully understood from source audit
- Pitfalls: HIGH — identified directly from reading current component code (free tier bug is already present in the codebase)
- Content decisions: HIGH — all locked by CONTEXT.md decisions

**Research date:** 2026-04-06
**Valid until:** N/A — code-only phase, no external dependencies to expire
