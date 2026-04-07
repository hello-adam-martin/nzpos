# Project Research Summary

**Project:** NZPOS — v8.1 Marketing Site Refresh & Competitor Comparison Page
**Domain:** SaaS marketing pages — add-on detail pages + NZ POS competitor comparison
**Researched:** 2026-04-07
**Confidence:** HIGH (architecture from direct codebase inspection; features and pitfalls from verified NZ sources)

---

## Executive Summary

NZPOS v8.1 is a marketing-only milestone. No new product features are being built. The goal is to bring the marketing site up to parity with the product: three new add-on detail pages (Gift Cards, Advanced Reporting, Loyalty Points), an updated pricing section showing all 5 paid add-ons, and a new competitor comparison page targeting NZ retail POS buyers. All pages are statically rendered Server Components. No database, auth, or Server Actions are involved. The work is low-risk from a technical standpoint but carries a specific NZ legal risk: misleading competitor claims breach the Fair Trading Act 1986, with penalties increasing to $5M under pending 2026 legislation. This risk must be addressed before the comparison page ships.

The recommended approach is to build in dependency order: three new add-on detail pages first (following the established Xero/Inventory pattern exactly), then the comparison page (new pattern, hardcoded TypeScript data, HTML table rendered as a Server Component), then the shared component updates (pricing section, add-on catalog, nav, footer). This order isolates blast radius — new page files are fully independent, while nav and footer changes affect every marketing page and should be verified last. The existing design system (navy/amber CSS custom properties in globals.css) must be used throughout; new pages must not introduce hardcoded Tailwind colour utilities.

The single most important decision before building the comparison page is to centralise all competitor data in a single `src/data/competitors.ts` file with source URLs and last-verified dates documented as comments. This protects against stale data, FTA liability, and maintenance pain. The single most important content decision is to include 400-600 words of original NZ-specific editorial around the feature matrix — a table alone will be penalised by Google's December 2025 thin content filters and will fail to persuade decision-stage buyers.

---

## Key Findings

### Recommended Stack

The stack is fully established and does not change for this milestone. See STACK.md for full details.

**Core technologies relevant to this milestone:**
- **Next.js 16.2 App Router**: All marketing pages use `export const dynamic = 'force-static'` and are served from Vercel's edge CDN. Server Components only — no client JS on marketing pages.
- **Tailwind CSS v4.2**: CSS-native config via `globals.css` `@theme` block. New pages must use CSS custom property tokens (`bg-[var(--color-navy)]`), not raw Tailwind colour utilities (`bg-slate-900`). New pages built from Tailwind UI examples risk brand drift if class naming is not converted to design tokens.
- **TypeScript**: All comparison data typed as `ComparisonRow[]` with explicit `true | false | 'partial'` value type — ensures the table is extensible and type-safe.

No new dependencies are required for this milestone. It is purely content, routing, and component work within the existing stack.

### Expected Features

**Must have (table stakes for v8.1):**
- Updated pricing section showing all 5 paid add-ons (Xero $9, Inventory $9, Gift Cards $14, Advanced Reporting $9, Loyalty Points $15) — current section shows only 2
- Gift Cards add-on detail page at `/add-ons/gift-cards` — includes NZ Fair Trading Act 2024 compliance callout
- Advanced Reporting add-on detail page at `/add-ons/advanced-reporting` — COGS, margin%, profit reports explained
- Loyalty Points add-on detail page at `/add-ons/loyalty-points` — includes NZ Privacy Act 2025 consent disclosure
- Competitor comparison page at `/compare` — feature matrix (8-10 rows, 4 competitors: Lightspeed, Shopify, Square, Hike), editorial sections, FAQ, dual CTA
- "Compare" nav link added to LandingNav (desktop + mobile) and LandingFooter

**Should have (differentiators in comparison content):**
- Per-add-on pricing model as primary positioning angle ("$9/mo for Xero vs $149/mo for a Lightspeed Core plan")
- Square's NZ card processing limitation stated as a factual disqualifier (confirmed via Square community forums)
- NZ Fair Trading Act 2024 gift card expiry compliance as an explicit differentiator (Square does not auto-enforce 3-year minimum)
- NZ Privacy Act 2025 loyalty consent as an explicit differentiator (competitors not documented to comply)
- Xero connector cost comparison: NZPOS native $9/mo vs Shopify's NZ$20/mo CarryTheOne third-party connector
- "Who should choose each competitor" section — builds credibility by acknowledging where competitors genuinely win (Lightspeed: offline mode + multi-location; Hike: offline mode; Shopify: eCommerce-first)
- Bias disclosure above the fold and "last reviewed [date]" footnote on the comparison page

