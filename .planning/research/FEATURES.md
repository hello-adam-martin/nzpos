# Feature Research

**Domain:** NZ SaaS POS — Marketing Site Refresh & Competitor Comparison Page (v8.1)
**Researched:** 2026-04-07
**Confidence:** MEDIUM-HIGH (competitor pricing verified via official pages and third-party review sites; SEO/comparison page patterns from multiple practitioner sources; NZ market details cross-referenced)

---

## Context: What This Research Covers

This file answers: "What belongs on a refreshed marketing site that showcases all 5 paid add-ons, and what goes on a competitor comparison page targeting NZ retail POS buyers?"

**In scope:**
- Landing page refresh (hero, feature grid, pricing section) to show all 5 paid add-ons
- New dedicated add-on detail pages for Gift Cards, Advanced Reporting, and Loyalty Points
- Competitor comparison page with feature matrix and "Why NZPOS" narrative
- SEO structure and conversion patterns for comparison/alternative pages

**Not in scope:**
- Building any new product features (v8.0 shipped Gift Cards, Advanced Reporting, Loyalty Points)
- Infrastructure or backend changes
- Existing Xero and Inventory detail pages (already live)

**Existing marketing page state (pre-v8.1):**
- Landing page showcases 15 features and a pricing section (built in v5.0, updated for email-free in v6.0)
- Pricing section reflected only 2 paid add-ons (Xero, Inventory) — now needs 5
- Detail pages exist for Xero and Inventory add-ons only
- No competitor comparison page exists

---

## NZ POS Competitor Landscape

### Competitor 1: Lightspeed Retail (formerly Vend)

Vend was founded in Auckland in 2010, making it the most NZ-native of the major competitors. Acquired by Lightspeed (Canada) in 2021, now marketed as Lightspeed Retail X-Series. Strong brand recognition in NZ retail.

| Plan | Monthly Price (USD) | Key Features |
|------|-------------------|--------------|
| Basic | $89/mo (annual) | 1 register, inventory, integrated payments, loyalty, eCommerce |
| Core | $149/mo | + advanced reporting, multi-location, eCommerce |
| Plus | $289/mo | + customisation, API access |

**NZ-relevant notes:**
- Xero integration: YES — automatic daily sales sync (mixed user reviews on reconciliation quality)
- Gift cards: YES — included in platform
- Loyalty: YES — included in all plans
- COGS / advanced reporting: YES — included in Core+
- Online store: YES — built in to Core+
- Offline mode: YES — limited offline capability (the original Vend product was known for this)
- Pricing model: Bundled — no micro add-ons

**Key weakness for comparison:** Cheapest plan is $89/mo USD (~NZD $155/mo). No free tier. Lock-in to a subscription even for basic checkout. Acquired Canadian company, NZ origins diluted.

### Competitor 2: Shopify POS

Shopify is primarily an eCommerce platform that extended into POS. Most NZ retailers who use Shopify online are the target market. Strong global brand, widely known.

| Plan | Monthly Price | Key Features |
|------|-------------|--------------|
| Basic (with POS Lite) | US$39/mo | Basic checkout, returns at original location, limited staff access |
| Grow (with POS Lite) | US$105/mo | Unlimited POS logins |
| Advanced (with POS Lite) | US$399/mo | Advanced reporting |
| POS Pro add-on | +US$89/mo/location | Staff roles, advanced inventory, BOPIS, spend-threshold discounts, loyalty insights |
| Retail plan (NZ-specific) | NZ$89/mo | 1 POS Pro location, unlimited POS logins |

**NZ-relevant notes:**
- Xero integration: Via third-party app — NZ$20/mo additional (CarryTheOne connector)
- Gift cards: YES — included free with all paid Shopify plans
- Loyalty: NOT native — requires third-party app (Smile.io, Yotpo, etc., priced separately)
- COGS / advanced reporting: Gated behind POS Pro (US$89/mo add-on)
- Online store: YES — this is Shopify's core strength; POS is the add-on
- Offline mode: NO — requires internet for all transactions
- Click-and-collect: Gated behind POS Pro

