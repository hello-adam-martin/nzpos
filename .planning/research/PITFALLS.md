# Pitfalls Research: v8.1 Marketing Refresh & Competitor Comparison Page

**Domain:** Adding a marketing site refresh and NZ POS competitor comparison page to an existing multi-tenant SaaS product. Updating landing page, add-on detail pages, and building a competitor feature matrix page.
**Researched:** 2026-04-07
**Confidence:** HIGH for NZ Fair Trading Act comparative advertising rules (confirmed against Commerce Commission official guidance and NZ legislation). HIGH for FTA penalty increases (confirmed against Commerce Commission announcement and MBIE). MEDIUM for comparison page SEO pitfalls (multiple sources agree, practitioner evidence). MEDIUM for design consistency/brand drift (multiple sources agree, practitioner reports). LOW for NZ-specific competitor data accuracy (competitor pricing changes frequently; data requires manual verification at time of build).

---

## Critical Pitfalls

### Pitfall 1: Misleading Competitor Claims Breach the NZ Fair Trading Act

**What goes wrong:**
A comparison table includes feature claims about Square, Lightspeed (formerly Vend), or POSbiz that are inaccurate — for example, claiming a competitor "doesn't support GST" when they do, or claiming their pricing is higher than it currently is. Under the NZ Fair Trading Act 1986 s 9 (misleading conduct) and s 13 (false representations), this is a legal breach regardless of intent. Commerce Commission can issue infringement notices or pursue prosecution.

Critically: pending 2026 legislation will increase corporate penalties from $600,000 to $5 million (or 3x the commercial gain). The bill is expected to pass in late 2026. By the time this comparison page goes live, or shortly after, the penalty environment will have materially increased.

**Why it happens:**
The developer researches competitor features once at build time. Competitor products change — Square restructured its entire pricing tier system in October 2025, Vend was acquired by Lightspeed and rebranded (pricing/features changed). A claim accurate in January 2026 may be false by June 2026. Additionally, comparison pages often make "framing errors" — technically accurate statements presented in a context that creates a false overall impression, which the FTA also prohibits.

**How to avoid:**
- Source every competitor claim from the competitor's own current public documentation or official pricing page. Link to the source URL in an internal reference doc at time of writing.
- Never claim a competitor "doesn't have" a feature unless confirmed directly on their current feature documentation (not a third-party review site).
- Use hedged language for dynamic claims: "as at [month year]" disclosure on the comparison page.
- Restrict comparison to verifiable, stable facts: pricing tiers, availability in NZ, NZ-specific compliance (GST, Xero integration), contract terms. Avoid subjective quality claims ("better support").
- Add a page footer: "Pricing and features reflect publicly available information as at [date]. Contact vendors for current pricing." This is standard practice and reduces FTA exposure.
- Build a review trigger into the page: schedule quarterly review of all competitor claims (every 3 months).

**Warning signs:**
- Comparison table has no date disclosure
- Claims sourced from third-party review sites rather than competitor's own documentation
- Any claim that a competitor "cannot do X" without a direct link to their own docs confirming the absence
- Claims about competitor pricing without citing the pricing page

**Phase to address:**
Competitor comparison page phase — first task before building the table is to document all sources and dates. Legal review checklist before publish.

---

### Pitfall 2: Competitor Pricing Data Stales Immediately After Publish

**What goes wrong:**
The comparison page shows Lightspeed at $89/month. Lightspeed changes pricing. The page now contains a false statement that is harder to update than the initial build — especially because Next.js static pages (`force-static`) are built at deploy time and the comparison data is hardcoded in TSX. Visitors who compare prices will find contradictions when they visit the competitor's site. This damages trust, not competitors.

Vend was acquired by Lightspeed in 2021 for ~USD $350M. It is now "Lightspeed Retail." Square restructured its tier system in October 2025. POSbiz is a smaller NZ player with less-documented pricing. All of these are high-churn competitor data points.

**Why it happens:**
Marketing pages are often built once and treated as static content. Pricing comparison data is stored as hardcoded values in component files. There is no process for review. The solo developer context (this project) compounds the risk — no marketing team to flag outdated claims.

