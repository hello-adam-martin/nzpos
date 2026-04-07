# Phase 39: Comparison Page + Nav/Footer/SEO - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 39-comparison-page-nav-footer-seo
**Areas discussed:** Feature matrix layout, Competitor selection & data, Editorial sections, Nav/footer/SEO updates

---

## Feature Matrix Layout

### Matrix Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky-column table | Traditional comparison table with NZPOS pinned left, competitors scrollable right. Feature rows grouped by category. Checkmarks/crosses for boolean features, text for pricing. | ✓ |
| Card-per-competitor | Each competitor gets a vertical card showing their features, pricing, and gaps. NZPOS card highlighted. | |
| Category sections | Break comparison into sections each with mini-tables. | |

**User's choice:** Sticky-column table
**Notes:** None

### Mobile Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal scroll (Recommended) | Table scrolls horizontally with NZPOS column sticky. Common pattern for comparison pages. | ✓ |
| Stacked cards | Each competitor becomes a separate card/accordion on mobile. | |
| You decide | Claude picks best mobile approach. | |

**User's choice:** Horizontal scroll
**Notes:** None

### Cell Representation

| Option | Description | Selected |
|--------|-------------|----------|
| Checkmarks + pricing text | Boolean features use green checkmark / red cross. Pricing rows show dollar amounts. | |
| Tiered indicators | Full circle (included), half circle (limited), empty circle (not available). | |
| You decide | Claude picks the clearest representation for the feature types. | ✓ |

**User's choice:** You decide
**Notes:** Claude's discretion on cell representation style.

### Feature Depth

| Option | Description | Selected |
|--------|-------------|----------|
| 10-15 key features (Recommended) | Focused on differentiators. Comprehensive without overwhelming. | ✓ |
| 20+ exhaustive list | Every feature across all competitors. | |
| 6-8 highlights only | Just the biggest differentiators. | |

**User's choice:** 10-15 key features
**Notes:** None

---

## Competitor Selection & Data

### Competitor Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Lightspeed, Vend, Square, Shopify POS | 4 major NZ POS players. | |
| Lightspeed, Vend, Square | Top 3 only. | |
| You decide | Claude researches NZ POS landscape and picks 3-5. | ✓ |

**User's choice:** You decide
**Notes:** Claude selects based on market research.

### Pricing Display (Fair Trading Act)

| Option | Description | Selected |
|--------|-------------|----------|
| Price + verified date per cell | Each competitor pricing cell shows amount + small verified date. | |
| Global disclaimer at top | One disclaimer above the matrix for legal coverage. | ✓ |
| Both — global + per-cell | Belt and suspenders approach. | |

**User's choice:** Global disclaimer at top
**Notes:** None

### Data Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single TypeScript data file (Recommended) | One file with typed arrays for competitors, features, categories. | ✓ |
| Inline in page component | Data defined directly in comparison page component. | |
| You decide | Claude picks based on data complexity. | |

**User's choice:** Single TypeScript data file
**Notes:** None

### Feature Linking

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — link add-on features to detail pages | Features like Gift Cards link to their /add-ons/* detail pages. | ✓ |
| No links — pure comparison | Matrix stays clean, CTAs handle navigation. | |
| You decide | Claude decides based on layout. | |

**User's choice:** Yes — link add-on features to detail pages
**Notes:** None

---

## Editorial Sections

### Why NZPOS Format

| Option | Description | Selected |
|--------|-------------|----------|
| 3-4 short paragraphs with subheadings | Each paragraph covers a differentiator. Scannable. | |
| Bullet-point highlights | Quick-hit list of 5-7 differentiators. | |
| You decide | Claude writes in whatever format complements the matrix. | ✓ |

**User's choice:** You decide
**Notes:** Claude's discretion, must match confident Kiwi SaaS tone.

### FAQ Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Native HTML details/summary (Recommended) | No-JS accordion, consistent with LandingNav.tsx pattern. | ✓ |
| Client component accordion | React state-driven with smooth transitions. | |
| You decide | Claude picks simplest consistent approach. | |

**User's choice:** Native HTML details/summary
**Notes:** None

### FAQ Scope

| Option | Description | Selected |
|--------|-------------|----------|
| 5-8 comparison-focused questions (Recommended) | Questions about pricing comparison, suitability, EFTPOS, compliance. | ✓ |
| 10+ comprehensive FAQ | Broader covering product, pricing, setup, compliance. | |
| You decide | Claude picks right number and scope. | |

**User's choice:** 5-8 comparison-focused questions
**Notes:** None

### CTA Placement

| Option | Description | Selected |
|--------|-------------|----------|
| After matrix + after FAQ (Recommended) | Two CTA sections. Clean, not pushy. | ✓ |
| After each major section | Three CTAs total. More conversion but may feel aggressive. | |
| You decide | Claude places CTAs naturally. | |

**User's choice:** After matrix + after FAQ
**Notes:** None

---

## Nav/Footer/SEO Updates

### Nav Link Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level nav item (Recommended) | "Compare" between "Add-ons" and "Sign in" in desktop and mobile. | ✓ |
| Under Add-ons as submenu | Nested under Add-ons dropdown. Lower visibility. | |
| You decide | Claude decides based on nav hierarchy. | |

**User's choice:** Top-level nav item
**Notes:** None

### Footer Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped footer columns | Restructure into columns: Product, Add-ons, Account. | ✓ |
| Single row with more links | Keep current layout, add more links. | |
| You decide | Claude restructures to handle 8+ links cleanly. | |

**User's choice:** Grouped footer columns
**Notes:** None

### JSON-LD Approach

| Option | Description | Selected |
|--------|-------------|----------|
| SoftwareApplication on compare + detail pages (Recommended) | Each page gets SoftwareApplication schema with name, category, offers. | ✓ |
| You decide | Claude implements based on schema.org best practices. | |
| Minimal — just meta tags | Skip JSON-LD, focus on title/description/OG only. | |

**User's choice:** SoftwareApplication on compare + detail pages
**Notes:** None

### Retrofit Existing Pages

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — retrofit all pages (Recommended) | Add meta + JSON-LD to all 5 add-on detail pages + compare page. | ✓ |
| Compare page only | Only add SEO to the new compare page. | |

**User's choice:** Yes — retrofit all pages
**Notes:** Includes 3 Phase 38 pages (Gift Cards, Advanced Reporting, Loyalty Points) plus existing Xero and Inventory pages.

---

## Claude's Discretion

- Cell representation style in the matrix
- Competitor selection (3-5 NZ POS competitors)
- "Why NZPOS" editorial format and copy
- FAQ questions and answers
- CTA copy
- Feature row selection and category grouping
- Footer column grouping and link ordering
- JSON-LD field values and OG image strategy

## Deferred Ideas

None — discussion stayed within phase scope