**Key weakness for comparison:** POS is an afterthought to eCommerce. No native loyalty. Xero requires a paid third-party connector. Pricing adds up quickly (base plan + POS Pro + Xero connector = ~NZD $300+/mo).

### Competitor 3: Square

Square is available in New Zealand but with a critical limitation: **Square cannot process card payments in New Zealand.** Square NZ functions as a POS tracking tool only — you cannot use Square's payment processing. All card payments still require a separate EFTPOS terminal.

| Plan | Monthly Price (AUD, AU is closest proxy) | Key Features |
|------|----------------------------------------|--------------|
| Free | $0 + transaction fees | Basic POS, inventory, online store |
| Plus | A$109/mo/location | COGS reports, advanced inventory, barcode printing |
| Premium | Custom | Large volume, dedicated support |

**NZ-relevant notes:**
- Card processing: NOT AVAILABLE in NZ (confirmed via Square community forums)
- Xero integration: NOT available for NZ — only AU, UK, Ireland, Canada, US
- Gift cards: YES — included free, but no NZ-compliant 3-year expiry handling
- Loyalty: YES — separate product, A$49/mo (~NZD $85/mo)
- COGS / advanced reporting: Gated behind Plus tier (A$109/mo)
- Online store: YES — included free
- Offline mode: NO — requires internet

**Key weakness for comparison:** Cannot process EFTPOS/card in NZ. No Xero integration for NZ. Gift cards may not comply with NZ Fair Trading Act 2024 (3-year expiry). A significant portion of Square's advertised value is unavailable to NZ merchants.

### Competitor 4: Hike POS

Hike is an Australian cloud POS with a strong NZ presence via the Xero App Store. Positioned as the mid-market all-in-one alternative to Lightspeed for NZ retailers.

| Plan | Monthly Price (USD billed monthly) | Key Features |
|------|----------------------------------|--------------|
| Essential | $69/mo | POS, inventory, basic reports, gift cards, loyalty, Xero |
| Plus | $119/mo | + advanced reports, multiple registers, eCommerce, staff management |
| Enterprise | Custom | Multi-location chains |

Annual pricing: ~15% cheaper (Essential ~$59/mo, Plus ~$99/mo).

**NZ-relevant notes:**
- Xero integration: YES — built in, free for all Hike + Xero users. Auto-syncs sales, customers, inventory movement
- Gift cards: YES — included in all plans
- Loyalty: YES — points-per-purchase, included in all plans
- COGS / advanced reporting: Included in Plus tier
- Online store: YES — eCommerce via Plus plan
- Offline mode: YES — can continue selling when internet is down (sync when reconnected)
- GST: YES — supports NZ 15% GST

**Key weakness for comparison:** Essential plan is ~NZD $120+/mo for a complete system. No free tier. More expensive than NZPOS at equivalent add-on coverage. Offline mode is a genuine advantage NZPOS does not yet have.

### Competitor 5: Shopify (NZ) — add-on comparison note

For the add-on comparison specifically, the relevant Shopify NZ cost for parity with NZPOS's 5 add-ons would be:
- Base Shopify plan (~US$39/mo) + POS Pro (~US$89/mo) + Xero connector (NZ$20/mo) + third-party loyalty app (~US$49/mo)
- Total equivalent: ~NZD $350+/mo vs NZPOS max $56/mo

---

## Feature Landscape for Marketing Pages

### Table Stakes: What a Marketing Site Must Show

