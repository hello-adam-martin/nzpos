# Phase 38: Add-On Detail Pages + Landing Page Refresh - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Three new add-on detail pages (Gift Cards, Advanced Reporting, Loyalty Points) at `/add-ons/gift-cards`, `/add-ons/advanced-reporting`, and `/add-ons/loyalty-points`. Landing page updated to showcase all 5 paid add-ons in hero, features, and pricing sections. Add-ons catalog page updated to show all 5 add-ons. No backend changes — marketing pages only.

</domain>

<decisions>
## Implementation Decisions

### Detail Page Structure (MKTG-01, MKTG-02, MKTG-03)
- **D-01:** All 3 new detail pages follow the exact same section structure as the Xero page: hero (back link + price CTA) → before/after comparison → feature grid (2-col) → how-it-works (3 numbered steps) → CTA. Consistent experience across all add-on pages.
- **D-02:** Before/after sections focus on pain points (what's hard without the add-on vs what's easy with it), not competitor comparisons. Matches the Xero page pattern.
- **D-03:** Feature grid count is flexible: 3-6 features per add-on depending on what's worth highlighting. Not locked to exactly 4.
- **D-04:** Claude writes all copy following the established Kiwi SaaS tone (Phase 28 D-07). No pre-approval needed — copy will be visible in code for adjustment.

### Pricing Grid Layout (MKTG-04)
- **D-05:** 5 add-on cards use a 3+2 grid layout: top row 3 cards (`md:grid-cols-3`), bottom row 2 cards centered. No orphan card problem.
- **D-06:** Card design stays identical to current: name, price, 3 bullet points, "Learn more →" link. No icons in pricing section cards.

### Add-Ons Catalog Page (MKTG-06)
- **D-07:** Catalog page (`/add-ons`) uses the same 3+2 grid layout as the pricing section for consistency. Expands from 2 to 5 cards.

### Landing Page Copy (MKTG-05)
- **D-08:** Hero section references add-on count ("5 optional add-ons" or similar), not individual add-on names. Keep hero clean.
- **D-09:** LandingFeatures adds 3 new feature cards (Gift Cards, Advanced Reporting, Loyalty Points) matching existing card style. Total grows to ~18 features.

### NZ Compliance Callouts
- **D-10:** NZ compliance is a prominent selling point on relevant detail pages, not a footnote. Gift Cards: NZ Fair Trading Act 2024 (3-year minimum expiry). Loyalty Points: NZ Privacy Amendment Act 2025 (IPP 3A consent). Advanced Reporting: COGS/margin tracking for NZ businesses.
- **D-11:** Use specific act names and years ("NZ Fair Trading Act 2024", "Privacy Amendment Act 2025") — signals credibility and expertise to NZ business owners.
- **D-12:** Compliance callout rendered as a distinct visual element — bordered box with navy background or amber accent, similar to the NZ callout on the landing page. Stands out as a trust signal.

### Claude's Discretion
- Exact copy for all detail page sections (hero headlines, before/after items, feature descriptions, how-it-works steps, CTA copy)
- Number of features per add-on (3-6 range)
- Whether compliance callout uses a shield/checkmark icon or just typography
- Spacing and visual weight of compliance callout box
- Exact wording of hero add-on count reference
- Order of add-ons in the pricing grid (which 3 go on top row)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Add-On Detail Pages (canonical template)
- `src/app/(marketing)/add-ons/xero/page.tsx` — Canonical template for all add-on detail pages. Copy section structure exactly: hero, before/after, features, how-it-works, CTA
- `src/app/(marketing)/add-ons/inventory/page.tsx` — Second reference implementation

### Landing Page Components (modification targets)
- `src/app/(marketing)/components/LandingPricing.tsx` — Expand from 2 to 5 add-on cards with 3+2 grid
- `src/app/(marketing)/components/LandingFeatures.tsx` — Add 3 new feature cards for new add-ons
- `src/app/(marketing)/components/LandingHero.tsx` — Update copy to reference 5 add-ons

### Add-Ons Catalog
- `src/app/(marketing)/add-ons/page.tsx` — Expand from 2 to 5 add-on cards with 3+2 grid layout
- `src/app/(marketing)/add-ons/layout.tsx` — Shared layout inherited by all add-on detail pages

### Design System
- `DESIGN.md` — Colors (navy #1E293B, amber #E67E22), typography (Satoshi display, DM Sans body), spacing (8px base). All new elements must comply.

### Research
- `.planning/research/SUMMARY.md` — Architecture approach, build order, pitfalls. Especially: design token requirement (no raw Tailwind colors), FTA compliance, SEO considerations

### Add-On Pricing (locked)
- Xero: $9/mo NZD
- Inventory Management: $9/mo NZD
- Gift Cards: $14/mo NZD
- Advanced Reporting: $9/mo NZD
- Loyalty Points: $15/mo NZD

### NZ Compliance References
- NZ Fair Trading Act 2024 — 3-year minimum gift card expiry (Gift Cards add-on)
- NZ Privacy Amendment Act 2025, IPP 3A — Loyalty consent requirements (Loyalty Points add-on)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `add-ons/xero/page.tsx` — Full detail page template with all sections (hero, before/after, features, how-it-works, CTA). Copy this structure for all 3 new pages.
- `LandingPricing.tsx` — Add-on card component pattern with name, price, bullets, "Learn more" link
- `add-ons/page.tsx` — Catalog card pattern with icon, name, price, description, "Learn more" link
- `LandingNZCallout.tsx` — NZ trust callout component — reference for compliance callout box styling

### Established Patterns
- All marketing pages use `export const dynamic = 'force-static'` — new pages must do the same
- CSS custom property tokens from `globals.css` (`var(--color-navy)`, `var(--color-amber)`, etc.) — never use raw Tailwind color utilities
- `max-w-[1200px] mx-auto` container pattern with responsive padding
- Font classes: `font-display` for headings, `font-sans` for body text

### Integration Points
- New detail pages auto-inherit `add-ons/layout.tsx` via file system routing
- Pricing section and catalog page link to detail pages via `/add-ons/{slug}` — slugs must be: `gift-cards`, `advanced-reporting`, `loyalty-points`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following the established Xero page pattern.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-add-on-detail-pages-landing-page-refresh*
*Context gathered: 2026-04-07*