**Defer to v2+:**
- Individual "vs" pages per competitor (`/compare/nzpos-vs-lightspeed`, etc.) — high-intent SEO value, build after the unified page validates conversion
- Interactive pricing calculator — medium complexity React component, defer until pricing section validates
- Customer case study pages — blocked on real merchant data

### Architecture Approach

The entire marketing surface is statically generated Next.js App Router pages. Three new routes follow the established add-on detail pattern exactly: hero (back link + price CTA) → before/after comparison → feature grid (2-col) → how it works (3 numbered steps) → CTA. Match `add-ons/xero/page.tsx` structure exactly — every section, class pattern, and data shape.

The comparison page is a new pattern. The key architectural decision: import `LandingNav` and `LandingFooter` directly in `compare/page.tsx` rather than creating a `(marketing)/layout.tsx`. Creating a group layout is the right long-term refactor but is out of scope — it would require deleting `add-ons/layout.tsx` to avoid double-wrapping. The comparison table renders as a static HTML `<table>` with `role="table"`, `<thead>`, `<th scope="row">` semantics — not a CSS grid, not a client component.

**Major components and their modifications:**
1. `LandingNav.tsx` — add "Compare" link to both desktop `md:flex` nav AND mobile `<details>` overlay (forgetting mobile is the most common mistake)
2. `LandingPricing.tsx` — expand from 2 to 5 add-on cards; current `md:grid-cols-2 max-w-3xl` layout produces a single-card orphan at 5 items; consider `md:grid-cols-3`
3. `add-ons/page.tsx` — expand catalog from 2 to 5 cards; same grid fix (apply the same grid class as LandingPricing for visual consistency)
4. `LandingFooter.tsx` — add "Compare" link following existing `|` separator pattern
5. Three new add-on page files — inherit `add-ons/layout.tsx` automatically; follow Xero page exactly
6. `compare/page.tsx` — direct LandingNav + LandingFooter imports; `src/data/competitors.ts` as data source

**Build order (dependencies drive this):**
1. New add-on detail pages — independent of each other, no blockers
2. Comparison page — independent, only needs nav/footer imports
3. Add-on catalog update — depends on all 5 slugs existing
4. Pricing section update — depends on knowing all 5 slugs and prices
5. Nav and footer — highest blast radius, update last after everything else is verified

### Critical Pitfalls

1. **Misleading competitor claims breach the NZ Fair Trading Act** — Source every claim from the competitor's own current documentation with URL and date. Use "as at [month year]" disclosure. Never claim a competitor "doesn't have X" without direct confirmation from their docs. FTA penalties increasing to $5M under pending 2026 legislation — this is not hypothetical.

2. **Competitor pricing data stales immediately after publish** — Store all comparison data in a single `src/data/competitors.ts` with source URLs as comments. Use "from $X/month" fuzzy language rather than exact prices. Display a visible "Last reviewed: [Month Year]" date on the page. Schedule 90-day review.

3. **Thin content SEO penalty from Google's December 2025 core update** — A table-only comparison page will rank poorly. Requires 400-600 words of original NZ-specific editorial: "Why we built NZPOS", GST compliance explanation, NZ gift card law analysis, "who should choose each competitor" section, FAQ accordion (4-6 questions).

4. **Design system drift on new pages** — All new pages must use CSS custom property tokens from `globals.css`. Never use `bg-slate-900`, `text-gray-600`, or other raw Tailwind colour utilities on marketing pages. Use `add-ons/xero/page.tsx` as the canonical template.

5. **Missing add-on detail pages break the conversion funnel** — Pricing section and add-on catalog must not link to a route that returns 404. Build all three add-on detail pages before updating catalog and pricing links. Verify with a build-time route check.

6. **Competitor trademark risk** — Use competitor names as plain text, not stylised logos or branded assets. Add trademark attribution ("All trademarks are the property of their respective owners") and affiliation disclaimer. Decide on text-not-logos before any design work — this is an architecture decision.

7. **SEO keyword cannibalisation** — Landing page owns top-of-funnel terms ("NZ POS system", "point of sale NZ"). Comparison page must target mid-funnel evaluation queries ("NZPOS vs Square", "Lightspeed alternative NZ"). Distinct title tag, H1, and meta description. Internal link from landing page to comparison page passes authority without cannibalising.

---

## Implications for Roadmap

Based on research, the work decomposes cleanly into two phases. Both phases deliver independently shippable, user-visible value.

### Phase 1: Add-On Detail Pages + Pricing Section

**Rationale:** The three add-on detail pages are fully independent of each other and of everything else. The pricing section and catalog updates depend on detail page slugs resolving without 404 — so detail pages must come first. Shipping this phase unblocks the comparison page (which references NZPOS pricing and links into each add-on detail page as evidence). This phase also fixes the most immediately broken part of the product-marketing gap: five add-ons exist in the product, three have no marketing presence.