Features every SaaS marketing site must have. Missing these = site feels amateur or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pricing section with all add-ons | Buyers want self-serve pricing — no "contact for pricing" | LOW | Update existing pricing section to show all 5 add-ons (was 2). Must match actual Stripe billing. |
| Dedicated page per paid add-on | SaaS buyers research specific features before committing | LOW-MEDIUM | Gift Cards, Advanced Reporting, Loyalty need new pages. Xero and Inventory pages already exist. |
| Feature comparison table | Decision-stage buyers expect side-by-side feature matrix | MEDIUM | Core of the comparison page. Rows = features, columns = NZPOS vs Lightspeed vs Shopify vs Square |
| Trust signals (NZ-specific) | NZ buyers are skeptical of generic global SaaS | LOW | GST badge, EFTPOS support callout, NZ law compliance (Fair Trading Act, Privacy Act), "Built for NZ" |
| CTA at multiple page positions | Conversion best practice — capture intent wherever it fires | LOW | Top of page (Try Demo), post-comparison table (Start Free), FAQ bottom (Contact) |
| Free trial / no credit card framing | Reduces signup friction; relevant since NZPOS has a free core | LOW | Hero should call out "Free core POS — add what you need" |
| Mobile-responsive layout | Many NZ small biz owners browse on phones | LOW | Already handled by Tailwind CSS — maintain for new pages |

### Differentiators: What Makes the Comparison Page Compelling

Features and framing that give NZPOS a genuine argument over competitors.

| Feature / Angle | Value Proposition | Complexity | Notes |
|----------------|-------------------|------------|-------|
| Per-add-on pricing vs bundle | "Pay $9/mo for Xero, not $89/mo for a plan you don't need" | LOW | This is a core positioning claim. Show a side-by-side cost calculator scenario: "Getting Xero + loyalty from Lightspeed costs $149/mo. With NZPOS: $24/mo." |
| NZ GST compliance built in | Square and Shopify require configuration; Lightspeed handles it; NZPOS does it correctly by default | LOW | Explicit callout in comparison table. Per-line GST on discounted amounts. IRD-compliant. |
| NZ Fair Trading Act gift card compliance | Square gift cards do not auto-enforce 3-year NZ minimum expiry. NZPOS does at DB level (CHECK constraint). | LOW | Strong trust signal for NZ merchants. Cite the law. |
| Privacy Amendment Act 2025 loyalty consent | NZPOS stores explicit consent before loyalty enrollment (required from 1 May 2026). Competitors are silent on this. | LOW | Relevant to NZ merchants who need to be compliant |
| Xero integration included ($9/mo) vs Shopify's paid connector | Shopify needs a NZ$20/mo third-party app for Xero. NZPOS native integration is $9/mo and does not require a connector. | LOW | Direct comparison claim with evidence |
| Square cannot process payments in NZ | Square is widely known globally but NZ card processing not available. POS-only, no EFTPOS integration. | LOW | This is a factual disqualifier for NZ buyers. State it clearly in the comparison. |
| Interactive POS demo | Competitors do not offer an in-browser try-before-signup experience | LOW | Link to existing /demo/pos from comparison page hero |
| Free tier includes more than competitors | POS + online store + email notifications + basic reporting + barcode scanning — all free. Square free tier has no Xero sync. Shopify free tier has no POS Pro features. | LOW | Feature table rows showing what's free vs paid for each competitor |
| Built by an NZ founder for NZ needs | Vend was NZ-born but is now a Canadian company product. NZPOS is indie. | LOW | "Why NZPOS" narrative section. Not just features, but who it's for and who built it. |

### Anti-Features for Marketing Pages