**How to avoid:**
- Store all competitor comparison data in a single configuration object or data file (e.g., `src/data/competitors.ts`) rather than scattered across TSX. This creates a single location to update.
- Clearly document which competitor website page each claim was sourced from, with a last-verified date, in comments inside the data file.
- Consider "fuzzy" pricing language: "from $X/month" with a "visit [Competitor] for current pricing" link, rather than exact current prices. Exact prices are the most volatile data point.
- Add a visible last-reviewed date on the comparison page: "Last reviewed: [month year]"
- Schedule a recurring review: every 90 days, verify competitor pricing and features against their live sites.

**Warning signs:**
- Competitor pricing data is hardcoded in JSX/TSX with no comments indicating source or date
- No single file contains all comparison data (changes require hunting across multiple components)
- No last-reviewed date disclosed to visitors
- NZ-specific claims about competitors (GST handling, Xero integration) sourced from review sites rather than the competitor's NZ documentation

**Phase to address:**
Competitor comparison page phase — architect the data structure before writing any comparison content. Centralised data file is a prerequisite.

---

### Pitfall 3: Comparison Page Creates Thin Content Penalised by Google

**What goes wrong:**
A comparison page built as a simple feature matrix table with yes/no checkboxes contains very little original content. Google's December 2025 core update specifically targeted thin content pages, with 63-71% ranking loss reported for pages optimised for keywords rather than users. A comparison page that is purely a table without original analysis, context, or NZPOS-specific value adds no editorial signal.

**Why it happens:**
Comparison pages look complete when the table is populated. The visual completeness of a grid with checkmarks masks the content thinness. The table answers "what" but not "why" — Google's E-E-A-T signals require Experience and Expertise signals that a matrix alone cannot provide.

**How to avoid:**
- Add 400-600 words of original analysis above the matrix: "Why we built NZPOS", "What NZ retailers need that global POS providers miss", "How we handle GST differently". This is genuine expertise that global review sites cannot replicate.
- Include NZ-specific evidence: IRD compliance explanation, Privacy Act 2025 loyalty consent (NZPOS has it, large players may not have documented NZ compliance), Fair Trading Act 2024 gift card expiry compliance.
- Acknowledge where competitors are genuinely better (Square has broader hardware ecosystem, Lightspeed has multi-location). This increases credibility (E-E-A-T) and reduces FTA risk.
- Structure the page as a guide, not just a table: H2/H3 hierarchy, introduction, matrix, analysis sections, conclusion, FAQ.
- URL structure: `/compare` or `/compare/nzpos-vs-square` rather than generic paths. Exact-match keyword structure is the standard for this content type.

**Warning signs:**
- The comparison page consists only of a table with no surrounding editorial content
- No NZ-specific analysis present
- Page word count under 400 words (excluding table data)
- No FAQ section addressing common buyer questions

**Phase to address:**
Competitor comparison page content phase. Content outline and editorial sections should be drafted before the table is built, not after.

---

### Pitfall 4: New Marketing Pages Drift From the Existing Design System

**What goes wrong:**
New add-on detail pages (Gift Cards, Advanced Reporting, Loyalty Points) and the comparison page are built with slightly different component patterns, spacing values, or colour usage than the existing Xero and Inventory add-on pages. The navy/amber design system (`var(--color-navy)`, `var(--color-amber)`) is correctly defined in globals.css, but new pages use hardcoded Tailwind classes (`bg-slate-900`) instead of design tokens. Visitors navigating between existing pages and new pages notice visual inconsistency — undermining the professional brand.

**Why it happens:**
This project has a working design system in `globals.css` with CSS custom properties (`--color-navy`, `--color-amber`, `--space-md`, etc.), but it is not enforced by a component library or Storybook. Each new page is built in isolation. Under deadline pressure, developers reach for familiar Tailwind utility classes rather than referencing the token system. The comparison page in particular may be built by copying a feature section pattern from a different source (e.g., Tailwind UI examples) that uses different class naming conventions.

**How to avoid:**
- Read the existing `LandingHero.tsx`, `LandingFeatures.tsx`, and the Xero add-on page before writing any new page. Match the exact class patterns and layout conventions already in use.
- Never use hardcoded colour hex values or Tailwind colour utilities (`bg-slate-900`, `text-gray-600`) on marketing pages — use CSS custom property classes only (`bg-[var(--color-navy)]`, `text-[var(--color-text-muted)]`).
- The comparison page has unique layout needs (table/matrix). Ensure the table uses the same type scale (font-sans, font-display), border colours (`border-[var(--color-navy)]`), and surface colours (`bg-[var(--color-surface)]`) as the existing pricing cards.
- For new add-on detail pages, use the Xero page (`/add-ons/xero/page.tsx`) as the canonical template. Match structure: hero section, without/with lists, feature grid, 3-step setup, pricing CTA. Don't reinvent the layout.

