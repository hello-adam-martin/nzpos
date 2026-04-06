# Feature Research

**Domain:** NZ Small Retail POS — Paid Add-On Catalog Expansion (v8.0)
**Researched:** 2026-04-06
**Confidence:** MEDIUM (competitor pricing verified via official pages; NZ-specific willingness-to-pay estimated from market proxies, not direct survey data)

---

## Context: What This Research Covers

This file answers: "What new paid add-ons would NZ small retail merchants pay $5–29/month for?" It is scoped to the v8.0 milestone and does NOT cover features already shipped (POS checkout, inventory management, Xero integration, email notifications, staff RBAC, click-and-collect, promo codes, customer accounts — all shipped through v7.0).

**Existing paid add-ons (already live):**
- Xero Integration — $9/mo
- Inventory Management — $9/mo

**Free baseline (already live):**
- POS checkout, online storefront, email notifications, barcode scanning, basic reporting, staff RBAC (owner/manager/staff), customer accounts, promo codes, click-and-collect, CSV import

---

## Competitor Add-On Landscape

### Square (AU/NZ)

Square uses a freemium + transaction fee model. Paid add-ons in AU/NZ:

| Add-On | AU/NZ Pricing | What It Does |
|--------|--------------|--------------|
| Square Loyalty | A$49/mo (0–500 visits), scales up | Points-per-purchase, digital loyalty card, auto-rewards |
| Square Marketing (Email) | Included in Square Plus (A$109/mo/location) | Email campaigns to customer list |
| Square Appointments Free | $0 (1 staff) | Online booking, calendar, reminders |
| Square Appointments Plus | A$40/mo/location | Multi-staff, classes, Google Calendar sync, waitlist |
| Square Retail Plus | A$109/mo/location | COGS reporting, advanced inventory, barcode printing |

Key insight: Square charges separately for loyalty (~$49/mo) and bundles email marketing into a higher plan tier.

### Lightspeed / Vend (NZ)

Lightspeed includes loyalty, advanced reporting, eCommerce, and multi-location in all plans (Basic $89/mo, Core $149/mo, Plus $289/mo). No granular add-ons at the sub-$30 level — they charge for the whole platform. Vend was the dominant NZ retail POS before Lightspeed acquisition.

Key insight: Lightspeed competes on bundles, not micro add-ons. This creates an opportunity for per-feature pricing at $9–19/mo.

### Shopify POS (NZ)

| Tier | Price | What's Gated |
|------|-------|-------------|
| POS Lite | Free (with Shopify plan) | Basic checkout, returns |
| POS Pro | US$89/mo/location (~NZ$150) | Staff roles, advanced inventory, omnichannel (BOPIS, ship-from-store), spend-threshold discounts |

Key insight: Shopify gates omnichannel features (buy online, pick up in-store) behind a high-price add-on. NZPOS already ships click-and-collect free.

### Marsello (NZ-founded, used by NZ retailers)

| Plan | Price | What's Included |
|------|-------|----------------|
| Loyalty Launch | NZ$100/mo | Points, referrals, automations (25k orders/mo) |
| Loyalty Accelerate | NZ$200/mo | VIP tiers, custom segmentation, API |
| Marketing add-on | From US$15/1,000 customers | Email campaigns |
| SMS add-on | US$0.017/credit | SMS to customers |

Key insight: Loyalty at NZ$100/mo is the market rate for a standalone loyalty product. NZPOS could offer a simpler version at $15–19/mo and win on price for small stores.

### NRS Advanced Data (US, reference only)

$14.95/mo add-on for analytics (profit reports, item sales breakdown, COGS). Shows that $15/mo is an acceptable price point for reporting add-ons even in price-sensitive markets.

---

## NZ Market Specifics

**Gift cards:** As of March 16, 2026, NZ law (Fair Trading Amendment) requires eligible gift cards to expire no less than 3 years from date of sale, with expiry date displayed on the card. Non-compliance risks fines up to NZ$30,000 for organisations. Any gift card feature must generate expiry dates 3+ years out and display them on digital gift cards.