Patterns that seem like good marketing but create problems.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|-------------|---------------|-----------------|-------------|
| Claiming offline mode | Competitors (Hike, Lightspeed) have offline mode; tempting to claim parity | NZPOS explicitly does not support offline in v1. False claim damages trust and increases support burden | State it honestly: "Internet required (reliable broadband in NZ retail makes this practical). Offline mode planned." |
| Fake comparison checkmarks | Check everything as "YES" to look better than competitors | Savvy buyers verify claims. Getting caught in a misleading comparison destroys trust and invites public criticism. | Only check features that genuinely exist. Use nuanced notes (e.g., "Gift cards — NZ 3-year expiry compliant" vs just a tick) |
| "Contact for pricing" | Avoids committing to prices that might need updating | B2B SaaS buyers abandon pages with opaque pricing. NZPOS has clear, committed pricing — use it. | Show real prices. Add "as at [date]" footnote. Update pricing section when Stripe prices change. |
| Overwhelming feature lists | More features = more value, right? | Decision paralysis. Buyers looking at a 40-row table close the tab. Competitors' comparison tables are shorter and more skimmable. | Lead with 8-10 decisive features. Link to full feature list for those who want depth. |
| Naming every competitor in the same table | "We're better than 10 other systems!" | A 10-column table is unreadable. Dilutes the argument. Signals you're not confident about specific comparisons. | Focus on 3-4 primary comparisons: Lightspeed (dominant NZ), Shopify (eComm-first NZ), Square (awareness but limited NZ), Hike (Xero-specific NZ). |
| Discounting to compete on price alone | "We're the cheapest!" | Cheapest signals low quality in enterprise-adjacent tools. NZ small biz owners want reliable, not just cheap. | Price-for-value framing: "Get exactly what you need, pay only for what you use." Show scenario math, not race to zero. |
| Generic testimonials ("Great product! 5 stars") | Social proof is important | Generic quotes are ignored. Buyers want specifics about NZ use cases, GST handling, EFTPOS workflow, Xero sync outcomes. | Write placeholder testimonials that model the specificity you want to collect ("As a Christchurch gift store owner, the 3-year gift card expiry just worked — I didn't have to configure anything.") |

---

## Feature Dependencies (Marketing Pages)

```
[Comparison Page]
    └──requires──> [Competitor data accuracy] — must verify competitor pricing before publish
    └──requires──> [All 5 add-on detail pages] — comparison table links into each
    └──requires──> [Updated pricing section] — comparison page references NZPOS prices
    └──enhances──> [/demo/pos] — comparison page CTA links to existing demo
    └──enhances──> [Signup flow] — "Start Free" CTA from comparison must go to signup

[Landing Page Refresh]
    └──requires──> [Gift Cards detail page] — new, must build
    └──requires──> [Advanced Reporting detail page] — new, must build
    └──requires──> [Loyalty Points detail page] — new, must build
    └──enhances──> [Existing Xero detail page] — link from pricing section already works
    └──enhances──> [Existing Inventory detail page] — link from pricing section already works

[Add-On Detail Pages (3 new)]
    └──requires──> [Existing feature gates] — pages describe what is gated, so feature gating must be correct in prod
    └──enhances──> [Comparison page] — comparison table links into detail pages as evidence

[Pricing Section Update]
    └──requires──> [Stripe billing confirmed for all 5 add-ons] — already done in v8.0
    └──requires──> [Correct max MRR copy] — $56/mo if all 5 add-ons
```

### Dependency Notes

- **Comparison page depends on all 5 add-on detail pages:** The comparison table should link directly to each add-on's dedicated page as evidence. Build detail pages before the comparison page, or at minimum in the same phase.
- **Pricing section must be updated before comparison page goes live:** The comparison page references NZPOS pricing. If the pricing section still shows 2 add-ons, the comparison is internally inconsistent.
- **Competitor data needs a verification date:** Competitor pricing changes. The comparison page should include a "Competitor pricing last verified [date]" footnote and use approximate ranges rather than exact current prices where possible.

---

## MVP Definition (v8.1)

### Launch With

- [ ] **Pricing section update** — Show all 5 paid add-ons with prices and feature descriptions. The current 2-add-on pricing section is the biggest gap. Complexity: LOW.
- [ ] **Gift Cards detail page** — Explain what the add-on does, NZ compliance angle, how to enable. Mirror the Xero and Inventory page format. Complexity: LOW.
- [ ] **Advanced Reporting detail page** — Explain COGS, margin%, profit reports. Complexity: LOW.
- [ ] **Loyalty Points detail page** — Explain earn/redeem, customer lookup, NZ privacy compliance. Complexity: LOW.
- [ ] **Competitor comparison page** — Feature matrix, "Why NZPOS" narrative, FAQ, CTAs. Complexity: MEDIUM.

### Add After Validation

- [ ] **Testimonials / social proof on comparison page** — Requires real customer quotes. Start with placeholder structure; fill in when merchants provide feedback.
- [ ] **Comparison page for individual competitors** (e.g., `/compare/nzpos-vs-lightspeed`) — Targeted SEO pages for high-intent searches. Depends on whether single unified page converts well first.