**Warning signs:**
- New page uses `bg-slate-900` or `text-gray-700` instead of CSS custom property tokens
- Section padding values differ from `var(--space-3xl)` used on existing pages
- Font size classes use Tailwind scale (`text-4xl`) rather than the font size tokens or explicitly matched px values used on existing pages
- Hero section background colour or gradient is different from the navy used on `/add-ons/xero` and `/add-ons/inventory`

**Phase to address:**
All marketing page phases — verify consistency with existing pages before each page ships. Include a design consistency check in every phase's acceptance criteria.

---

### Pitfall 5: Missing 3 New Add-On Detail Pages Leaves the Marketing Funnel Broken

**What goes wrong:**
The landing page already mentions 5 paid add-ons in the pricing section. After v8.0, Gift Cards, Advanced Reporting/COGS, and Loyalty Points exist in the product but have no dedicated marketing pages — only Xero and Inventory Management have add-on detail pages (`/add-ons/xero`, `/add-ons/inventory`). Visitors who click "Learn more" on these add-ons from the landing page or the `/add-ons` overview land on 404s or generic pages. This is a broken conversion funnel that undermines the marketing refresh goal.

**Why it happens:**
Add-on pages are easily deferred because the add-on itself works in the product. The marketing page feels like "polish" and gets deprioritised. But users making a $14-15/month purchase decision want a dedicated page explaining the value before they commit.

**How to avoid:**
- Create `/add-ons/gift-cards`, `/add-ons/advanced-reporting`, and `/add-ons/loyalty-points` pages as part of this milestone — not as a future task.
- Use the Xero add-on page as the exact structural template: hero, without/with lists, feature grid, 3-step setup, pricing CTA.
- Each page needs unique NZ-specific compliance content: Gift Cards → Fair Trading Act 2024 compliance statement; Loyalty Points → Privacy Act 2025 consent disclosure.

**Warning signs:**
- `/add-ons/gift-cards` returns 404
- The `/add-ons` overview page has cards for add-ons that don't have detail pages
- The landing page pricing section links to `/add-ons` but the add-ons overview page does not link to individual add-on detail pages

**Phase to address:**
Landing page refresh phase and add-on detail page phase together — the navigation links must resolve before the landing page update ships.

---

### Pitfall 6: Competitor Name Usage Creates Trademark Risk

**What goes wrong:**
The comparison page uses competitor logos or brand names (Square, Lightspeed, Vend) in ways that could be construed as implying affiliation or endorsement. Using a competitor's registered trademark in a comparison page is generally lawful in NZ if the comparison is accurate and non-misleading. However, using their logo without permission, misrepresenting their product, or implying they endorse the comparison creates trademark and FTA liability.

One real-world example from a B2B SaaS operator building 50 comparison pages: one cease-and-desist received, one correction request received. For a small NZ startup, a cease-and-desist from Square Inc. (a US public company with a legal team) would be a material distraction.

**Why it happens:**
Comparison page templates often include competitor logos for visual credibility. The developer assumes "fair use" covers comparative advertising. NZ trademark law does not have the US "nominative fair use" doctrine by name, but comparative advertising with a competitor's mark is lawful if accurate and not misleading under the FTA. The risk is not the name — it is inaccuracy combined with logo use.

**How to avoid:**
- Use competitor names as plain text, not as stylised logos or branded assets. "Square" in text is lower risk than the Square logo (which is trademarked).
- If logos are used, they must be current, unmodified, and accompanied by trademark attribution: "Square is a trademark of Square, Inc." (or similar).
- Consider not using logos at all for v8.1 — text-based comparison tables are legally safer and faster to update.
- Add a disclaimer to the comparison page: "All trademarks are the property of their respective owners. NZPOS is not affiliated with Square, Lightspeed, or POSbiz."

**Warning signs:**
- Competitor logos are used in the comparison table
- No trademark attribution notice on the comparison page
- No disclaimer of affiliation

**Phase to address:**
Competitor comparison page phase — decide on logo-vs-text approach before any design work begins. This is an architecture decision, not a polish step.

---

### Pitfall 7: SEO Keyword Cannibalisation Between Landing Page and Comparison Page

