# Design System — NZPOS

## Product Context
- **What this is:** Custom retail POS + online store for NZ small businesses
- **Who it's for:** Owner-operators of small NZ retail stores (4-10 staff), their customers (online + walk-in)
- **Space/industry:** NZ retail POS. Peers: Square, Lightspeed/Vend, Shopify POS, POSbiz
- **Project type:** Web app (3 surfaces: POS tablet, public storefront, admin dashboard)

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian with warmth
- **Decoration level:** Intentional (subtle grain texture on backgrounds, warm shadows on cards)
- **Mood:** Professional and trustworthy. A well-run shop that takes money seriously but doesn't feel cold. The kind of place where the owner knows your name.
- **Reference sites:** Square POS (clean, minimal), Stripe (navy + professional), Lightspeed (functional)

## Typography
- **Display/Hero:** Satoshi (weight 700-900) — geometric but warm, modern without being clinical. Used for page titles, hero headings, logo text.
- **Body:** DM Sans (weight 400-700) — clean readability, excellent tabular-nums support for prices. Used for everything else: body text, labels, buttons, navigation.
- **UI/Labels:** DM Sans (weight 500-600)
- **Data/Tables:** DM Sans with `font-feature-settings: 'tnum' 1` for aligned numbers. Geist Mono for SKUs, order numbers, receipt previews.
- **Code:** Geist Mono
- **Loading:** Bunny Fonts CDN (`https://fonts.bunny.net/css?family=satoshi:400,500,700,900|dm-sans:400,500,600,700`)
- **Scale:**
  - xs: 12px / 0.75rem
  - sm: 14px / 0.875rem
  - base: 16px / 1rem
  - lg: 18px / 1.125rem
  - xl: 20px / 1.25rem
  - 2xl: 24px / 1.5rem
  - 3xl: 30px / 1.875rem
  - 4xl: 36px / 2.25rem
  - 5xl: 48px / 3rem (display only)

## Color
- **Approach:** Restrained (navy + amber, neutrals do most of the work)
- **Primary:** #1E293B (deep navy) — header bars, primary buttons, selected states. Professional, trustworthy.
- **Primary Light:** #334155 — hover states, secondary emphasis
- **Primary Dark:** #0F172A — pressed states, footer backgrounds
- **Accent:** #E67E22 (amber) — action buttons (Pay, Add to Cart), price highlights, badges. Draws the eye to what matters.
- **Accent Hover:** #D35400
- **Background:** #FAFAF9 (warm stone white) — main page background
- **Surface:** #F5F5F4 — card backgrounds, sidebar, secondary surfaces
- **Card:** #FFFFFF — elevated cards, modals, dropdowns
- **Text:** #1C1917 — primary text
- **Text Muted:** #78716C — secondary text, descriptions, timestamps
- **Text Light:** #A8A29E — placeholder text, disabled states
- **Border:** #E7E5E4 — card borders, dividers
- **Border Light:** #F0EFED — subtle separators within cards
- **Semantic:**
  - Success: #059669 (emerald green)
  - Warning: #D97706 (amber, darker than accent to differentiate)
  - Error: #DC2626 (red)
  - Info: #3B82F6 (blue)
- **Dark mode strategy:** Invert surfaces (dark backgrounds, light text). Primary becomes slate (#94A3B8). Accent stays amber (#FB923C, slightly lighter). Reduce saturation 10-20% on semantic colors.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable (POS needs large touch targets, admin can be tighter)
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)
- **POS-specific:** Minimum touch target 44x44px. Product cards minimum 120px wide. Cart items minimum 40px row height.

## Layout
- **Approach:** Hybrid (grid-disciplined for POS/admin, slightly more creative for online storefront)
- **POS grid:** 2-column (products left, cart right). Products fill available space with auto-fill grid.
- **Online store:** Single column mobile-first, 2-3 column product grid on desktop.
- **Admin:** Sidebar nav (240px) + main content area. Responsive: sidebar collapses to hamburger on tablet.
- **Max content width:** 1200px (storefront), full-width (POS, admin)
- **Border radius:**
  - sm: 4px (inputs, small badges)
  - md: 8px (cards, buttons, alerts)
  - lg: 12px (modals, large cards, POS mockup frame)
  - full: 9999px (pills, avatars, toggle switches)

## Motion
- **Approach:** Minimal-functional (POS must feel instant, no decorative animation)
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:**
  - micro: 50-100ms (button press feedback, checkbox toggle)
  - short: 150ms (hover states, focus rings, cart item add)
  - medium: 250ms (modal open/close, dropdown expand)
  - long: 400ms (page transitions, only on storefront)
- **POS rule:** Nothing in the POS checkout path should animate longer than 150ms. Speed is the feature.

## Component Patterns
- **Grain texture:** Applied via CSS SVG filter on `body` background at 3% opacity. Adds subtle tactility.
- **Shadows:** Warm-tinted (`rgba(30,41,59,0.06-0.12)`), not pure black. Three levels: sm, md, lg.
- **Buttons:** Primary (navy bg, white text), Accent (amber bg, white text), Ghost (transparent, border). Large variant for POS pay button.
- **Category pills:** Rounded full, border default, navy fill when active.
- **Alerts:** Tinted backgrounds matching semantic colors, 1px border, icon + text.
- **Cards:** White background, subtle border, sm shadow. No heavy drop shadows.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-01 | Initial design system created | /design-consultation based on competitive research (Square, Lightspeed, Shopify POS) |
| 2026-04-01 | Deep navy + amber palette chosen | Over forest green (too nature), indigo (too bold), teal (too generic). Navy says 'trustworthy', amber says 'action'. |
| 2026-04-01 | Satoshi + DM Sans typography | Satoshi for display warmth, DM Sans for body readability + tabular-nums for prices |
| 2026-04-01 | Warm stone neutrals (#FAFAF9) | Instead of pure white. Warmer feel without the yellow tint of cream. |
| 2026-04-01 | Grain texture on surfaces | Subtle tactility that differentiates from flat POS competitors. 3% opacity, negligible performance. |
