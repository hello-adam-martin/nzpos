# Phase 28: Marketing Landing Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 28-marketing-landing-page
**Areas discussed:** Features section layout, Pricing section structure, Hero copy & messaging tone, Page structure & navigation

---

## Features Section Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped categories | Group features under 3-4 headings (e.g. 'Sell In-Store', 'Sell Online', 'Manage Your Business', 'Stay Compliant'). Each group has 2-4 feature cards. | ✓ |
| Large icon grid | Single flat grid of feature cards (3-col desktop, 1-col mobile). Each card: icon + title + 1-line description. | |
| Alternating feature rows | Each major feature gets a full-width row with text on one side and illustration on the other. | |

**User's choice:** Grouped categories
**Notes:** None

### Card style

| Option | Description | Selected |
|--------|-------------|----------|
| 3-4 groups, compact cards | Small feature cards (icon + title + 1-liner) underneath category headings. Keeps the section tight. | ✓ |
| 3-4 groups, rich cards | Larger cards showing icon + title + 2-3 line description. More detail per feature. | |
| You decide | Claude picks the right card density and groupings. | |

**User's choice:** 3-4 groups, compact cards
**Notes:** None

### Icons

| Option | Description | Selected |
|--------|-------------|----------|
| Keep inline SVGs | Hand-crafted SVG icons per feature. Consistent, no external dependency. | ✓ |
| Emoji icons | Use emoji as feature icons. Zero code overhead, friendly feel. | |
| You decide | Claude picks the best icon approach for the design system. | |

**User's choice:** Keep inline SVGs
**Notes:** None

### Section heading

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current heading | 'Everything a Kiwi shop needs' — friendly, NZ-focused. | |
| More professional | Something like 'Built for New Zealand retail'. Matches mature SaaS tone. | |
| You decide | Claude picks a heading that fits the overall messaging tone. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on features section heading

---

## Pricing Section Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Free tier hero + 3 add-on cards | Prominent free card at top, then 3 equal add-on cards below in a row. | ✓ |
| 4-column comparison | All 4 options as equal-width cards side by side. Classic SaaS pricing grid. | |
| Stacked: free list then add-ons | Free tier as a feature checklist, followed by add-on cards. | |

**User's choice:** Free tier hero + 3 add-on cards
**Notes:** None

### Free tier contents

| Option | Description | Selected |
|--------|-------------|----------|
| Core features only | POS checkout, Online storefront, GST-compliant receipts, Staff management, Customer accounts, Reporting. No inventory. | ✓ |
| Core + basic stock | Include 'Basic stock tracking' in free tier. | |
| You decide | Claude picks the most accurate free tier list. | |

**User's choice:** Core features only
**Notes:** Current code incorrectly lists "Inventory management" as free — must be fixed

### Add-on CTAs

| Option | Description | Selected |
|--------|-------------|----------|
| Informational only | Show price + benefits but no action button on each add-on card. | ✓ |
| Per-add-on CTA | Each add-on card gets a small 'Learn more' or 'Add' button. | |
| You decide | Claude picks based on conversion patterns. | |

**User's choice:** Informational only
**Notes:** Visitors sign up first, then add subscriptions from the dashboard

---

## Hero Copy & Messaging Tone

| Option | Description | Selected |
|--------|-------------|----------|
| Confident Kiwi SaaS | Keep the NZ identity but upgrade confidence. Mature but still local. | ✓ |
| Feature-forward | Lead with what the platform does. Scannable, punchy. | |
| Problem-solution | Lead with the pain point. More emotional, benefit-focused. | |
| You decide | Claude crafts hero copy balancing NZ identity with mature SaaS confidence. | |

**User's choice:** Confident Kiwi SaaS
**Notes:** None

### iPad mockup

| Option | Description | Selected |
|--------|-------------|----------|
| Keep iPad mockup | CSS-only iPad mockup with POS grid. Distinctive and shows the product. | ✓ |
| Replace with screenshot | Use actual screenshot of real POS interface. | |
| Remove illustration | Text-only hero. Simpler, faster to load. | |

**User's choice:** Keep iPad mockup
**Notes:** None

### Sub-copy

| Option | Description | Selected |
|--------|-------------|----------|
| Same structure, updated | Keep 3-benefit format but reflect full platform. | |
| Shorter and punchier | Trim to 1 line. Let features section do heavy lifting. | |
| You decide | Claude writes sub-copy to complement new headline. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion

---

## Page Structure & Navigation

### New sections

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current sections | Hero, Features, Pricing, CTA, Footer. Just rewrite content. | ✓ |
| Add 'How it works' | 3-step section between Hero and Features. | |
| Add NZ callout strip | Narrow strip highlighting NZ-specific value between Features and Pricing. | ✓ |

**User's choice:** Keep current sections + Add NZ callout strip (multi-select)
**Notes:** None

### Nav anchor links

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add anchor links | Features and Pricing links that smooth-scroll to sections. | |
| No, keep it minimal | Nav stays as-is: just Sign In + Get Started. | |
| You decide | Claude decides based on final page length. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion based on page length

### NZ callout strip format

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal icon strip | 3-4 items in a row with small icons. Compact, high-trust. | |
| Highlighted banner | Full-width amber or navy banner with bold text. More prominent. | ✓ |
| You decide | Claude picks the format that fits design system best. | |

**User's choice:** Highlighted banner
**Notes:** User wants it to stand out

---

## Claude's Discretion

- Features section heading wording
- Nav anchor links (yes/no based on page length)
- Hero sub-copy wording
- NZ callout strip exact content and color (amber or navy)
- Feature grouping names and assignment

## Deferred Ideas

None — discussion stayed within phase scope
