# Phase 31: Marketing Pages - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Update public-facing marketing pages to reflect the updated pricing model: email notifications are now a free built-in feature, only two paid add-ons remain (Xero Integration and Inventory Management). Landing pricing section, add-ons hub page, email detail page, and grid layouts all need updating.

</domain>

<decisions>
## Implementation Decisions

### Grid Layout (MKT-05)
- **D-01:** Both landing pricing section and add-ons hub page switch from `md:grid-cols-3` to a centered 2-column layout with max-width constraint. Cards should not stretch full-width — constrain to keep visual balance.

### Email Detail Page Removal (MKT-02)
- **D-02:** Delete the `/add-ons/email-notifications/` directory entirely. The route should return a standard Next.js 404 (not-found) page. No redirect needed.

### Free Tier Checklist (MKT-04)
- **D-03:** Add "Email notifications" as the last item in the free tier feature checklist on the landing pricing section, after "Reporting". Same checkmark style as existing items.

### Add-ons Hub Copy (MKT-03)
- **D-04:** Remove the Email Notifications entry from the `addOns` array on the hub page. Update the page metadata description to reference only Xero and Inventory Management. No banner or callout about email being free — just silently show 2 add-ons.

### Landing Pricing Section (MKT-01)
- **D-05:** Remove the Email Notifications card from the landing pricing section. The section should show only Xero Integration and Inventory Management add-on cards.

### Claude's Discretion
- Exact max-width value for the 2-column add-on grid (should look balanced within the 1200px container)
- Whether to add `max-w-*` on individual cards or on the grid wrapper
- Hub page hero/subtitle copy updates (keep concise, match existing tone)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Full design system: colors (navy #1E293B, amber #E67E22), typography (Satoshi display, DM Sans body), spacing (8px base), border radius, motion. All marketing components must comply.

### Marketing Components (to modify)
- `src/app/(marketing)/components/LandingPricing.tsx` — Landing pricing section with free tier card + 3 add-on cards (line 57: `md:grid-cols-3` grid)
- `src/app/(marketing)/add-ons/page.tsx` — Add-ons hub page with 3-item `addOns` array and `md:grid-cols-3` grid (line 74)
- `src/app/(marketing)/add-ons/email-notifications/page.tsx` — Email notifications detail page (to be deleted)

### Marketing Components (reference only)
- `src/app/(marketing)/components/LandingNav.tsx` — Sticky nav
- `src/app/(marketing)/components/LandingHero.tsx` — Hero section
- `src/app/(marketing)/components/LandingFeatures.tsx` — Feature cards
- `src/app/(marketing)/components/LandingCTA.tsx` — CTA section
- `src/app/(marketing)/components/LandingFooter.tsx` — Footer
- `src/app/(marketing)/components/LandingNZCallout.tsx` — NZ callout strip

### Requirements
- `.planning/REQUIREMENTS.md` — MKT-01 through MKT-05 define acceptance criteria for this phase

### Prior Phase Context
- `.planning/phases/28-marketing-landing-page/28-CONTEXT.md` — Original marketing page decisions (confident Kiwi SaaS tone, CSS custom properties, inline SVGs)
- `.planning/phases/29-backend-billing-cleanup/29-CONTEXT.md` — Backend email_notifications removal
- `.planning/phases/30-admin-ui-super-admin/30-CONTEXT.md` — Admin UI email_notifications removal

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- All marketing components use CSS custom properties (`var(--color-navy)`, `var(--space-md)`, etc.) from DESIGN.md
- Inline SVG icons for add-on cards — hand-crafted, no icon library
- `max-w-[1200px]` container pattern used consistently across all marketing sections

### Established Patterns
- Standalone function components, no shared state
- Tailwind v4 CSS-native config with custom properties for all design tokens
- Add-on cards rendered as `<Link>` elements with hover border transition
- Free tier card uses `border-2 border-[var(--color-navy)]` prominence styling
- `force-static` export on hub page for static generation

### Integration Points
- Landing pricing section: `LandingPricing.tsx` is imported directly by the marketing page
- Add-ons hub: `src/app/(marketing)/add-ons/page.tsx` is a standalone page with its own `addOns` array
- Email detail page: `src/app/(marketing)/add-ons/email-notifications/page.tsx` — deleting the directory removes the route

</code_context>

<specifics>
## Specific Ideas

No specific requirements — the changes are well-defined by the success criteria. Straightforward removal and layout adjustment.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-marketing-pages*
*Context gathered: 2026-04-06*
