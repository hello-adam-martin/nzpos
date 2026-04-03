# Phase 14: Store Setup Wizard + Marketing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 14-store-setup-wizard-marketing
**Areas discussed:** Wizard flow & trigger, Setup checklist, Landing page structure, Logo upload & branding

---

## Wizard Flow & Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Intercept first dashboard visit | After email verification, redirect to /admin/setup instead of /admin/dashboard. Wizard is a dedicated route. | ✓ |
| Modal overlay on dashboard | Dashboard loads normally but a full-screen modal walks through setup steps. | |
| Inline on dashboard | Dashboard page itself contains wizard steps at top. | |

**User's choice:** Intercept first dashboard visit
**Notes:** Clean separation — wizard is its own route, dashboard stays focused.

---

### Resume Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Resume where they left off | Track completed steps in DB. On return, jump to first incomplete step. | ✓ |
| Start from beginning | Always show step 1 with pre-filled values. | |
| Skip wizard, show checklist | Don't force back into wizard, rely on dashboard checklist. | |

**User's choice:** Resume where they left off

---

### Wizard Steps

| Option | Description | Selected |
|--------|-------------|----------|
| Store name/slug, logo, first product | Matches roadmap. 3 steps as specified. | ✓ |
| Swap first product for business details | Step 3 becomes store description + contact info. | |
| Add a 4th step | Keep all 3 plus another step. | |

**User's choice:** Store name/slug, logo, first product (as per roadmap)

---

### Slug Editability

| Option | Description | Selected |
|--------|-------------|----------|
| Display-only in wizard | Show slug for reference, immutable per requirements. | ✓ |
| Allow one-time edit | Let merchant change slug once during wizard. | |

**User's choice:** Display-only

---

## Setup Checklist

### Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Banner at top of dashboard | Dismissible card/banner above normal content showing progress. | ✓ |
| Sidebar widget | Persistent checklist in admin sidebar. | |
| Dedicated settings page | Checklist at /admin/setup-checklist as own page. | |

**User's choice:** Banner at top of dashboard

---

### Checklist Items

| Option | Description | Selected |
|--------|-------------|----------|
| Wizard steps + first sale | 5 items: name, logo, first product, first POS sale, first online order. | ✓ |
| Wizard steps only | 3 items matching wizard. | |
| Wizard steps + operational items | 6+ items including payment, hours, staff. | |

**User's choice:** Wizard steps + first sale (5 items)

---

### Dismissal

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-hide when all complete | Disappears once all 5 done, shows congratulations. | ✓ |
| Manually dismissible anytime | Can close permanently even if incomplete. | |
| Dismissible but comes back | Collapses but reappears until complete. | |

**User's choice:** Auto-hide when all complete

---

## Landing Page Structure

### Sections

| Option | Description | Selected |
|--------|-------------|----------|
| Hero + Features + Pricing + CTA | Classic SaaS landing page with all key sections. | ✓ |
| Hero + Features + CTA only | Minimal, no pricing section. | |
| Full marketing site | Comprehensive with testimonials, FAQ, comparison table. | |

**User's choice:** Hero + Features + Pricing + CTA

---

### Route

| Option | Description | Selected |
|--------|-------------|----------|
| Root domain homepage / | nzpos.co.nz/ is the landing page, /signup is form. | ✓ |
| Separate /pricing and /features | Multi-page marketing site. | |
| Single scroll page at / | One page with anchor links. | |

**User's choice:** Root domain homepage /

---

### Tone

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly, practical, NZ-focused | NZ-specific value props, casual confident tone. | ✓ |
| Professional and polished | Enterprise-leaning, minimal personality. | |
| Bold and startup-y | High energy, disruptive messaging. | |

**User's choice:** Friendly, practical, NZ-focused

---

### Pricing Display

| Option | Description | Selected |
|--------|-------------|----------|
| Show pricing on landing page | Transparent, free core + add-on prices shown. | ✓ |
| Defer to signup flow | Just "Free to start", details later. | |
| Separate /pricing page | Link to dedicated pricing page. | |

**User's choice:** Show pricing on landing page

---

## Logo Upload & Branding

### Upload UX

| Option | Description | Selected |
|--------|-------------|----------|
| Simple file picker | Click-to-browse + drag-drop, preview, Supabase Storage. Max 2MB. | ✓ |
| File picker + crop | Inline crop/resize tool. | |
| File picker + AI placeholder | Auto-generate placeholder from initials if skipped. | |

**User's choice:** Simple file picker

---

### Color Picker

| Option | Description | Selected |
|--------|-------------|----------|
| Preset palette | 8-10 curated swatches, one tap to select. | ✓ |
| Free color picker | Full HSL/hex picker. | |
| Preset + custom hex | Swatches with advanced hex input toggle. | |

**User's choice:** Preset palette

---

### Branding Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Storefront header + favicon | Logo in storefront header, primary color as accent, favicon from logo. Admin stays NZPOS brand. | ✓ |
| Storefront + receipts + admin | Full white-label everywhere. | |
| Storefront only | Branding only on public storefront. | |

**User's choice:** Storefront header + favicon

---

### Edit Later

| Option | Description | Selected |
|--------|-------------|----------|
| Settings page in admin | /admin/settings page for updating branding anytime. | ✓ |
| Only through re-running wizard | Wizard is the only editing surface. | |
| You decide | Claude's discretion. | |

**User's choice:** Settings page in admin

---

## Claude's Discretion

- Wizard step UI layout and transitions
- Setup checklist banner design and congratulations message
- Landing page copy, hero image/illustration approach
- Preset color palette selection
- Logo storage and favicon generation approach
- Setup step tracking data model
- First product wizard step field requirements

## Deferred Ideas

None — discussion stayed within phase scope.
