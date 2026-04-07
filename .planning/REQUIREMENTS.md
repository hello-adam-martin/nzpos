# Requirements: NZPOS

**Defined:** 2026-04-07
**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## v8.1 Requirements

Requirements for milestone v8.1: Marketing Refresh & Compare Page. Each maps to roadmap phases.

### Marketing Pages

- [ ] **MKTG-01**: Visitor can view a dedicated Gift Cards add-on detail page at `/add-ons/gift-cards`
- [ ] **MKTG-02**: Visitor can view a dedicated Advanced Reporting add-on detail page at `/add-ons/advanced-reporting`
- [ ] **MKTG-03**: Visitor can view a dedicated Loyalty Points add-on detail page at `/add-ons/loyalty-points`
- [ ] **MKTG-04**: Visitor sees all 5 paid add-ons in the landing page pricing section with correct prices
- [ ] **MKTG-05**: Visitor sees all 5 add-ons referenced in the landing page hero and features sections
- [ ] **MKTG-06**: Visitor can navigate to all 5 add-on detail pages from the add-ons catalog page

### Comparison Page

- [ ] **COMP-01**: Visitor can view a comparison page at `/compare` with a feature matrix comparing NZPOS against NZ POS competitors
- [ ] **COMP-02**: Visitor sees competitor pricing with "last verified" date disclaimer for NZ Fair Trading Act compliance
- [ ] **COMP-03**: Visitor can read a "Why NZPOS" narrative section highlighting key differentiators
- [ ] **COMP-04**: Visitor can expand/collapse FAQ items answering common comparison questions
- [ ] **COMP-05**: Visitor sees multiple CTA buttons throughout the comparison page linking to signup

### Navigation & SEO

- [ ] **NAV-01**: Visitor can navigate to the comparison page from the landing page nav bar (desktop and mobile)
- [ ] **NAV-02**: All new pages have appropriate meta tags (title, description, Open Graph)
- [ ] **NAV-03**: Comparison page and add-on detail pages include JSON-LD structured data (SoftwareApplication schema)
- [ ] **NAV-04**: Footer includes links to comparison page and all add-on detail pages

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Marketing Enhancements

- **MKTG-F01**: Scroll-triggered entrance animations on marketing pages
- **MKTG-F02**: Customer testimonial sections with real merchant quotes
- **MKTG-F03**: Individual competitor vs pages (e.g., `/compare/nzpos-vs-lightspeed`)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| CMS for marketing content | Static TypeScript data file is sufficient for comparison data; CMS adds complexity for no benefit at this scale |
| Competitor logo usage | Legal risk with trademark usage; text-only names are safer and faster to update |
| Scroll animations (motion library) | CSS transitions sufficient for v8.1; evaluate after design spec confirms need |
| Individual vs pages per competitor | Start with unified `/compare` page; expand after traffic data validates which comparisons drive conversions |
| A/B testing infrastructure | Premature; ship one version, iterate based on analytics |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MKTG-01 | TBD | Pending |
| MKTG-02 | TBD | Pending |
| MKTG-03 | TBD | Pending |
| MKTG-04 | TBD | Pending |
| MKTG-05 | TBD | Pending |
| MKTG-06 | TBD | Pending |
| COMP-01 | TBD | Pending |
| COMP-02 | TBD | Pending |
| COMP-03 | TBD | Pending |
| COMP-04 | TBD | Pending |
| COMP-05 | TBD | Pending |
| NAV-01 | TBD | Pending |
| NAV-02 | TBD | Pending |
| NAV-03 | TBD | Pending |
| NAV-04 | TBD | Pending |

**Coverage:**
- v8.1 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after initial definition*