### Future Consideration

- [ ] **Pricing calculator ("Build your plan")** — Interactive tool to show cost based on add-on selection. High value but medium complexity. Defer until pricing section validates.
- [ ] **Case study pages** — Specific NZ merchant stories. Requires real customers using the platform.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Pricing section update (all 5 add-ons) | HIGH — removes confusion for evaluators | LOW — update existing component | P1 |
| Gift Cards detail page | HIGH — new in v8.0, NZ compliance angle is compelling | LOW — content + page structure | P1 |
| Advanced Reporting detail page | HIGH — COGS is a real merchant need | LOW — content + page structure | P1 |
| Loyalty Points detail page | HIGH — most relatable feature for retail buyers | LOW — content + page structure | P1 |
| Competitor comparison page | HIGH — captures high-intent decision-stage traffic | MEDIUM — feature matrix research + layout | P1 |
| Individual "vs" pages per competitor | MEDIUM — targeted SEO, lower overall volume | MEDIUM — content per competitor | P2 |
| Pricing calculator | MEDIUM — useful, not essential | MEDIUM — interactive React component | P3 |
| Customer case studies | HIGH — when available | LOW — template exists | P2 (blocked on real data) |

**Priority key:**
- P1: Ship in v8.1
- P2: Add after v8.1 validates
- P3: Future milestone

---

## Competitor Feature Analysis (Comparison Table Rows)

These are the rows to include in the comparison page feature matrix. Focused on 8-10 decisive factors, not exhaustive.

| Feature | NZPOS | Lightspeed Retail | Shopify POS | Square NZ | Hike POS |
|---------|-------|-------------------|-------------|-----------|----------|
| **Free tier** | YES — full POS + online store + email notifications | NO — from $89/mo | NO — from ~US$39/mo | YES — tracking only (no card processing) | NO — from $69/mo USD |
| **NZ card processing** | YES — standalone EFTPOS (manual confirm) | YES — integrated | YES — via Stripe | NO — card processing unavailable in NZ | YES — via integrated payments |
| **Xero integration** | YES — $9/mo add-on, native | YES — included (mixed reviews) | Via third-party connector (~NZ$20/mo extra) | NOT available for NZ | YES — included free |
| **GST 15% (NZ)** | YES — IRD-compliant per-line rounding | YES | YES — requires configuration | YES — requires configuration | YES |
| **Gift cards (NZ 3-yr expiry)** | YES — $14/mo, DB-enforced NZ compliance | YES — included | YES — included, compliance manual | YES — free but no auto NZ expiry enforcement | YES — included |
| **Loyalty points** | YES — $15/mo, built on existing customer accounts | YES — included | NOT native (third-party app ~US$49/mo) | YES — A$49/mo (~NZD $85/mo) | YES — included |
| **COGS / margin reports** | YES — $9/mo add-on | YES — Core plan ($149/mo) | Gated behind POS Pro (US$89/mo) | Gated behind Plus tier (A$109/mo) | YES — Plus plan ($119/mo USD) |
| **Online store** | YES — included free | YES — Core plan+ | YES — Shopify's core product | YES — included | YES — Plus plan+ |
| **Click-and-collect** | YES — included free | YES — included | Gated behind POS Pro | YES — included | YES — included |
| **Offline mode** | NO | YES — limited | NO | NO | YES |
| **Max monthly cost** | $56/mo (all 5 add-ons) | $149–289/mo | $300+/mo (base + POS Pro + Xero + loyalty) | Not viable as primary NZ POS | $119/mo USD |
| **NZ Privacy Act 2025 compliance** | YES — loyalty consent built in | Not documented | Not documented | Not documented | Not documented |

