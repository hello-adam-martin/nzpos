# Phase 31: Marketing Pages - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 31-marketing-pages
**Areas discussed:** Grid layout, Email detail page removal, Free tier checklist, Add-ons hub copy

---

## Grid Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Centered 2-col, max-width constrained | Two cards side-by-side centered with max-width so they don't stretch full page. Clean and balanced. | ✓ |
| Full-width 2-col | Two cards stretch to fill the full container width. Cards become wider than current. | |
| You decide | Claude picks the best layout based on DESIGN.md spacing and existing patterns. | |

**User's choice:** Centered 2-col, max-width constrained
**Notes:** Applies to both landing pricing section and add-ons hub page.

---

## Email Detail Page Removal

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /add-ons hub | 301 redirect to the add-ons hub. Clean for SEO, visitors see available add-ons. | |
| 404 page | Standard Next.js not-found page. Simple but dead-end for visitors. | ✓ |
| Redirect to landing page pricing | Send visitors to the pricing section of the landing page instead. | |

**User's choice:** 404 page
**Notes:** Delete the directory entirely — Next.js handles the 404 automatically.

---

## Free Tier Checklist

| Option | Description | Selected |
|--------|-------------|----------|
| Add after 'Reporting' (last item) | Append to end. Least disruptive, and highlights it as a new addition. | ✓ |
| Add after 'Customer accounts' | Group it near the customer-facing features. | |
| You decide | Claude picks the most logical placement. | |

**User's choice:** Add after 'Reporting' (last item)
**Notes:** Same checkmark style as existing items in the free tier list.

---

## Add-ons Hub Copy

| Option | Description | Selected |
|--------|-------------|----------|
| Just show 2 add-ons, no mention of email | Clean slate — hub page only lists what's available as paid add-ons. No 'email is now free' banner. | ✓ |
| Add a note that email is now included free | Small callout/banner on the hub page saying 'Email notifications are now included with every store at no extra cost.' | |

**User's choice:** Just show 2 add-ons, no mention of email
**Notes:** Update metadata description to reference only Xero and Inventory Management.

---

## Claude's Discretion

- Exact max-width value for 2-column grid
- Whether to constrain at card level or grid wrapper level
- Hub page subtitle copy updates

## Deferred Ideas

None — discussion stayed within phase scope
