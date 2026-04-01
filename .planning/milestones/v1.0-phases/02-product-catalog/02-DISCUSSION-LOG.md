# Phase 2: Product Catalog - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 02-product-catalog
**Areas discussed:** Product list layout, Image upload UX, CSV import workflow, Category management

---

## Product List Layout

### Q1: How should products display in the admin product list?

| Option | Description | Selected |
|--------|-------------|----------|
| Data table (Recommended) | Rows with columns: image thumbnail, name, SKU, price, stock, category, status. Sortable headers, inline search. Best for managing 500+ products efficiently. | ✓ |
| Card grid | Visual cards showing image, name, price, stock. Better for small catalogs (<50). Harder to scan large inventories quickly. | |
| Hybrid: table + card toggle | Default to table view with a toggle to switch to card grid. More code, but gives owner flexibility. | |

**User's choice:** Data table
**Notes:** None

### Q2: What info should show per product row in the list?

| Option | Description | Selected |
|--------|-------------|----------|
| Essential (Recommended) | Thumbnail, Name, SKU, Price (NZD), Stock qty, Category, Active/Inactive status. Clean and scannable. | ✓ |
| Detailed | All essential columns + barcode, reorder threshold, created date, last updated. More info but wider table. | |
| You decide | Claude picks the right columns based on what fits the design system well. | |

**User's choice:** Essential
**Notes:** None

### Q3: How should the owner find products in the list?

| Option | Description | Selected |
|--------|-------------|----------|
| Search + category filter (Recommended) | Text search bar (searches name + SKU) with a category dropdown filter. Simple and covers 90% of use cases. | |
| Search + multiple filters | Text search + category filter + stock status filter (in stock / low / out) + active/inactive filter. More powerful but more UI. | ✓ |
| You decide | Claude picks based on what feels right for a supplies store with ~200 products. | |

**User's choice:** Search + multiple filters
**Notes:** User opted for the more powerful filtering option over the simpler recommendation.

---

## Image Upload UX

### Q1: How many images per product?

| Option | Description | Selected |
|--------|-------------|----------|
| Single image (Recommended) | One hero image per product. Simpler to build, sufficient for a supplies store. | ✓ |
| Multiple images (up to 5) | Gallery per product. Better for products with variants or detail shots. | |
| You decide | Claude picks what makes sense for a supplies store. | |

**User's choice:** Single image
**Notes:** None

### Q2: How should the owner upload a product image?

| Option | Description | Selected |
|--------|-------------|----------|
| Click-to-browse (Recommended) | Simple file picker button with image preview after selection. Works on any device including iPad. | ✓ |
| Drag-and-drop + click | Dropzone area that accepts drag-and-drop OR click-to-browse. Better desktop UX, but less useful on iPad. | |
| You decide | Claude picks based on iPad-first design consideration. | |

**User's choice:** Click-to-browse
**Notes:** None

### Q3: Should uploaded images be auto-resized?

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side resize (Recommended) | Auto-resize to max 800x800px on upload to save storage and improve load times. | ✓ |
| Client-side crop + resize | Show a crop tool before upload so owner can frame the image. Adds cropping library. | |
| No processing | Upload as-is. Simple but could lead to huge files. | |

**User's choice:** Server-side resize
**Notes:** None

---

## CSV Import Workflow

### Q1: How should CSV import handle the preview step?

| Option | Description | Selected |
|--------|-------------|----------|
| Preview table with diff (Recommended) | Parse CSV client-side, show table of rows to import. Highlight duplicates with diff. Owner confirms. | ✓ |
| Summary only | Show counts: X new, Y duplicates, Z errors. No row-by-row preview. | |
| You decide | Claude picks the right balance of visibility vs simplicity. | |

**User's choice:** Preview table with diff
**Notes:** None

### Q2: What should happen with CSV validation errors?

| Option | Description | Selected |
|--------|-------------|----------|
| Import valid, skip invalid (Recommended) | Show errors inline. Owner can proceed with valid rows. Invalid rows in downloadable error report. | ✓ |
| All or nothing | If any row has errors, block the entire import. | |
| You decide | Claude picks error handling approach. | |

**User's choice:** Import valid, skip invalid
**Notes:** None

### Q3: What CSV columns should be supported?

| Option | Description | Selected |
|--------|-------------|----------|
| Match product fields (Recommended) | Fixed column names matching product fields. Template CSV downloadable. | |
| Flexible mapping | Upload any CSV, map columns to product fields with visual column mapper. More flexible. | ✓ |
| You decide | Claude picks approach for supplies store migration. | |

**User's choice:** Flexible mapping
**Notes:** User chose flexible mapping over fixed template — enables importing from any supplier spreadsheet format.

---

## Category Management

### Q1: Where should category management live in the admin UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar on product list (Recommended) | Category list as sidebar panel on product list page. Click to filter, edit via icon. | ✓ |
| Separate settings page | Dedicated /admin/categories page with full CRUD. | |
| Inline on product form | Manage categories from product create/edit form with type-ahead. | |

**User's choice:** Sidebar on product list
**Notes:** None

### Q2: Should categories be flat or nested?

| Option | Description | Selected |
|--------|-------------|----------|
| Flat only (Recommended) | Single level. Matches existing schema. Sufficient for ~10 categories. | ✓ |
| One level of nesting | Categories with optional subcategories. Adds parent_id, tree UI. | |

**User's choice:** Flat only
**Notes:** None

### Q3: How should category reordering work?

| Option | Description | Selected |
|--------|-------------|----------|
| Drag-and-drop (Recommended) | Drag categories to reorder. Uses existing sort_order field. Visual and intuitive. | ✓ |
| Up/down arrows | Arrow buttons to move up/down. Simpler, works well on iPad touch. | |
| You decide | Claude picks what works best for iPad touch interaction. | |

**User's choice:** Drag-and-drop
**Notes:** None

---

## Claude's Discretion

- Product form layout and field arrangement
- Table pagination strategy
- Image placeholder/fallback
- CSV parsing library choice
- Column mapper UI component approach
- Drag-and-drop library choice

## Deferred Ideas

None — discussion stayed within phase scope
