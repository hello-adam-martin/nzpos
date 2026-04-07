# Architecture Research

**Domain:** Marketing site integration — v8.1 Marketing Refresh & Compare Page
**Researched:** 2026-04-07
**Confidence:** HIGH (based on direct codebase inspection)

## Standard Architecture

### System Overview

The marketing surface of NZPOS is built with Next.js App Router route groups and Server Components. All marketing pages are statically rendered (`force-static`). No database queries, no auth, no Server Actions on marketing pages.

```
src/app/
├── page.tsx                          ← Root landing page — assembles Landing* components directly
│                                        (NOT inside (marketing) group — no group layout)
│
├── (marketing)/                      ← Route group — provides shared layout for sub-routes
│   ├── add-ons/
│   │   ├── layout.tsx                ← Wraps add-on routes with LandingNav + LandingFooter
│   │   ├── page.tsx                  ← Add-ons catalog index (/add-ons)
│   │   ├── xero/page.tsx             ← Xero detail page — ESTABLISHED PATTERN
│   │   ├── inventory/page.tsx        ← Inventory detail page — ESTABLISHED PATTERN
│   │   ├── gift-cards/page.tsx       ← NEW: Gift Cards detail (/add-ons/gift-cards)
│   │   ├── advanced-reporting/
│   │   │   └── page.tsx              ← NEW: Advanced Reporting detail
│   │   └── loyalty-points/
│   │       └── page.tsx              ← NEW: Loyalty Points detail
│   ├── compare/
│   │   └── page.tsx                  ← NEW: Competitor comparison (/compare)
│   └── components/
│       ├── LandingNav.tsx            ← MODIFY: Add "Compare" nav link
│       ├── LandingHero.tsx           ← No change needed
│       ├── LandingFeatures.tsx       ← No change needed (15 features already there)
│       ├── LandingPricing.tsx        ← MODIFY: Add 3 missing add-ons (5 total)
│       ├── LandingNZCallout.tsx      ← No change needed
│       ├── LandingCTA.tsx            ← No change needed
│       └── LandingFooter.tsx         ← MODIFY: Add "Compare" footer link
│
├── (demo)/                           ← Demo POS route group
├── (store)/                          ← Tenant storefront route group
└── (pos)/                            ← POS route group
```

### Component Responsibilities

| Component | Current Responsibility | Modification Required |
|-----------|----------------------|----------------------|
| `LandingNav` | Sticky nav with Features, Pricing, Add-ons, Sign in, Get started | Add "Compare" link in both desktop and mobile nav |
| `LandingPricing` | Free tier card + 2 add-on cards (Xero, Inventory) | Expand to 5 add-on cards; fix grid layout for odd count |
| `add-ons/page.tsx` | Catalog of 2 add-on cards linking to detail pages | Expand to 5 cards; fix grid for odd count |
| `add-ons/layout.tsx` | Wraps add-on sub-routes with LandingNav + LandingFooter | No change needed |
| `add-ons/xero/page.tsx` | Xero detail — Hero, Before/After, Features, Steps, CTA | No change needed |
| `add-ons/inventory/page.tsx` | Inventory detail — same pattern | No change needed |
| `LandingFooter` | Footer with Sign in, Privacy, Terms links | Add "Compare" link |

## Recommended Project Structure

### New Files to Create

```
src/app/(marketing)/
├── add-ons/
│   ├── gift-cards/
│   │   └── page.tsx              ← Follows xero/inventory pattern exactly
│   ├── advanced-reporting/
│   │   └── page.tsx              ← Follows xero/inventory pattern exactly
│   └── loyalty-points/
│       └── page.tsx              ← Follows xero/inventory pattern exactly
└── compare/
    └── page.tsx                  ← New pattern — feature matrix + NZ narrative
```

### Layout Gap: The /compare Route

The `(marketing)` route group has no shared `layout.tsx`. Only `add-ons/` has a layout. The new `/compare` route is a sibling of `add-ons/`, not a child — so it cannot inherit the `add-ons/layout.tsx`.

**Two options:**

Option A — Create `(marketing)/layout.tsx` (recommended):
```typescript
// src/app/(marketing)/layout.tsx
import LandingNav from './components/LandingNav'
import LandingFooter from './components/LandingFooter'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      <main>{children}</main>
      <LandingFooter />
    </>
  )
}
```
This makes `add-ons/layout.tsx` redundant (can be deleted or kept — nested layouts in Next.js stack, so it would wrap twice if kept). Delete `add-ons/layout.tsx` when creating the group layout.

