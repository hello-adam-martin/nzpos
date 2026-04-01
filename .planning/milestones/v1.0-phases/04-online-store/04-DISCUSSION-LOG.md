# Phase 4: Online Store - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 04-online-store
**Areas discussed:** Storefront layout & browsing, Cart & checkout flow, Click-and-collect workflow, Promo code management

---

## Storefront Layout & Browsing

### Product Display
| Option | Description | Selected |
|--------|-------------|----------|
| Product card grid | Responsive grid of cards with image, name, price, Add to Cart | ✓ |
| Product list with thumbnails | Vertical list rows with small thumbnail, name, price, description snippet | |
| Hybrid: grid + quick-view | Card grid with quick-view modal on hover/tap | |

**User's choice:** Product card grid (Recommended)
**Notes:** None

### Category Navigation
| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal pill/tab bar | Row of category pills at top of product grid, tap to filter | ✓ |
| Sidebar category list | Left sidebar with category links | |
| Dropdown filter | Category selector dropdown above the grid | |

**User's choice:** Horizontal pill/tab bar (Recommended)
**Notes:** Matches POS category pattern from Phase 3

### Product Detail Page
| Option | Description | Selected |
|--------|-------------|----------|
| Yes, full detail page | Dedicated /products/[slug] page with large image, description, Add to Cart | ✓ |
| Quick-view modal only | No dedicated page, modal overlay for details | |

**User's choice:** Yes, full detail page (Recommended)
**Notes:** Required for SEO (STORE-02)

### Product Search
| Option | Description | Selected |
|--------|-------------|----------|
| Search bar in header | Persistent search field in storefront header | ✓ |
| Search icon that expands | Compact icon that expands to search bar on click | |

**User's choice:** Search bar in header (Recommended)
**Notes:** None

---

## Cart & Checkout Flow

### Cart UX
| Option | Description | Selected |
|--------|-------------|----------|
| Slide-out cart drawer | Cart icon with badge, slide-out drawer with items, promo, checkout button | ✓ |
| Dedicated cart page | Separate /cart page with full layout | |
| Both: drawer + cart page | Quick drawer for review, dedicated page for editing | |

**User's choice:** Slide-out cart drawer (Recommended)
**Notes:** None

### Stripe Checkout
| Option | Description | Selected |
|--------|-------------|----------|
| Stripe Checkout hosted page | Redirect to Stripe hosted checkout, zero PCI scope | ✓ |
| Stripe Checkout embedded mode | Embed Stripe Checkout in iframe, stays on domain | |

**User's choice:** Stripe Checkout hosted page (Recommended)
**Notes:** Per CLAUDE.md tech stack decision

### Promo Code Entry Point
| Option | Description | Selected |
|--------|-------------|----------|
| In cart drawer/page | Promo field in cart, discount applied server-side before Stripe redirect | ✓ |
| On Stripe Checkout page | Use Stripe's built-in promotion code feature | |
| Both: cart + Stripe | Enter in cart for preview, also on Stripe as fallback | |

**User's choice:** In cart drawer/page (Recommended)
**Notes:** Customer sees adjusted total before leaving site

### Cart Persistence
| Option | Description | Selected |
|--------|-------------|----------|
| localStorage persistence | Cart saved to localStorage, survives refresh and close | ✓ |
| Session only | Cart in React state only, lost on refresh | |

**User's choice:** localStorage persistence (Recommended)
**Notes:** Standard e-commerce behavior for guest checkout

---

## Click-and-Collect Workflow

### Collection Method Selection
| Option | Description | Selected |
|--------|-------------|----------|
| Click-and-collect only | All orders collect in-store, no selection needed | ✓ |
| Explicit pickup selection | Show collection method step even with one option | |

**User's choice:** Initially requested shipping support. After scope clarification (shipping is Out of Scope per REQUIREMENTS.md), agreed to click-and-collect only for v1.
**Notes:** Shipping noted as deferred idea for v2 backlog.

### Customer Notification
| Option | Description | Selected |
|--------|-------------|----------|
| Email notification | Send email when order marked READY | |
| Order status page only | Customer checks /order/[id] manually | |
| Both: email + status page | Email with link to status page | ✓ |

**User's choice:** Both: email + status page
**Notes:** None

### Staff Status Management
| Option | Description | Selected |
|--------|-------------|----------|
| Admin order list | Owner manages in admin order list (Phase 5 UI) | ✓ |
| POS interface | Staff updates from POS screen | |

**User's choice:** Admin order list (Recommended)
**Notes:** Phase 4 creates data model and transitions; Phase 5 builds the admin UI

---

## Promo Code Management

### Admin Interface
| Option | Description | Selected |
|--------|-------------|----------|
| Admin promo page | Dedicated /admin/promos page for code management | ✓ |
| Inline in admin settings | Promo section within general settings page | |

**User's choice:** Admin promo page (Recommended)
**Notes:** None

### Validation Error UX
| Option | Description | Selected |
|--------|-------------|----------|
| Inline error message | Specific errors: "Code expired", "Min order $X required", etc. | ✓ |
| Generic error only | "Invalid promo code" for all failures | |

**User's choice:** Inline error message (Recommended)
**Notes:** Helps customer understand why code failed

### Usage Model
| Option | Description | Selected |
|--------|-------------|----------|
| Both options available | Owner sets max_uses (total cap). Rate limiting prevents abuse. | ✓ |
| Unlimited use until expiry | No max uses, code works until expiry | |

**User's choice:** Both options available (Recommended)
**Notes:** No per-customer tracking in v1 (guest checkout). Rate limit 10/min per IP.

---

## Claude's Discretion

- Product card grid column count and breakpoints
- Cart drawer animation and close behavior
- Search implementation approach
- Order confirmation page layout
- Email notification service and template
- Storefront header/footer layout
- Product slug generation
- Empty state designs
- Mobile responsive breakpoints

## Deferred Ideas

- **Shipping/delivery support** — User requested, confirmed out of scope for v1. Note for v2.