**What goes wrong:**
The landing page already ranks (or is targeting) for "NZ POS system" and "point of sale NZ." A comparison page targeting "NZPOS vs Square" or "best POS NZ" can compete with the landing page for similar keyword clusters, splitting authority between two pages rather than concentrating it on the strongest page.

**Why it happens:**
Comparison pages are naturally written with high-intent keywords ("best POS for NZ retailers," "Square alternative NZ") that overlap with top-of-funnel landing page keywords. Without deliberate keyword targeting differentiation, Google sees two pages competing for the same terms from the same domain.

**How to avoid:**
- The landing page should own: "NZ POS system," "point of sale NZ," "POS for small business NZ."
- The comparison page should own: "[NZPOS] vs Square," "[NZPOS] vs Lightspeed," "Square alternative NZ POS," "Vend alternative NZ." These are mid-funnel evaluation queries, not top-of-funnel awareness queries.
- Ensure the comparison page has a canonical URL pointing to itself (not the landing page), a unique title tag, and unique H1.
- Internal link from the landing page to the comparison page with anchor text like "See how we compare" — this passes authority to the comparison page without cannibalising the landing page's keyword targeting.

**Warning signs:**
- Landing page and comparison page have overlapping title tags
- Landing page has no internal link to the comparison page
- Comparison page targets "NZ POS" rather than "NZPOS vs [competitor]" keyword structure

**Phase to address:**
Comparison page phase — define keyword targeting before writing any content. URL, title, H1, and meta description must be set to mid-funnel evaluation queries.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode competitor pricing in JSX | Fast to ship | Single source of truth doesn't exist; updates require hunting across files; stale data risk | Never — centralise in a data file |
| Use third-party review site data for competitor claims | Avoids visiting competitor sites | Review sites are often outdated; citing them exposes you to FTA risk when they're wrong | Never for factual claims; OK for quote attribution only |
| No "last reviewed" date on comparison page | Cleaner visual design | Visitors notice contradictions with current competitor sites; FTA risk increases over time | Never — disclosure protects both legally and credibility-wise |
| Copy Tailwind UI component patterns verbatim for new pages | Fast to build | Tailwind UI uses different colour classes than the NZPOS design token system; creates brand drift | OK as a structural starting point only — replace all Tailwind utilities with design tokens |
| Skip add-on detail pages for new add-ons | Less work this milestone | Broken conversion funnel; visitors who want to buy Gift Cards or Loyalty Points hit dead ends | Never — incomplete add-on pages must not ship |
| Use competitor logos without attribution | Higher visual credibility | Trademark liability; cease-and-desist exposure with corporate legal teams (Square Inc., Lightspeed Commerce) | Never without trademark attribution and accuracy |

---

## Integration Gotchas