**Delivers:**
- `/add-ons/gift-cards` — NZ Fair Trading Act 2024 compliance callout, 3-year expiry explanation
- `/add-ons/advanced-reporting` — COGS and margin% reports explained for merchant decision-stage buyers
- `/add-ons/loyalty-points` — NZ Privacy Act 2025 consent disclosure, earn/redeem mechanics explained
- Updated `LandingPricing.tsx` with all 5 add-on cards (grid layout fix for 5 items)
- Updated `add-ons/page.tsx` catalog with all 5 add-on cards (same grid fix)

**Features from FEATURES.md:** All three P1 add-on detail pages; pricing section update showing all 5 add-ons

**Avoids:** Pitfall 5 (broken funnel — no detail page links resolve to 404); Pitfall 4 (design drift — Xero page is the canonical template, follow it exactly)

**Research flag:** Standard patterns — no research-phase needed. The Xero and Inventory pages are proven templates. Content is the only variable per page.

---

### Phase 2: Competitor Comparison Page + Nav/Footer Links

**Rationale:** This phase depends on Phase 1 completing so the comparison page can reference accurate NZPOS pricing and link into all 5 add-on detail pages as evidence. Nav and footer changes affect every marketing page and carry the highest blast radius — they are the last implementation step within this phase, after `compare/page.tsx` is verified in isolation. The comparison page requires upfront compliance work (source documentation) before any content is written.

**Delivers:**
- `src/data/competitors.ts` — all comparison data with sourced URLs, last-verified dates, and TypeScript types
- `/compare` — feature matrix (8-10 rows, 4 competitors), NZ editorial sections, FAQ accordion, dual CTA (Try Demo + Start Free)
- Updated `LandingNav.tsx` with "Compare" link in desktop nav AND mobile overlay
- Updated `LandingFooter.tsx` with "Compare" link following separator pattern

**Features from FEATURES.md:** Competitor comparison page (P1 priority); "Compare" nav link; all competitor differentiator content (per-add-on pricing, Square NZ limitations, FTA gift card compliance, Privacy Act loyalty compliance, Xero connector cost)

**Avoids:** Pitfall 1 (FTA breach — source doc required before writing copy); Pitfall 2 (stale data — centralised data file with dates); Pitfall 3 (thin content — 400+ words of editorial required); Pitfall 6 (trademark risk — text not logos, disclaimer required); Pitfall 7 (SEO cannibalisation — keyword split between landing page and comparison page)

**Research flag:** Requires upfront compliance work before building. Complete a source verification checklist for all competitor claims (each row in the comparison table must have a URL and date). Define keyword targeting (title tag, H1, meta description) before writing any copy. The comparison page pattern is new to this codebase — no existing template to follow.

---

### Phase Ordering Rationale

- Add-on detail pages are independent and unblock Phase 2 — build them first to fix the broken funnel and create the "evidence" pages the comparison page links to
- Pricing section and catalog updates follow detail pages — depend on slugs existing and resolving
- Comparison page follows Phase 1 completion — references NZPOS pricing and links to all 5 add-on detail pages
- Nav and footer go last within their respective phases — they have the highest blast radius (affect every marketing page) and should be verified after the pages they link to are confirmed working

---

### Research Flags

**Needs attention before building:**
- **Phase 2 (FTA compliance):** Competitor claim source documentation must be compiled before content writing begins. This is a legal prerequisite. Create a reference doc with one row per comparison table claim: claim text, source URL, date accessed, source type (official competitor docs vs. community forum vs. third-party review site).
- **Phase 2 (SEO keyword split):** Define the keyword targeting strategy before writing H1, title tag, and meta description for the comparison page. Landing page and comparison page must not target the same keyword clusters.

**Standard patterns (skip research-phase):**
- **Phase 1 (Add-on detail pages):** Established pattern with two working examples in the codebase. Content is the only variable.
- **Phase 1 (Pricing section + catalog):** Update existing components to show 5 cards. Grid layout adjustment is the only technical decision.
- **Phase 2 (Nav/footer):** Straightforward link additions following existing patterns already documented in ARCHITECTURE.md.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No stack changes for this milestone; existing stack verified against live Next.js 16.2.1 docs |
| Features | MEDIUM-HIGH | Competitor pricing verified against official competitor pricing pages as of 2026-04-07; subject to change; features verified via official competitor documentation |
| Architecture | HIGH | Based on direct codebase inspection of all existing marketing routes, components, and layout patterns |
| Pitfalls | HIGH (legal risk); MEDIUM (SEO) | FTA compliance confirmed against Commerce Commission official guidance and NZ legislation; SEO patterns from multiple practitioner sources; Google core update data from third-party analysis |

**Overall confidence:** HIGH

### Gaps to Address

