# Feature Landscape

**Domain:** NZ retail POS system (iPad in-store + online storefront + admin)
**Researched:** 2026-04-01
**Confidence note:** WebSearch and WebFetch were unavailable. All findings are from training knowledge (cutoff August 2025) covering NZ POS market, IRD GST rules, EFTPOS conventions, Xero API, and competitive analysis of Square NZ, Lightspeed/Vend, POSbiz, and Shopify POS. Confidence levels reflect this. Live verification recommended for NZ compliance specifics before shipping.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or legally non-compliant.

| Feature | Why Expected | Complexity | NZ-Specific | Notes |
|---------|--------------|------------|-------------|-------|
| Product catalog with SKUs | Every POS has this | Low | No | Categories, names, prices, stock count |
| GST-inclusive pricing display | IRD requirement; NZ prices are always quoted GST-inclusive by convention | Med | YES | 15% GST. Display inc-GST price, show GST amount on receipt. Per-line calculation on discounts. |
| EFTPOS recording (manual) | ~85% of NZ in-store transactions are EFTPOS/card. Cash is secondary. | Low | YES | Standalone terminal is standard for small retail. Confirmation step ("terminal approved?") prevents phantom sales. |
| Cash recording with change calculation | Users expect this even if EFTPOS dominates | Low | No | Change due display. Cash drawer open signal is v1.1. |
| Cart / checkout flow | Core POS loop | Low | No | Add items, adjust qty, remove. Subtotal + GST + total. |
| Discounts | Stores always offer discounts | Med | YES | Per-line discount affects GST calculation. Need IRD-compliant per-line rounding. |
| Refunds | Legally required consumer guarantee | Med | No | Full refund minimum. Partial refund is differentiator. Must reverse inventory. |
| Inventory / stock tracking | Overselling destroys trust | Med | No | Atomic decrement. Shared between POS + online. Low stock alerts. |
| Online storefront | Expected for any modern retailer | High | No | Product grid, cart, checkout. Stripe for card payments. |
| Stripe checkout (online) | Standard for NZ e-commerce | Med | No | NZD currency. GST handling in Stripe metadata. |
| Order management (online orders) | Operators need to see and fulfill orders | Med | No | Status lifecycle. Click-and-collect workflow. |
| Basic sales reporting | Owner needs to understand business | Med | No | Daily sales, top products. Needed for cash-up. |
| End-of-day cash reconciliation | Standard NZ retail practice | Med | YES | Float in/out, expected vs actual cash, EFTPOS total. Required for daily banking. |
| Staff PIN login | Multi-staff stores need role separation | Low | No | Staff PIN with lockout. Prevents unauthorized access without email/password friction. |
| Tax receipts / invoices | IRD requirement for GST-registered businesses | Med | YES | Must show: GST number, GST amount, per-line prices, total. Required for B2B customers claiming GST. |
| Promo codes | Expected by online shoppers | Med | No | Percentage or fixed discount. Expiry. Usage limits are differentiator. |
| Product images | Expected by online storefront users | Low | No | Upload + display. Low effort, high trust signal. |
| CSV product import | Operators with existing catalogs won't hand-enter 100+ products | Med | No | Validates SKU, price, category. Error reporting on bad rows. |
| Multi-tenant data isolation | Not visible to users but table stakes for SaaS | Low | No | store_id on all rows. Required before onboarding second customer. |

---

## Differentiators

Features that set this product apart from Square/Lightspeed/Vend for the NZ small business market. Not expected by default, but highly valued.

| Feature | Value Proposition | Complexity | NZ-Specific | Notes |
|---------|-------------------|------------|-------------|-------|
| Xero integration (OAuth, daily sync) | 75%+ of NZ small businesses use Xero for accounting. Avoiding double-entry is genuine pain. Competitors charge extra or lack GST-aware sync. | High | YES | Daily sales journal with GST breakdown. OAuth flow. Map POS categories to Xero accounts. This is the biggest NZ differentiator. |
| Click-and-collect status workflow | Common in NZ retail, especially post-COVID. Most basic POS systems don't model this well. | Med | No | PENDING_PICKUP -> READY -> COLLECTED. Staff marks ready; customer notified (email is v1.1). POS operator marks collected. |
| Unified inventory (online + in-store) | Most small retailers run separate systems or accept overselling. Atomic shared inventory is genuinely hard and genuinely valuable. | High | No | The core value prop. Refresh-on-transaction keeps it self-healing. |
| Per-line GST on discounted items | Competitors often round GST on the order total, which can fail IRD audit for GST-registered customers. Correct per-line rounding is a trust signal for accountants. | Med | YES | IRD-compliant. Competitors (especially generic international POS) frequently get this wrong for NZ. |
| iPad-native checkout UX | Square is the benchmark but locks into Square hardware. A custom iPad POS with same UX and no hardware lock-in is compelling. | High | No | Product grid layout, large touch targets, fast cart ops. Performance matters — slow POS in a queue is user-hostile. |
| Owner dashboard (admin) | Many POS solutions are terminal-only. A clean web admin for catalog, orders, and reports means no separate tool for common tasks. | Med | No | Next.js admin routes. Owner-only role access. |
| Custom branding on storefront | Square/Lightspeed online stores look like Square/Lightspeed. Custom domain + full brand control is meaningful for established stores. | Low | No | Theming via design system. Custom domain is v1.1 (DNS config). |
| Multi-tenant SaaS architecture from day 1 | Most custom POS builds are single-tenant. store_id isolation means the system can be sold to other NZ retailers without a rewrite. | Low | No | Already planned. Low incremental cost in v1. |