Common mistakes when connecting marketing pages to existing product.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `/add-ons` overview page | Adding new add-on cards without creating corresponding detail pages | Always create the detail page route before linking to it; verify 404 does not occur |
| Landing page pricing section | Updating add-on count or names without updating the features list and add-on detail links | Update all three sections atomically: features section, pricing section, add-on links |
| Demo POS CTA | New marketing pages lack the "Try POS Demo" ghost button that exists on the landing page | All primary marketing pages should include a consistent demo CTA |
| `force-static` metadata | New comparison page defaults to dynamic rendering because it has no `export const dynamic = 'force-static'` | All marketing pages should be statically generated — add the directive and verify at build time |
| Internal links | Comparison page links to `/signup` with no UTM parameters, making demo-to-signup attribution impossible | Add UTM parameters to comparison page CTAs: `utm_source=compare_page` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Comparison table built as a large client component | JavaScript bundle size increases; slower Time to Interactive on mobile (iPad-heavy NZ retail audience) | Build comparison table as a Server Component; no interactivity needed for a static feature matrix | Any traffic from mobile/tablet devices |
| Full-page hero image on comparison page without next/image optimisation | Large LCP on slow connections; Google Core Web Vitals penalty | Use `next/image` with `priority` prop for hero images; ensure Supabase Storage domain is in `remotePatterns` | First load from mobile on 4G |
| Marketing pages with `revalidate: 0` (fully dynamic) | Every request hits the server; higher Vercel function invocation count | All marketing pages should use `force-static` or `revalidate: 86400`; comparison data is editorial, not real-time | At any scale — performance waste from day one |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Comparison page serves competitor data from a server-side fetch to competitor sites | SSRF vector; server IP changes expose your request origin to competitors | Never fetch competitor data at runtime; all comparison data is static editorial content in a data file |
| New marketing pages bypass CSP headers | Inline scripts or third-party embeds added for analytics/chatbot trigger CSP violations (currently in Report-Only mode) | Review any new scripts added to marketing pages against the existing CSP policy; convert from Report-Only to enforcing only after verification |
| Competitor email collection via comparison page | Privacy Act obligation to disclose data use at collection; SPAM Act compliance for marketing emails | Any email capture on comparison page must have the same privacy disclosure as the main signup form |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Comparison table is all "NZPOS wins" checkmarks | Looks like marketing, not analysis; reduces credibility | Include honest cells: "Square has broader hardware ecosystem," "Lightspeed supports multi-location" — these build trust |
| "Why NZPOS" section uses generic SaaS copy ("built for you") | Fails to resonate with NZ retail owner audience | Use specific NZ context: "Built for IRD GST filing, Xero integration, and EFTPOS-first workflows" |
| Comparison page has no CTA path | Visitor finishes reading with no next step | End comparison page with: "Try it free" (signup) + "Try POS Demo" (demo) — same dual CTA pattern as landing page |
| Add-on detail pages have inconsistent pricing (showing old pricing) | Visitor confusion; support queries | Verify all 5 add-on pricing cards show current prices: Xero $9, Inventory $9, Gift Cards $14, Advanced Reporting $9, Loyalty Points $15 |
| New pages lack mobile-first layout validation | iPad users (the core POS audience) see broken table layouts on smaller screens | Test comparison table on iPad viewport (1024px) and mobile (390px) before shipping; use responsive horizontal scroll for wide tables |

---

## "Looks Done But Isn't" Checklist

- [ ] **Competitor comparison table:** Table renders and looks correct — verify each competitor claim has a source URL in the data file, a last-verified date, and no "doesn't have X" claim without direct competitor documentation confirming absence.
- [ ] **FTA compliance:** Comparison page is published — verify a "last reviewed" date disclosure is present, a trademark disclaimer is present, and no unsubstantiated superlative claims ("best," "only NZ POS") are made without evidence.
- [ ] **Add-on detail pages:** Gift Cards, Advanced Reporting, and Loyalty Points pages exist — verify routes return 200, each page matches the structural template of the Xero add-on page, and NZ compliance details are included.
- [ ] **Landing page refresh:** Updated to show all 5 add-ons — verify the pricing section, features section, and add-on links are all updated atomically and internally consistent.
- [ ] **Design system consistency:** New pages ship with correct design tokens — verify no hardcoded Tailwind colour classes, spacing values match `var(--space-*)` tokens, and font classes match existing marketing pages.
- [ ] **Static generation:** All new marketing pages — verify `export const dynamic = 'force-static'` is present, build output confirms static generation, and no unexpected dynamic routes.
- [ ] **Internal links resolved:** No 404s — verify every link from the landing page and `/add-ons` overview to new detail pages resolves correctly after build.
- [ ] **SEO metadata:** Each new page — verify unique `<title>`, unique `<meta description>`, and correct Open Graph tags are defined via Next.js `metadata` export.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| FTA breach — misleading competitor claim discovered post-publish | MEDIUM | Remove or correct the specific claim immediately; add "last reviewed" date disclosure; document the correction; monitor for Commerce Commission contact |
| Cease-and-desist from competitor over comparison page | HIGH | Take page offline immediately; legal review; correct any inaccurate claims; republish with corrections and trademark attribution; respond to C&D via NZ legal counsel |
| Competitor pricing data found to be stale | LOW | Update the centralised data file; redeploy; update the "last reviewed" date |
| New marketing pages break design system consistency | LOW | Audit all pages against the design token checklist; update all non-compliant classes in a single pass |
| SEO cannibalisation identified post-launch | MEDIUM | Update landing page title tag and meta to focus on top-of-funnel terms; update comparison page to mid-funnel evaluation terms; add canonical tags; submit updated URLs to Google Search Console |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Misleading competitor claims (FTA breach) (Pitfall 1) | Competitor comparison page — content sourcing | Source doc with URLs and dates; FTA checklist review before publish |
| Stale competitor pricing (Pitfall 2) | Competitor comparison page — data architecture | Centralised data file exists; last-reviewed date displayed; review calendar set |
| Thin content SEO penalty (Pitfall 3) | Competitor comparison page — content phase | 400+ words of original editorial; NZ-specific analysis present; FAQ section |
| Design system drift on new pages (Pitfall 4) | All marketing page phases | No hardcoded colour classes; design consistency audit per page |
| Missing add-on detail pages — broken funnel (Pitfall 5) | Add-on detail pages phase | All 5 add-ons have detail pages; no 404s from navigation |
| Competitor trademark risk (Pitfall 6) | Competitor comparison page — design decision | Text-not-logos decision; trademark attribution present; affiliation disclaimer |
| SEO keyword cannibalisation (Pitfall 7) | Comparison page — keyword targeting | Distinct title/H1/meta from landing page; internal link from landing page to comparison page |