Option B — Import LandingNav and LandingFooter directly in `compare/page.tsx`:
```typescript
// src/app/(marketing)/compare/page.tsx
import LandingNav from '../components/LandingNav'
import LandingFooter from '../components/LandingFooter'
```
Simpler, avoids touching the `add-ons/layout.tsx`. Correct for a single new page.

**Recommendation: Option B** for this milestone. It adds one page; creating a group layout would require removing `add-ons/layout.tsx` to avoid double-wrapping, which is scope creep. Option A is the right long-term refactor but not required now.

### Files to Modify

```
src/app/(marketing)/components/
├── LandingNav.tsx            ← Add "Compare" nav item (desktop + mobile)
├── LandingPricing.tsx        ← Expand add-on grid from 2 to 5 entries
└── LandingFooter.tsx         ← Add "Compare" footer link

src/app/(marketing)/add-ons/
└── page.tsx                  ← Expand catalog grid from 2 to 5 entries
```

## Architectural Patterns

### Pattern 1: Static Add-On Detail Page (Established)

**What:** Each add-on has a dedicated route with `export const dynamic = 'force-static'`. All content is hardcoded as TypeScript arrays in the page file. No shared data layer, no props. Page sections are: Hero (back link + price CTA) → Before/After comparison → Features grid (2-col) → How it works (3 numbered steps) → CTA.

**When to use:** All 3 new add-on detail pages (Gift Cards, Advanced Reporting, Loyalty Points).

**Trade-offs:** Content is duplicated across files. Correct at this scale (5 add-ons). Would become a smell at 15+ add-ons where a shared schema/CMS would be warranted.

**Exact structure to follow:**
```typescript
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: '[Add-on Name] — NZPOS Add-ons',
  description: '...',
}

const withoutItems: string[] = [...]  // 4 items — pain points without the add-on
const withItems: string[] = [...]     // 4 items — benefits with the add-on
const features = [{ title: string, description: string }]  // 4 features
const steps = [{ number: string, title: string, text: string }]  // 3 steps

export default function [Name]Page() {
  return (
    <>
      {/* Hero — navy bg, back link, h1, tagline, price CTA */}
      {/* Before/After — 2-col grid, left=without (border), right=with (amber border + white bg) */}
      {/* Features — surface bg, 2-col grid */}
      {/* How it works — bg, 3-col numbered steps */}
      {/* CTA — navy bg, centered h2, amber button */}
    </>
  )
}
```

### Pattern 2: Static Comparison Page (New)

**What:** A single route at `/compare` presenting a feature matrix comparing NZPOS against 2-3 NZ competitors. All data is hardcoded TypeScript. No API calls. Pure Server Component.

**When to use:** The `/compare` route only.

**Trade-offs:** Competitor data goes stale. Acceptable — this is a marketing asset. Include a "Prices correct as of [date]" note and links to competitor pricing pages.

**Recommended page sections:**
```
Hero         — "Why NZ retailers choose NZPOS" + CTA
Feature matrix — Table with rows = features, columns = NZPOS / Square / Vend
NZ-specific section — GST, Xero, NZD as differentiators (what global tools miss)
Pricing callout — per-add-on model vs competitors' flat monthly tiers
CTA          — "Get started free"
```

**Data shape:**
```typescript
type ComparisonValue = true | false | 'partial'

interface ComparisonRow {
  category: string
  feature: string
  nzpos: ComparisonValue
  square: ComparisonValue
  vend: ComparisonValue      // Lightspeed Retail NZ
  note?: string              // e.g. "NZ Fair Trading Act 2024 compliant"
}

const rows: ComparisonRow[] = [
  { category: 'Core POS', feature: 'Free to start', nzpos: true, square: false, vend: false },
  { category: 'NZ Compliance', feature: 'GST per-line calculation', nzpos: true, square: 'partial', vend: 'partial', note: 'IRD-compliant rounding' },
  { category: 'NZ Compliance', feature: 'Xero integration', nzpos: true, square: false, vend: true },
  // ...
]
```

**Rendering the matrix:** Use an HTML `<table>` with `role="table"` — not a CSS grid. Screen readers interpret table semantics correctly for comparison grids. Use `<thead>` for competitor names, `<tbody>` for rows, `<th scope="row">` for feature names.

### Pattern 3: In-Page Anchor vs Full Route Navigation