**Notes for comparison page copy:**
- Square's "NO" for NZ card processing is a significant factual differentiator. Cite: Square Community forum confirmation.
- Shopify Xero connector cost: NZ$20/mo via CarryTheOne app (confirmed on Xero App Store NZ).
- Square Loyalty pricing: A$49/mo confirmed on AU Square pricing page.
- Lightspeed pricing in USD: $89/$149/$289/mo (annual). NZD equivalent approximately 1.7× at current rates (~NZD $155–505/mo).
- Competitor pricing should be noted as approximate with last-verified date. All are subject to change.

---

## SEO & Page Structure Patterns

### Comparison Page URL

Recommended: `/compare` (single page for v8.1)

Future expansion: `/compare/nzpos-vs-lightspeed`, `/compare/nzpos-vs-shopify`, etc.

Do NOT use: `/alternatives/` (implies you are the alternative; NZPOS should be positioned as the primary recommendation)

### Page Structure (Comparison Page)

1. **H1** — "NZPOS vs [Lightspeed / Shopify / Square]: NZ Retail POS Compared" (or variant)
2. **Above-fold bias disclosure** — Short sentence: "This comparison is written by NZPOS. We've aimed to be accurate — competitor details last verified [date]."
3. **Quick verdict** — 3-bullet summary of where NZPOS wins
4. **Feature comparison table** — 8-10 rows, 5 columns (NZPOS + 4 competitors). Checkmarks + contextual notes, not just ticks.
5. **Detailed callouts (3-5)** — Narrative sections on key differentiators: pricing model, NZ GST compliance, NZ gift card law, Square's NZ limitations, Xero integration cost
6. **"Who should choose each"** — Brief paragraph per competitor: "Choose Lightspeed if you need offline mode and multi-location today." Builds credibility, helps buyers self-qualify.
7. **FAQ accordion** — 4-6 questions: "Does Square work in NZ?", "Is Xero included?", "What's the minimum cost?", "Do I need a contract?"
8. **Final CTA** — High-contrast section: "Start free. Add what you need." → Sign up button + Try demo link

### Add-On Detail Page Structure (x3 new pages)

Each page mirrors the existing Xero and Inventory detail page format:
1. Hero — Feature name, one-line value prop, price ($X/mo), CTA
2. What it does — 3-4 bullet feature list
3. NZ compliance callout (where relevant — Gift Cards, Loyalty)
4. Screenshot or UI illustration placeholder
5. How it works — numbered steps (enable in billing → configure → use at POS/storefront)
6. "Works with" — note that the add-on integrates with existing free features
7. FAQ — 3-4 questions specific to the feature
8. CTA — "Enable [Add-On] — $X/mo"

---

## Sources

- Lightspeed Retail pricing (official, verified 2026-04-07): https://www.lightspeedhq.com/pos/retail/pricing/
- Lightspeed Xero integration: https://www.lightspeedhq.com/lightspeed-xero/
- Square AU pricing (closest proxy for NZ market): https://squareup.com/au/en/point-of-sale/retail/pricing
- Square NZ card processing not available (community confirmation): https://community.squareup.com/t5/General-Discussion/Is-Square-available-in-New-Zealand/td-p/72331
- Square + Xero NZ unavailability: https://central.xero.com/s/article/Square
- Shopify POS NZ pricing: https://www.shopify.com/nz/pos/pricing
- Shopify Xero connector (CarryTheOne, NZ$20/mo): https://apps.xero.com/nz/app/shopify
- Hike POS pricing (USD): https://hikeup.com/nz/pricing/ (confirmed via SoftwareConnect, G2)
- Hike Xero integration: https://apps.xero.com/nz/app/hike-pos
- B2B SaaS comparison page guide: https://backstageseo.com/blog/b2b-comparison-pages/
- SaaS comparison pages for SEO: https://piperocket.digital/blogs/how-to-write-saas-comparison-pages-for-seo/
- Best SaaS comparison page examples: https://www.poweredbysearch.com/learn/best-saas-comparison-pages/
- POSbiz (hospitality-only, not retail): https://www.posbiz.co.nz/pricing
- Xero App Store NZ — POS integrations: https://apps.xero.com/nz/function/point-of-sale

---

*Feature research for: NZPOS v8.1 Marketing Refresh & Compare Page*
*Researched: 2026-04-07*