---

## Anti-Features

Features to explicitly NOT build in v1. Each has a reason and a "what to do instead" note.

| Anti-Feature | Why Avoid | What to Do Instead | Deferral Target |
|--------------|-----------|-------------------|-----------------|
| Offline mode | Requires local-first architecture (PouchDB/SQLite sync, conflict resolution). Doubles complexity of every data operation. High failure surface. | Document "internet required" prominently. Use refresh-on-transaction for resilience. | v2 |
| Integrated EFTPOS terminal (software) | NZ EFTPOS integration requires Verifone/Worldline SDK agreements, certification, and hardware. Months of effort, not weeks. Manual confirmation step is a sound proxy. | EFTPOS confirmation dialog ("Terminal approved? Yes / No"). Prevents phantom sales without integration overhead. | v1.1 |
| Barcode scanning | html5-qrcode works but camera-based scanning is unreliable under variable retail lighting. Bluetooth scanner requires Web Bluetooth or USB HID driver work. | SKU search / product grid tap. Add barcode field to product for v1.1. | v1.1 |
| Receipt printing (thermal) | ESC/POS over USB/Bluetooth requires browser-level printer access. Star/Epson SDKs add dependency weight. Non-trivial per-OS testing. | Email receipt (v1.1). Digital receipt via order URL. | v1.1 |
| Email receipts / notifications | Requires transactional email setup (Resend/Postmark), template design, bounce handling. Not blocking for v1 supplies store. | Print-to-PDF from browser for receipts. Order status visible in storefront. | v1.1 |
| Loyalty / points program | Complex state machine, expiry logic, redemption edge cases. The supplies store doesn't need it. Adds perceived bloat for simple retail. | Promo codes cover the "reward a customer" use case sufficiently. | v2 |
| Lay-by management | NZ-specific payment plan feature. Complex order lifecycle (deposits, installments, completion, cancellation). Not needed for supplies store. | Standard sale. If needed, use a separate lay-by notebook convention. | v2 |
| Delivery / shipping | Carrier integrations (NZ Post, CourierPost) require live rate APIs, label printing, tracking. Click-and-collect covers the online fulfillment use case for this store. | Click-and-collect workflow. | v2 |
| Advanced analytics / charts | Charting libraries (Recharts, Tremor) add bundle weight. Business intelligence is premature until basic reporting is validated. | Simple tabular reports: daily sales, top products, stock levels. Sufficient for v1. | v2 |
| Multi-store management UI | store_id is in the schema for future expansion but a store-switching UI requires auth scoping, report aggregation, and staff-store assignment. | Single store in v1. Multi-tenant schema is the foundation; UI is separate work. | v2 |
| Supplier purchase orders | Inventory replenishment workflow (PO -> receive stock -> update levels). Meaningful for high-SKU operations, premature for v1. | Manual stock adjustments. CSV re-import on restock. | v2 |
| Staff performance / commission | Sales attribution per staff adds complexity to every transaction. Not needed for small team. | Basic per-day sales report. Staff commissions are a separate business concern. | v2 |
| Fractional / weight-based quantities | Delis, butchers, and fresh produce need variable-weight items. Complex price calculation, scale integration. Not relevant for supplies store. | Integer quantities only in v1. | If ever |
| Split payments (card + cash on one sale) | Edge case. Adds significant checkout flow branching. "Exact change" is the practical workaround. | Single payment method per sale. | v2 |
| Customer account management | CRM-lite: customer profiles, purchase history, saved addresses. Valuable for repeat business but adds data model complexity and privacy obligations under NZ Privacy Act. | Guest checkout. Email receipt (v1.1) is lighter touch. | v2 |
| Gift cards | Liability tracking, redemption state, expiry rules. Disproportionate complexity for v1. | Promo codes with single-use flag cover the "give someone credit" case approximately. | v2 |

---

## Feature Dependencies

```
Online storefront
  → Stripe checkout (online payments)
  → Shared inventory (atomic decrement)
  → Click-and-collect workflow (order fulfillment)
  → Promo codes (discount application at checkout)

GST handling (correct)
  → Per-line rounding on discounts
  → Tax receipt / invoice display
  → Xero sync (GST breakdown in journal)
  → Cash reconciliation (EFTPOS + cash totals with GST split)

EFTPOS recording
  → EFTPOS confirmation step (anti-phantom-sale)
  → Cash reconciliation (EFTPOS total feeds daily report)

Staff PIN login
  → Role-based access (staff vs owner permissions)
  → Admin dashboard (owner-only routes)

Inventory / stock tracking
  → Low stock alerts (threshold-based trigger)
  → Shared inventory between POS + online (requires atomic ops)
  → CSV product import (bulk load into catalog)

Xero integration
  → Daily sales sync (requires end-of-day report data)
  → GST breakdown (requires correct per-line GST calculation upstream)
  → OAuth flow (requires owner account setup)

Multi-tenant model
  → All features (store_id on every table, every query)
```