**What:** The `LandingNav` currently uses `href="#features"` and `href="#pricing"` anchor links for the root landing page sections, plus `href="/add-ons"` for the add-ons catalog. These hash anchors only work correctly on the root `/` page — on all other marketing pages (e.g. `/add-ons/xero`, `/compare`) the anchor links produce no-ops.

**When to use the correct pattern:** The new "Compare" link is a full page — use `href="/compare"` (a `<Link>` component), not a hash anchor. Do not add `#compare` as a section on the landing page.

**Trade-offs:** The hash anchor issue is pre-existing technical debt. This milestone should not introduce more hash anchors.

## Data Flow

### Comparison Page Data Flow

```
ComparisonRow[] (hardcoded in compare/page.tsx)
    ↓
<table> rendered as Server Component
    ↓
force-static → Vercel CDN serves from edge cache
    ↓
No client JS required — table is read-only
```

### Add-On Discovery Flow

```
LandingNav "Add-ons" link → /add-ons (catalog)
                                ↓
                     5 add-on cards, each linking to:
                     /add-ons/xero
                     /add-ons/inventory
                     /add-ons/gift-cards         ← NEW
                     /add-ons/advanced-reporting  ← NEW
                     /add-ons/loyalty-points      ← NEW
                                ↓
                     "Back to add-ons" ← Back link on each detail page
```

### Landing Page Pricing Flow

```
LandingPricing.tsx (hardcoded data)
    ↓
Free tier card (max-w-lg, centered)
    ↓
5 add-on cards in grid
    Each card links to /add-ons/[slug]
```

## Integration Points

### Modified Components — What Breaks If Done Wrong

| Component | Change | Risk if Wrong |
|-----------|--------|---------------|
| `LandingNav` | Add "Compare" link | Adding to desktop nav but forgetting mobile nav = broken mobile UX. Both the `md:flex` desktop nav and the `<details>` mobile overlay must be updated. |
| `LandingPricing` | 2 → 5 add-on cards | Current grid is `md:grid-cols-2 max-w-3xl`. With 5 cards, keeping 2-col gives an orphaned single card on the last row. Consider `md:grid-cols-3` or `md:grid-cols-2 lg:grid-cols-3`, or accept the asymmetry as intentional. |
| `add-ons/page.tsx` | 2 → 5 add-on cards | Same grid issue as LandingPricing. Currently `md:grid-cols-2 max-w-3xl`. |
| `LandingFooter` | Add "Compare" link | Footer uses `|` separators between links. Add the separator pattern consistently. |

### New Routes and Their Layout Sources

| Route | File | Layout Source |
|-------|------|---------------|
| `/compare` | `(marketing)/compare/page.tsx` | Import `LandingNav` + `LandingFooter` directly in the page (Option B above) |
| `/add-ons/gift-cards` | `(marketing)/add-ons/gift-cards/page.tsx` | Inherited from `add-ons/layout.tsx` |
| `/add-ons/advanced-reporting` | `(marketing)/add-ons/advanced-reporting/page.tsx` | Inherited from `add-ons/layout.tsx` |
| `/add-ons/loyalty-points` | `(marketing)/add-ons/loyalty-points/page.tsx` | Inherited from `add-ons/layout.tsx` |

### Slug Consistency — Critical

The route directory name must match the `href` used in `add-ons/page.tsx` and `LandingPricing.tsx`. Mismatches produce 404s.

| Add-on | Route dir name | href in catalog/pricing |
|--------|---------------|-------------------------|
| Gift Cards | `gift-cards` | `/add-ons/gift-cards` |
| Advanced Reporting | `advanced-reporting` | `/add-ons/advanced-reporting` |
| Loyalty Points | `loyalty-points` | `/add-ons/loyalty-points` |

## Build Order Recommendation

Dependencies drive the order:

```
STEP 1 — New add-on detail pages (independent of each other, no blockers)
  src/app/(marketing)/add-ons/gift-cards/page.tsx
  src/app/(marketing)/add-ons/advanced-reporting/page.tsx
  src/app/(marketing)/add-ons/loyalty-points/page.tsx

STEP 2 — New comparison page (independent, only needs Nav + Footer imports)
  src/app/(marketing)/compare/page.tsx

STEP 3 — Update add-on catalog (depends on knowing all 5 slugs exist)
  src/app/(marketing)/add-ons/page.tsx  ← add 3 new cards

STEP 4 — Update pricing section (depends on knowing all 5 slugs and prices)
  src/app/(marketing)/components/LandingPricing.tsx

STEP 5 — Update nav and footer last (affects all marketing pages — highest blast radius)
  src/app/(marketing)/components/LandingNav.tsx
  src/app/(marketing)/components/LandingFooter.tsx
```