**GST on gift cards:** GST is not recognised at gift card purchase time — it is deferred to the point of redemption (when the card is used for goods/services). This means a gift card feature needs to handle deferred GST liability carefully (record the liability on sale, recognise GST only on redemption). This is a meaningful complexity differentiator for NZ vs generic POS systems.

**Xero dominance:** ~75% of NZ small businesses use Xero. Already integrated. Any add-on that produces financial data (gift card liability, loyalty points liability) may need Xero sync — but this is v2 complexity, not v1.

**EFTPOS:** Standalone physical terminals (Windcave, Verifone) are the norm. No NFC-integrated POS in v1. Any add-on requiring EFTPOS integration (e.g., gift card tap-to-redeem) must account for manual redemption flow.

**SMS costs in NZ:** NZ short codes cost NZ$275/mo to lease — prohibitive for a small-biz add-on. SMS marketing is not a viable native add-on at $9–19/mo; better to integrate with an existing provider (Twilio, ClickSend) and pass through costs.

---

## Feature Landscape

### Table Stakes for Add-On Catalog (Must Offer to Compete)

Features that competing platforms charge for and NZ merchants will expect to find as upgrade options.

| Feature | Why Expected | Complexity | Est. Price Point | Notes |
|---------|--------------|------------|-----------------|-------|
| Gift Cards (digital) | Square, Shopify, Lightspeed all offer this; NZ law now mandates 3-year expiry compliance | MEDIUM | $9–14/mo | Requires: issue card (generate unique code), sell card as product, redeem at POS/storefront, track balance. NZ compliance: 3-year expiry, expiry date on card. GST deferred to redemption — must record liability. |
| Customer Loyalty (points) | Every competitor charges for this; Marsello charges NZ$100+/mo — strong price gap opportunity | MEDIUM | $15–19/mo | Points-per-dollar-spent, redemption at POS checkout, simple balance display. No VIP tiers or SMS for v1. |
| Advanced Reporting (COGS + margin) | Square gates COGS reports behind Plus ($109/mo); NRS charges $15/mo. Merchants need margin data to buy well | MEDIUM | $9–14/mo | Requires: cost_price column on products, profit margin per-product, COGS report by period. Hook into existing orders+line_items schema. |
| Purchase Orders / Supplier Reorder | Lightspeed, Shopify POS Stocky app, AdvanceRetail all offer PO management. Merchants at a supplies store reorder frequently | HIGH | $9–14/mo | Create PO, send to supplier (PDF/email), receive stock (auto-increment inventory). Depends on Inventory Management add-on. |

### Differentiators (Strong Opportunity, Not Yet Commoditised)

Features where NZ-specific context or price advantage creates real differentiation.