---

## MVP Recommendation

For the founder's supplies store as first customer, prioritize in this order:

**Must ship for v1 launch:**
1. Product catalog (categories, SKUs, images, stock)
2. POS checkout — cart, EFTPOS/cash recording, EFTPOS confirmation step
3. GST-inclusive pricing + per-line rounding
4. Basic tax receipt display (on-screen, printable via browser)
5. Shared inventory with atomic decrement
6. Online storefront with Stripe checkout + promo codes
7. Click-and-collect order workflow
8. Staff PIN login + owner email auth
9. End-of-day cash reconciliation report
10. Refunds (full refund minimum)
11. Low stock alerts
12. CSV product import
13. Basic reporting (daily sales, top products, stock levels)
14. Xero integration (OAuth + daily sync with GST breakdown)
15. Multi-tenant store_id throughout

**Explicitly defer (documented above as anti-features or Out of Scope):**
- Offline mode
- Integrated EFTPOS terminal
- Barcode scanning, receipt printing, email receipts
- Loyalty, lay-by, delivery, advanced analytics, multi-store UI

---

## NZ-Specific Compliance Notes

HIGH confidence (IRD rules are well-established):

1. **GST rate:** 15%. Has been 15% since 2010. Extremely unlikely to change.
2. **Tax-inclusive pricing:** NZ consumer law requires GST-inclusive prices to be displayed. Do not display ex-GST to consumers.
3. **Tax invoice requirements (IRD):** For sales over NZD $50 where the customer is GST-registered, a tax invoice must show: supplier name + GST number, date, description of goods, quantity, unit price, total (inc GST), GST amount. For sales under $50 a simplified invoice is sufficient (total inc GST, GST content statement).
4. **GST calculation method:** NZ uses the "tax-inclusive" method. GST component = total / 11 (i.e., 15/115). Per-line calculation then sum is IRD-preferred for accuracy.
5. **EFTPOS in NZ:** EFTPOS (Electronic Funds Transfer at Point of Sale) is the dominant NZ debit network, distinct from international schemes. Operated via Verifone/Ingenico/Worldline terminals on the Paymark/Worldline NZ network. Software integration requires certification. Standalone terminal + manual confirmation is the correct v1 approach.
6. **NZD currency:** Two decimal places. No currency conversion complexity. Stripe NZD support is production-ready.
7. **Xero:** Dominant NZ accounting platform (75%+ SMB market share by most estimates). IRD-compatible GST returns. Xero API is mature and well-documented. OAuth 2.0. Daily sales journal ("manual journal" or "invoice batch") is the standard integration pattern for POS sync.
8. **NZ Privacy Act 2020:** If storing customer data (names, emails for click-and-collect), operator must have a privacy policy and handle data subject requests. Guest checkout minimises this obligation in v1.

---

## Competitive Landscape (Training Knowledge, MEDIUM confidence)

| Product | NZ Market Position | Key Strengths | Key Weaknesses vs This Build |
|---------|-------------------|---------------|------------------------------|
| Square NZ | Mass market, free tier | Hardware + software bundle, brand recognition, EFTPOS integration | Hardware lock-in, limited Xero sync, US-centric GST handling |
| Lightspeed / Vend | Mid-market retail | Strong inventory, good NZ customer base (Vend founded in NZ) | Expensive (NZD 100-300/mo), complex for small stores, overkill features |
| POSbiz | NZ-specific SMB | NZ-built, understands local requirements | Dated UI, limited online storefront capability |
| Shopify POS | E-commerce-first | Best online storefront | Hardware dependency, Shopify ecosystem lock-in, AU/US GST assumptions |
| Kounta / Lightspeed Restaurant | Hospitality | Strong for cafes/restaurants | Not retail-focused |

**This build's position:** Cheaper than Lightspeed, NZ-compliant unlike generic international tools, unified inventory unlike POSbiz, no hardware lock-in unlike Square, full code ownership unlike all.

---

## Sources

- IRD GST rules: training knowledge (HIGH confidence for 15% rate and tax invoice requirements — rules stable since 2010)
- NZ EFTPOS/Paymark network: training knowledge (HIGH confidence for standalone terminal pattern; MEDIUM for integration requirements)
- Xero market share in NZ: training knowledge (MEDIUM — frequently cited 70-75% figure in NZ accounting press as of 2024-2025)
- Square NZ, Lightspeed, Vend, POSbiz feature sets: training knowledge (MEDIUM — features as of mid-2025; verify competitor pages before sales/marketing claims)
- NZ Privacy Act 2020: training knowledge (HIGH — legislation is public record)
- WebSearch / WebFetch: UNAVAILABLE for this research session — all findings from training data only
- **Verification recommended:** IRD tax invoice thresholds (NZD 50 simplified invoice threshold), current Xero API OAuth 2.0 scopes for journal entry, Paymark/Worldline NZ integration certification process