**Rationale:** The 3 new add-on detail pages and the compare page are fully independent — build these first so they can be verified in isolation before touching shared components. Nav and footer changes affect every marketing page, so they go last when everything else is verified.

## Anti-Patterns

### Anti-Pattern 1: Shared add-on data file

**What people do:** Extract add-on metadata (name, price, description, href) into `src/data/addons.ts` shared between the catalog, pricing, and detail pages.

**Why it's wrong:** Detail pages have richer content (before/after lists, feature breakdowns, steps) that doesn't fit a catalog-level schema. Forcing a shared structure means the data file becomes bloated or the detail pages stop using it for their unique sections. The existing pattern — each page owns its content — is correct at this scale.

**Do this instead:** Keep content hardcoded per page. Only create a shared data file if the same data appears verbatim in 3+ places and changes frequently.

### Anti-Pattern 2: Interactive comparison table

**What people do:** Add filter/sort controls to the comparison table for perceived polish.

**Why it's wrong:** The comparison page is a marketing page — its job is to persuade, not enable data exploration. Interactivity adds client JS bundle weight and complexity for zero measurable conversion benefit. The table has ~15-20 rows; visitors can scan it in under a minute without filters.

**Do this instead:** Static Server Component. All rows visible by default. Group rows by category with visible section headers for scannability.

### Anti-Pattern 3: Hash anchor for Compare in the nav

**What people do:** Add `href="#compare"` to embed a comparison section directly on the landing page instead of creating a new route.

**Why it's wrong:** The comparison content is substantial (full feature matrix). It would bloat the already-long landing page. A dedicated `/compare` URL is indexable by search engines, shareable, and linkable from ads and content marketing.

**Do this instead:** Use `href="/compare"` — a proper Next.js `<Link>` to a dedicated page with its own `<Metadata>` for SEO.

### Anti-Pattern 4: Fetching live competitor pricing

**What people do:** Attempt to fetch Square or Lightspeed pricing dynamically to keep comparison data current.

**Why it's wrong:** Competitor pricing pages block scraping. Even if it worked, stale cached fetches are harder to detect than static data with an explicit date. Misrepresenting competitor pricing has legal risk.

**Do this instead:** Static hardcoded data with a "Correct as of [Month Year]" note and links to each competitor's pricing page so readers can verify. Update the static data manually when doing future marketing refreshes.

### Anti-Pattern 5: Building `(marketing)/layout.tsx` this milestone

**What people do:** Refactor the route group to add a shared layout, removing `add-ons/layout.tsx`.

**Why it's wrong:** It is the right long-term decision but adds scope beyond the v8.1 goal. Creating the group layout requires deleting `add-ons/layout.tsx` to prevent double-wrapping — a change that touches existing working pages. One extra `import` in `compare/page.tsx` is the safer path for this milestone.

**Do this instead:** Import `LandingNav` and `LandingFooter` directly in `compare/page.tsx`. Flag the group layout refactor for a future maintenance phase.

## Scaling Considerations

The marketing pages are fully static. All `force-static` pages are served from Vercel's edge CDN. There is no scaling concern for the marketing surface regardless of traffic volume.

The only "scale" concern is content maintenance as the add-on catalog grows. At 5 add-ons, the current pattern is correct. At 10+ add-ons, a CMS integration (Contentlayer, or even a simple `src/data/addons/` directory of JSON/MDX files) would reduce developer burden for content updates.

## Sources

- Direct codebase inspection (HIGH confidence, 2026-04-07):
  - `src/app/page.tsx` — root landing assembly
  - `src/app/(marketing)/add-ons/layout.tsx` — layout pattern
  - `src/app/(marketing)/add-ons/page.tsx` — catalog pattern
  - `src/app/(marketing)/add-ons/xero/page.tsx` — established detail page pattern
  - `src/app/(marketing)/add-ons/inventory/page.tsx` — established detail page pattern
  - `src/app/(marketing)/components/LandingNav.tsx` — nav structure (desktop + mobile)
  - `src/app/(marketing)/components/LandingPricing.tsx` — pricing section with 2 add-on cards
  - `src/app/(marketing)/components/LandingFooter.tsx` — footer link pattern
- Project context: `.planning/PROJECT.md` — v8.1 milestone scope confirmed

---
*Architecture research for: NZPOS v8.1 Marketing Refresh & Compare Page*
*Researched: 2026-04-07*