- **Competitor pricing accuracy at build time:** All competitor pricing in `src/data/competitors.ts` must be re-verified against live competitor pricing pages at the point of writing copy — not just at research time (2026-04-07). Prices change. Use fuzzy language ("from $X/month") where exact prices are volatile.
- **Square card processing in NZ:** Confirmed via Square community forum, not Square's official NZ documentation. If this claim appears on the comparison page, cite the community thread and add a caveat ("as confirmed by Square community response"). Consider using "Square NZ does not offer card payment processing" rather than "Square cannot process payments in NZ" — the former is more defensible.
- **Grid layout for 5 add-on cards:** The existing 2-col grid with `max-w-3xl` will produce a single-card orphan row at 5 items. Pick one layout decision (`md:grid-cols-3` or accept asymmetry with deliberate styling) and apply it consistently across both `LandingPricing.tsx` and `add-ons/page.tsx`.
- **Testimonial placeholder strategy:** The comparison page benefits from social proof but no real merchant testimonials exist yet. Use clearly-marked placeholder structure ("space reserved for customer quote — [Christchurch gift store owner]") rather than fabricated quotes. Fabricated quotes that could be mistaken for real testimonials create FTA exposure.
- **`(marketing)/layout.tsx` refactor:** Creating a shared group layout is the right long-term architectural move but is out of scope for v8.1. Flag this for a future maintenance phase. Do not let the absence of a group layout be interpreted as a reason to create one during this milestone — the double-wrapping risk with `add-ons/layout.tsx` is real.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection, 2026-04-07 — `src/app/(marketing)/` route structure, component patterns, design token usage in `globals.css`
- Commerce Commission — Comparative Advertising (official NZ guidance): https://www.comcom.govt.nz/business/dealing-with-typical-situations/advertising-your-product-or-service/comparative-advertising/
- Commerce Commission — Stronger Fair Trading Act (penalty increase announcement): https://www.comcom.govt.nz/news-and-media/news-and-events/2025/stronger-fair-trading-act-a-win-for-consumers-and-rule-abiding-businesses/
- MBIE — Fair Trading Act changes (2026 amendment overview): https://www.mbie.govt.nz/business-and-employment/consumer-protection/fair-trading-act-changes
- Fair Trading Act 1986 s 13 (NZ Legislation): https://www.legislation.govt.nz/act/public/1986/0121/latest/DLM96908.html
- Lightspeed Retail pricing (official, verified 2026-04-07): https://www.lightspeedhq.com/pos/retail/pricing/
- Shopify POS NZ pricing (official, verified 2026-04-07): https://www.shopify.com/nz/pos/pricing
- Shopify Xero connector — CarryTheOne NZ$20/mo (Xero App Store NZ, verified 2026-04-07): https://apps.xero.com/nz/app/shopify
- Hike POS pricing (hikeup.com/nz/pricing/ + G2 cross-reference, verified 2026-04-07): https://hikeup.com/nz/pricing/
- Hike Xero integration (Xero App Store NZ): https://apps.xero.com/nz/app/hike-pos
- Next.js 16.2.1 official documentation (verified 2026-03-25): https://nextjs.org/docs

### Secondary (MEDIUM confidence)

- Square AU pricing page (official AU, proxy for NZ market, verified 2026-04-07): https://squareup.com/au/en/point-of-sale/retail/pricing
- Square NZ card processing not available (community confirmation): https://community.squareup.com/t5/General-Discussion/Is-Square-available-in-New-Zealand/td-p/72331
- Square + Xero NZ unavailability (Xero Central): https://central.xero.com/s/article/Square
- Google December 2025 core update — thin content penalties: https://almcorp.com/blog/google-december-2025-core-update-complete-guide/
- B2B SaaS comparison page guide (Backstage SEO, includes C&D experience): https://backstageseo.com/blog/b2b-comparison-pages/
- SaaS comparison pages for SEO: https://piperocket.digital/blogs/how-to-write-saas-comparison-pages-for-seo/
- Sprintlaw NZ — Comparative advertising rules: https://sprintlaw.co.nz/articles/business-advertising-laws-in-new-zealand-key-rules-for-smes-and-startups/

### Tertiary (LOW confidence)

- Competitor trademark use in advertising (CPS Law, 2025): https://www.cpsslaw.com/blog/2025/02/can-you-use-competitor-trademarks-in-comparative-advertising/
- Brand drift in SaaS (Mariya Design): https://www.mariya.design/post/what-is-brand-drift-and-why-it-starts-as-you-scale
- Vend/Lightspeed acquisition context (NZ Entrepreneur): https://nzentrepreneur.co.nz/nz-pos-software-provider-vend-acquired-by-lightspeed/

---

*Research completed: 2026-04-07*
*Ready for roadmap: yes*
