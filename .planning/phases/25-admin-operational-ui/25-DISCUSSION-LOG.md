# Phase 25: Admin Operational UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 25-admin-operational-ui
**Areas discussed:** Customer management UX, Dashboard charts & metrics, Promo edit & soft-delete, Store settings expansion

---

## Customer Management UX

### Customer List Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Table with search bar | Paginated table like staff/products pages. Search bar at top filters by name or email. Columns: name, email, order count, status. Click row to open detail page. | ✓ |
| Card grid with search | Card per customer showing name, email, order count. More visual but less data-dense than table. | |
| You decide | Claude picks the best approach based on existing admin patterns | |

**User's choice:** Table with search bar (Recommended)
**Notes:** Consistent with staff and products table patterns already in admin.

### Customer Detail Page

| Option | Description | Selected |
|--------|-------------|----------|
| Profile header + order history table | Top section with name, email, account status, created date. Below: paginated order history table with order#, date, total, status. Disable button in header. | ✓ |
| Tabbed layout (Profile / Orders) | Separate tabs for profile info and order history. Cleaner separation but adds navigation complexity. | |
| You decide | Claude picks based on data density and existing patterns | |

**User's choice:** Profile header + order history table
**Notes:** Single scrollable page, no tab navigation.

### Customer Disable Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation modal with reason | Click 'Disable' button → modal: 'Disable [Name]? They won't be able to log in to the storefront.' Confirm/Cancel. No reason field — keep it simple. | ✓ |
| Toggle with confirmation | Active/Inactive toggle on detail page with confirmation dialog on disable. Allows easy re-enable. | |
| You decide | Claude picks the simplest safe approach | |

**User's choice:** Confirmation modal with reason (Recommended)
**Notes:** Simple confirmation, no reason field needed.

---

## Dashboard Charts & Metrics

### Chart Style

| Option | Description | Selected |
|--------|-------------|----------|
| Line chart | Line chart with area fill for sales trend. Differentiates from the bar chart already used in reports. Cleaner for showing trends over time. | ✓ |
| Bar chart | Reuse the exact SalesBarChart pattern from reports. Consistent but less visually distinct from the reports page. | |
| You decide | Claude picks what works best for the dashboard context | |

**User's choice:** Line chart (Recommended)
**Notes:** Area fill, distinct from reports bar chart.

### Period Selector

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle: 7 days / 30 days | Simple two-button toggle above the chart. Default to 7 days. Minimal UI, covers the requirement. | ✓ |
| Dropdown with more options | Dropdown: Today, 7 days, 30 days, 90 days. More flexibility but scope creep risk — only 7d/30d required. | |
| You decide | Claude picks the simplest approach matching requirements | |

**User's choice:** Toggle: 7 days / 30 days (Recommended)
**Notes:** None

### Comparison Metrics

| Option | Description | Selected |
|--------|-------------|----------|
| Stat cards with delta badges | Row of cards: Today's Sales (↑ 12% vs yesterday), This Week (↓ 5% vs last week). Green/red arrows. Matches hero card pattern already on dashboard. | ✓ |
| Simple text comparison | Plain text: 'Today: $1,234 (vs $1,100 yesterday)'. Minimal, no badges or colors. | |
| You decide | Claude decides styling based on existing DashboardHeroCard pattern | |

**User's choice:** Stat cards with delta badges (Recommended)
**Notes:** Extends existing DashboardHeroCard pattern.

---

## Promo Edit & Soft-Delete

### Edit Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Edit modal | Click 'Edit' on a promo row → modal pre-filled with current values (discount, min order, max uses, expiry). Same form layout as PromoForm. Consistent with staff edit pattern. | ✓ |
| Inline editing | Click fields directly in the table to edit. More fluid but complex to build and inconsistent with other admin pages. | |
| You decide | Claude picks based on existing modal patterns | |

**User's choice:** Edit modal (Recommended)
**Notes:** Reuses PromoForm layout.

### Soft-Deleted Display

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden by default, 'Show deleted' toggle | Deleted promos disappear from the list. A 'Show deleted' toggle at the top reveals them greyed out with a 'Deleted' badge. Clean default view. | ✓ |
| Always visible with strikethrough | Deleted promos stay in the list with strikethrough text and 'Deleted' badge. No toggle needed but clutters the list. | |
| You decide | Claude picks the cleanest approach | |

**User's choice:** Hidden by default, 'Show deleted' toggle
**Notes:** None

---

## Store Settings Expansion

### Page Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Sections on one page | Single scrollable page with sections: Branding (existing), Business Details (address, phone, IRD/GST), Receipt Customization (header/footer text). Each section has its own Save button. Simple, no tab switching. | ✓ |
| Tabbed sections | Tabs: Branding / Business / Receipt. Each tab is its own form. Cleaner per-section but adds navigation overhead for a small number of fields. | |
| You decide | Claude picks based on the amount of fields and existing patterns | |

**User's choice:** Sections on one page (Recommended)
**Notes:** None

### Receipt Preview

| Option | Description | Selected |
|--------|-------------|----------|
| No preview | Simple text inputs for header and footer. Preview is scope creep — receipt formatting already handled by the receipt generator. Keep settings page simple. | ✓ |
| Basic preview panel | Show a mini receipt preview beside the inputs. Nice UX but adds frontend complexity for a rarely-changed setting. | |
| You decide | Claude picks the simplest approach | |

**User's choice:** No preview (Recommended)
**Notes:** None

---

## Claude's Discretion

- Table column widths and responsive breakpoints
- Recent orders widget exact layout
- Search debounce timing and empty states
- Recharts styling details (follow DESIGN.md)
- Promo soft-delete implementation (is_active vs deleted_at)
- Loading skeleton patterns

## Deferred Ideas

None — discussion stayed within phase scope.
