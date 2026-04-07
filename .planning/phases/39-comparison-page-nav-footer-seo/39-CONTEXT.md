# Phase 39: Comparison Page + Nav/Footer/SEO - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Visitors can evaluate NZPOS against NZ POS competitors through a compliant comparison page at `/compare` with feature matrix, editorial sections, and FAQ. Navigation and footer updated site-wide to include the comparison page and all 5 add-on detail pages. SEO meta tags and JSON-LD structured data added to the comparison page and all 5 add-on detail pages.

</domain>

<decisions>
## Implementation Decisions

### Feature Matrix Layout
- **D-01:** Sticky-column table with NZPOS pinned left, competitors scrollable right. Feature rows grouped by category (POS, Online Store, Compliance, etc). 10-15 key features focused on differentiators.
- **D-02:** Horizontal scroll on mobile with NZPOS column sticky. Consistent responsive pattern for any number of competitors.
- **D-03:** NZPOS features that correspond to add-ons link to their `/add-ons/*` detail pages from within the matrix.

### Competitor Data
- **D-04:** Claude selects 3-5 relevant NZ POS competitors based on market research. Text-only names (no logos — per REQUIREMENTS.md out-of-scope).
- **D-05:** Comparison data stored in a single TypeScript data file (e.g., `src/data/comparison.ts`) with typed arrays for competitors, features, and categories. No CMS.
- **D-06:** Global pricing disclaimer at top of the matrix: "Competitor pricing verified as of [date]. Visit their websites for current pricing." Per-competitor cell dates not needed. Satisfies COMP-02 Fair Trading Act compliance.

### Editorial Sections
- **D-07:** "Why NZPOS" editorial section — Claude's Discretion on format (paragraphs with subheadings vs bullet highlights). Should complement the comparison matrix and match confident Kiwi SaaS tone (Phase 28 D-07).
- **D-08:** FAQ section uses native HTML `<details>`/`<summary>` elements — no-JS accordion, consistent with LandingNav.tsx mobile menu pattern. Accessible by default.
- **D-09:** 5-8 comparison-focused FAQ items (pricing comparison, suitability, EFTPOS, NZ compliance, etc). Not a general product FAQ.

### CTA Placement
- **D-10:** Two CTA sections on the comparison page: one after the feature matrix, one at the bottom after FAQ. Links to signup and/or POS demo. Not pushy — two well-placed conversion points.

### Navigation Updates
- **D-11:** "Compare" added as a top-level nav item in both desktop and mobile nav (LandingNav.tsx). Placed between "Add-ons" and "Sign in".

### Footer Restructure
- **D-12:** Footer restructured from single-row links into grouped columns: "Product" (Features, Pricing, Compare), "Add-ons" (Xero, Inventory, Gift Cards, Advanced Reporting, Loyalty Points), "Account" (Sign in, Sign up). Replaces current minimal footer. Privacy/Terms links retained.

### SEO & Structured Data
- **D-13:** SoftwareApplication JSON-LD schema on the comparison page and all 5 add-on detail pages (including the 3 created in Phase 38 that lack SEO).
- **D-14:** Title, description, and Open Graph meta tags on the comparison page and all 5 add-on detail pages. Retrofit existing Phase 38 pages that only have basic metadata.

### Claude's Discretion
- Cell representation style in the matrix (checkmarks/crosses, tiered indicators, or hybrid)
- Competitor selection (3-5 NZ POS competitors based on research)
- "Why NZPOS" editorial format and exact copy
- FAQ exact questions and answers
- CTA copy (should match confident Kiwi SaaS tone)
- Feature row selection and category grouping (10-15 features)
- Footer column exact grouping and link ordering
- JSON-LD field values and OG image strategy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Colors (navy #1E293B, amber #E67E22), typography (Satoshi display, DM Sans body), spacing (8px base), border radius, motion. All new elements must comply.

### Navigation & Footer (modification targets)
- `src/app/(marketing)/components/LandingNav.tsx` — Sticky nav with desktop links + mobile details/summary hamburger. Add "Compare" link to both desktop and mobile sections.
- `src/app/(marketing)/components/LandingFooter.tsx` — Current minimal footer with single-row links. Restructure into multi-column layout.

### Add-On Detail Pages (SEO retrofit targets)
- `src/app/(marketing)/add-ons/xero/page.tsx` — Canonical template for add-on pages. Already has basic Metadata export. Add JSON-LD.
- `src/app/(marketing)/add-ons/inventory/page.tsx` — Second reference implementation.
- `src/app/(marketing)/add-ons/gift-cards/page.tsx` — Phase 38 page, needs JSON-LD + OG meta.
- `src/app/(marketing)/add-ons/advanced-reporting/page.tsx` — Phase 38 page, needs JSON-LD + OG meta.
- `src/app/(marketing)/add-ons/loyalty-points/page.tsx` — Phase 38 page, needs JSON-LD + OG meta.

### Marketing Landing Components (nav/footer shared)
- `src/app/(marketing)/components/LandingHero.tsx` — Hero section (no changes needed)
- `src/app/(marketing)/components/LandingPricing.tsx` — Pricing section (no changes needed)
- `src/app/(marketing)/components/LandingFeatures.tsx` — Features section (no changes needed)
- `src/app/(marketing)/components/LandingCTA.tsx` — CTA section (no changes needed)
- `src/app/(marketing)/components/LandingNZCallout.tsx` — NZ callout strip (no changes needed)

### Add-Ons Catalog
- `src/app/(marketing)/add-ons/page.tsx` — Hub page listing all add-ons (no changes needed, already updated in Phase 38)
- `src/app/(marketing)/add-ons/layout.tsx` — Shared layout for add-on detail pages

### Requirements
- `.planning/REQUIREMENTS.md` — COMP-01 through COMP-05, NAV-01 through NAV-04 define acceptance criteria for this phase

### Prior Phase Context
- `.planning/phases/28-marketing-landing-page/28-CONTEXT.md` — Kiwi SaaS tone decision (D-07), page structure decisions
- `.planning/phases/38-add-on-detail-pages-landing-page-refresh/38-CONTEXT.md` — NZ compliance callout patterns (D-10/D-11/D-12), add-on pricing, 3+2 grid layout

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LandingNav.tsx` — `<details>`/`<summary>` pattern for no-JS mobile toggle. Same pattern reusable for FAQ accordion.
- Xero detail page (`add-ons/xero/page.tsx`) — Canonical page structure with Metadata export, TypeScript data arrays, and section components.
- CSS custom properties (`--color-navy`, `--color-amber`, `--space-*`) — Design tokens used consistently across all marketing components.

### Established Patterns
- Server Components with `export const dynamic = 'force-static'` for all marketing pages
- Next.js `Metadata` export for SEO (title + description) — already on Xero and Inventory pages
- Inline SVG icons in feature components
- `max-w-[1200px] mx-auto` container pattern on all marketing sections
- `font-display` for headings, `font-sans` for body text

### Integration Points
- New `/compare` route under `(marketing)` route group
- LandingNav.tsx — add "Compare" link (desktop nav line 18-20, mobile overlay line 57-60)
- LandingFooter.tsx — complete restructure from simple flexbox to multi-column grid

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-comparison-page-nav-footer-seo*
*Context gathered: 2026-04-07*