---

## NZ-Specific Compliance Reference for Marketing

| Law | Relevant Section | Requirement for Comparison/Marketing Page | Risk Level |
|-----|-----------------|-------------------------------------------|------------|
| Fair Trading Act 1986 s 9 | Misleading conduct | No false or misleading impression about competitors' features, pricing, or limitations | HIGH — pending $5M penalty increase (late 2026) |
| Fair Trading Act 1986 s 10 | Misleading conduct in connection with land/goods/services | Comparative pricing claims must be accurate and sourced | HIGH |
| Fair Trading Act 1986 s 13 | False representations | No false statements about competitors' products, services, or affiliations | HIGH |
| Fair Trading Act 1986 s 12A | Unsubstantiated representations | Any claim must have reasonable grounds before it is made | MEDIUM — includes performance/value claims |
| NZ Advertising Standards Authority Comparative Advertising Code | Best practice | Comparisons must be factual, verifiable, and present like-for-like (same market, same tier) | MEDIUM — not legally binding but used by courts to assess reasonableness |
| NZ Trademarks Act 2002 s 89 | Use of registered mark in comparative advertising | Permitted if comparison is honest and does not take unfair advantage of the mark's reputation | MEDIUM |

---

## Sources

- Commerce Commission — Comparative Advertising (official NZ guidance): https://www.comcom.govt.nz/business/dealing-with-typical-situations/advertising-your-product-or-service/comparative-advertising/
- Commerce Commission — Stronger Fair Trading Act (penalty increase announcement, 2025): https://www.comcom.govt.nz/news-and-media/news-and-events/2025/stronger-fair-trading-act-a-win-for-consumers-and-rule-abiding-businesses/
- MBIE — Fair Trading Act changes (2026 amendment overview): https://www.mbie.govt.nz/business-and-employment/consumer-protection/fair-trading-act-changes
- Fair Trading Act 1986 s 13 — False or misleading representations (NZ Legislation): https://www.legislation.govt.nz/act/public/1986/0121/latest/DLM96908.html
- Simpson Grierson — Fair Trading Act penalty increases: https://www.simpsongrierson.com/insights-news/legal-updates/fair-trading-act-update-black-friday-obligations-and-higher-penalties-on-the-horizon
- B2B SaaS comparison pages guide 2026 (Backstage SEO, includes C&D experience): https://backstageseo.com/blog/b2b-comparison-pages/
- Sprintlaw NZ — Comparative advertising rules: https://sprintlaw.co.nz/articles/business-advertising-laws-in-new-zealand-key-rules-for-smes-and-startups/
- Google thin content penalties (December 2025 core update): https://almcorp.com/blog/google-december-2025-core-update-complete-guide/
- Brand drift in SaaS (Mariya Design): https://www.mariya.design/post/what-is-brand-drift-and-why-it-starts-as-you-scale
- Lightspeed acquires Vend (NZ Entrepreneur): https://nzentrepreneur.co.nz/nz-pos-software-provider-vend-acquired-by-lightspeed/
- Vend is now Lightspeed Retail (official Lightspeed): https://www.lightspeedhq.com/vend/
- Square October 2025 pricing restructure (NerdWallet): https://www.nerdwallet.com/business/software/reviews/square-pos
- Competitor trademark use in advertising (CPS Law, 2025): https://www.cpsslaw.com/blog/2025/02/can-you-use-competitor-trademarks-in-comparative-advertising/

---
*Pitfalls research for: v8.1 Marketing Refresh & Competitor Comparison Page — NZ Fair Trading Act compliance, SEO risks, design consistency, competitor data accuracy, and marketing funnel integrity*
*Researched: 2026-04-07*