| Feature | Value Proposition | Complexity | Est. Price Point | Notes |
|---------|-------------------|------------|-----------------|-------|
| Gift Cards with NZ GST Compliance | Generic gift card apps don't handle NZ deferred-GST liability correctly. NZPOS already handles GST per-line — gift card deferred GST is a natural extension | MEDIUM | $14/mo | Deferred GST journal: credit gift_card_liability, debit when redeemed. Correct Xero sync if they have Xero add-on. This is a genuine NZ differentiator. |
| Loyalty Integrated with Existing Customer Accounts | Marsello and Square require separate loyalty signup. NZPOS customers already have accounts — loyalty points add to existing profiles with zero friction | MEDIUM | $15/mo | Points attached to `customers` table. No new auth needed. In-store: staff looks up customer by name/email at POS. Online: auto-applied at checkout. |
| Printed/Email Receipt with QR Loyalty Balance | Customers can check their points balance via QR on receipt — no app required | LOW | Bundled with loyalty | QR links to a public `/loyalty/[customer_id]` page showing balance. No app install. NZ merchants like low-tech solutions. |
| Cost Price Tracking for Supplies Businesses | A supplies store (the founder's own use case) buys at wholesale and needs margin visibility per SKU. Lightspeed includes this but charges NZ$89–289/mo | MEDIUM | $9/mo | Add `cost_price_cents` to products table. Show margin% on product admin, in reports. Existing orders already have unit_price — margin is `(unit_price - cost_price) / unit_price`. |

### Anti-Features (Frequently Requested, Wrong for This Platform)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| SMS Marketing add-on | Competitors offer it; merchants want to text customers | NZ short codes cost NZ$275/mo to lease — completely uneconomical at $9–19/mo price point. Twilio pass-through costs at NZ retail volume (~500 customers) would exceed the add-on price | Integrate email marketing (free tier email already exists). Flag SMS as future if merchant count grows to subsidise short-code cost. |
| Booking / Appointments add-on | Cafes and boutiques ask for appointment features | Outside scope of retail POS. Square Appointments is a separate product. Most NZ service businesses use Calendly, SimplyBook.me, or Google Calendar (all free or cheap). Building a booking engine from scratch is 2-3x the complexity of any other add-on | Recommend third-party integration or explicitly out-of-scope. |
| Loyalty with tiered VIP status (Bronze/Silver/Gold) | Sounds valuable; Marsello's "Loyalty Accelerate" charges NZ$200/mo for it | Tier logic requires segment migration rules, retroactive recalculation, edge cases on point expiry, and customer-visible messaging. For NZ micro-retailers with 200–500 regular customers, VIP tiers add zero behaviour change | Start with flat points rate. Add tiers in v2 if merchants request it post-launch. |
| Multi-channel email campaigns (CRM blast) | Merchants want to email their whole customer list | Email deliverability is a profession. SPAM compliance, unsubscribe management (NZ Unsolicited Electronic Messages Act 2007), bounce handling, and reputation management are separate SaaS concerns | Use Mailchimp/Klaviyo integration rather than building an email platform. Out of scope for v8.0. |
| Physical gift card printing integration | "Can I print gift cards like Myer?" | Requires physical card vendor (US-based for AU/NZ), MOQ of 100–500 cards, per-design setup fee. Completely out of scope for a SaaS add-on | Digital gift codes only — customers receive a unique code by email. |
| Windcave / EFTPOS terminal integration for gift card tap | "Customers want to tap their gift card like a credit card" | Windcave integration is explicitly deferred to v1.1 in PROJECT.md. Terminal SDK provisioning is complex hardware integration. NFC gift cards require physical card printing | Digital gift codes redeemed manually by reading a code to the cashier or scanning. Use barcode/QR on digital card. |
| Offline mode for any add-on | "What if internet goes down?" | Offline mode requires local-first architecture (explicitly ruled out in PROJECT.md). No add-on should change this constraint | Document internet requirement clearly. For NZ retail, broadband reliability is sufficient for single-terminal stores. |

---

## Feature Dependencies

```
[Gift Cards add-on]
    └──requires──> [products table — new "gift_card" product_type]
    └──requires──> [gift_cards table — code, balance, issued_at, expires_at, redeemed_by]
    └──requires──> [POS redemption flow — apply gift card code before cash/EFTPOS]
    └──requires──> [Storefront purchase flow — sell gift card as product]
    └──requires──> [Email delivery — send code to recipient (already free)]
    └──requires──> [NZ compliance: 3-year expiry auto-set on issue]
    └──optionally──> [Xero sync — deferred GST liability journal if merchant has Xero add-on]
    └──conflicts──> [Offline mode — gift card balances require DB lookup]

[Loyalty Points add-on]
    └──requires──> [customers table — ALREADY EXISTS (v2.0)]
    └──requires──> [loyalty_points table — customer_id, store_id, points_balance, transactions log]
    └──requires──> [POS checkout — "look up customer" step before completing sale]
    └──requires──> [Storefront checkout — auto-apply points if customer logged in]
    └──enhances──> [Customer accounts — points balance shown on customer profile page]
    └──optionally──> [Gift Cards — points could be redeemed for store credit/gift card]

[Advanced Reporting / COGS add-on]
    └──requires──> [products table — new cost_price_cents column]
    └──requires──> [order_items table — ALREADY EXISTS (unit_price, quantity)]
    └──requires──> [Inventory Management add-on — ALREADY EXISTS — for stock-on-hand valuation]
    └──enhances──> [Admin dashboard — margin% overlay on existing charts]

[Purchase Orders add-on]
    └──requires──> [Inventory Management add-on — ALREADY EXISTS — for stock increment on receive]
    └──requires──> [suppliers table — name, email, phone]
    └──requires──> [purchase_orders table — supplier_id, status, line items]
    └──requires──> [purchase_order_items table — product_id, quantity_ordered, cost_price]
    └──requires──> [receive PO flow — mark as received, increment stock via adjust_stock RPC]
    └──enhances──> [Advanced Reporting — cost of goods auto-populated from PO receive events]
```

### Dependency Notes

- **Purchase Orders depends on Inventory Management:** You cannot receive stock against a PO if inventory is not tracked. Feature gating must require `has_inventory` before `has_purchase_orders`.
- **Advanced Reporting benefits from both POs and Inventory:** COGS accuracy improves when cost_price comes from PO receiving rather than manual entry. However, COGS reporting can launch with manual cost_price input — PO integration is an enhancement.
- **Loyalty requires a customer lookup step at POS:** Currently the POS checkout has no "who is the customer?" step for in-store sales. Adding loyalty means adding an optional customer search/select before completing a sale. This is a UX change to the POS flow.
- **Gift cards at POS require a redemption input step:** POS checkout currently accepts cash or EFTPOS. Gift card adds a third payment method path: enter code, validate balance, apply partial or full payment.

---

## MVP Definition (v8.0)

This milestone adds paid add-ons. "MVP" means the smallest set of add-ons that generates meaningful new MRR and validates add-on demand.

### Build First — Highest Value / Best Fit

- [ ] **Gift Cards ($14/mo)** — NZ law change (March 2026) makes this timely. NZPOS already handles GST correctly — deferred GST on gift cards is a natural extension. Low competition at this price point for NZ-compliant digital gift cards. Complexity: MEDIUM.
- [ ] **Advanced Reporting / COGS ($9/mo)** — Already have all the data (orders, line items). Just need cost_price column on products and report generation. Low build complexity, clear merchant value. Complexity: MEDIUM (mostly reporting UI).

### Build Second — Strong Demand, Moderate Complexity

- [ ] **Loyalty Points ($15/mo)** — Demand is high (every competitor charges for it). NZPOS has existing customer accounts, making integration cleaner than standalone loyalty tools. Adds a customer lookup step to POS flow (UX design work needed). Complexity: MEDIUM.

### Defer — High Complexity or Dependency Chain

- [ ] **Purchase Orders ($9/mo)** — High complexity, depends on Inventory Management being adopted first. Build after Loyalty and COGS are live and generating revenue. Target v8.1 or v9.0. Complexity: HIGH.

---

## Feature Prioritization Matrix

| Feature | Merchant Value | Build Cost | Revenue Potential | Priority |
|---------|---------------|------------|------------------|----------|
| Gift Cards (NZ-compliant) | HIGH — timely due to new NZ law | MEDIUM | $14/mo × stores | P1 |
| Advanced Reporting / COGS | HIGH — margin data is universal need | MEDIUM | $9/mo × stores | P1 |
| Loyalty Points | HIGH — every competitor charges for it | MEDIUM | $15/mo × stores | P2 |
| Purchase Orders | MEDIUM — supplies/wholesale focused | HIGH | $9/mo × inventory users only | P3 |

**Priority key:**
- P1: Ship in v8.0
- P2: Ship in v8.1 (after v8.0 validated)
- P3: Future milestone

---

## Competitor Feature Analysis

| Feature | Square AU/NZ | Lightspeed/Vend | Shopify POS | Marsello (NZ) | NZPOS v8.0 Approach |
|---------|-------------|-----------------|-------------|---------------|---------------------|
| Gift cards | A$0 (free, but no deferred GST) | Included in plan | Free with Shopify | Not applicable | $14/mo, NZ-compliant (3-yr expiry, deferred GST) |
| Loyalty | A$49/mo | Included in plan | Not native | NZ$100–200/mo | $15/mo — strong price advantage |
| COGS / margin reports | A$109/mo (Square Plus) | Included in plan | US$89/mo (POS Pro) | Not applicable | $9/mo — differentiated on price |
| Purchase orders | A$109/mo (Square Plus) | Included in plan | Via Stocky app | Not applicable | $9/mo (future, requires Inventory) |
| Email marketing | Included in Square Plus | Included in plan | Via Shopify Email | $15+/1k contacts | Not in v8.0 (free email notifications already exist) |
| SMS marketing | Separate product | Separate product | Via Klaviyo etc. | $0.017/credit | Explicitly not in scope (NZ short-code costs prohibitive) |

---

## Suggested Pricing for v8.0 Add-Ons

| Add-On | Recommended Price | Rationale |
|--------|------------------|-----------|
| Gift Cards | **$14/mo** | Between Square (free but non-compliant) and Lightspeed (bundled at $89+/mo). NZ compliance is the justification for charging. |
| Advanced Reporting | **$9/mo** | Same as existing add-ons. Anchors to established price expectations. $15/mo also viable if COGS + supplier cost import is included. |
| Loyalty Points | **$15/mo** | Dramatically below Marsello NZ$100/mo. Above $9 to signal it's a meaningful feature. Square charges A$49/mo — even $15 is a strong price position. |
| Purchase Orders | **$9/mo** | Bundled with Inventory Management conceptually. Could be $14/mo if standalone. Require Inventory Management as prerequisite. |

---

## Sources

- Square Retail AU pricing (official): https://squareup.com/au/en/point-of-sale/retail/pricing
- Square Loyalty AU pricing: https://squareup.com/help/au/en/article/6382-square-loyalty-pricing
- Square Appointments AU review (2026): https://www.softwarehq.com.au/review/square-appointments
- Lightspeed Retail pricing (official): https://www.lightspeedhq.com/pos/retail/pricing/
- Lightspeed Loyalty overview: https://www.lightspeedhq.com/pos/retail/loyalty/
- Marsello pricing (official, NZD confirmed): https://www.marsello.com/pricing
- Shopify POS Lite vs Pro comparison: https://litextension.com/blog/shopify-pos-lite-vs-pro/
- NZ gift card law change (business.govt.nz): https://www.business.govt.nz/news/gift-card-rules-have-changed
- NRS Advanced Data pricing ($14.95/mo add-on): https://nrsplus.com/advanced-data/
- Top 5 POS systems NZ: https://www.connectpos.com/top-5-pos-systems-in-new-zealand/
- Top 5 POS tools for small Kiwi retailers: https://blog.eftpos.co.nz/blog/top-5-pos-software-tools-for-small-kiwi-retailers
- Shopify NZ: Gift cards for retail: https://www.shopify.com/nz/retail/gift-cards-for-retail
- Shopify NZ: POS loyalty programs: https://www.shopify.com/nz/retail/pos-loyalty-program
- IRD tax treatment of gift cards (April 2025): https://www.affinityaccounting.co.nz/blog/tax-treatment-of-gift-cards-ird-interpretation

---

*Feature research for: NZPOS v8.0 Add-On Catalog Expansion*
*Researched: 2026-04-06*
