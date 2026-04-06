# Phase 32: Demo Store Seed - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 32-demo-store-seed
**Areas discussed:** Store identity, Product catalog, Seed mechanism, Store identification

---

## Store Identity

### Business Type

| Option | Description | Selected |
|--------|-------------|----------|
| NZ Supplies Store | Keep aligned with founder's actual business -- cleaning, linen, kitchen supplies | |
| Generic NZ retail | A broader retail store (gifts, homewares) that appeals to more merchant types | ✓ |
| The founder's actual store | Use the real business name and details | |

**User's choice:** Generic NZ retail
**Notes:** Broader appeal for prospective merchants visiting the demo.

### Branding Level

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal realistic | Believable NZ name, placeholder logo, generic address | ✓ |
| Fully branded | Custom logo, tagline, complete receipt header/footer, IRD/GST | |
| You decide | Claude picks the right balance | |

**User's choice:** Minimal realistic
**Notes:** Enough to look real in the POS header without over-engineering.

---

## Product Catalog

### Product Mix

| Option | Description | Selected |
|--------|-------------|----------|
| New generic retail mix | ~20 products across 4+ categories for a gift/homeware store | ✓ |
| Keep existing supplies | Reuse the 25 supplies products from seed.ts | |
| Mix of both | Some supplies + some gifts/homewares | |

**User's choice:** New generic retail mix
**Notes:** Replaces the supplies-specific products from existing seed.

### Product Images

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder SVGs | Simple colored SVGs with initials or icons, no external dependencies | ✓ |
| Stock photos from Unsplash | Free Unsplash URLs for realistic photos | |
| No images | Leave image_url null, rely on fallback handling | |

**User's choice:** Placeholder SVGs
**Notes:** Loads instantly, always works, no external service dependency.

---

## Seed Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| SQL migration | New 032_demo_store_seed.sql, runs with supabase db reset, no auth user needed | ✓ |
| Separate TypeScript seed | New supabase/demo-seed.ts alongside existing seed.ts | |
| Extend existing seed.ts | Add demo store data to existing dev seed script | |

**User's choice:** SQL migration
**Notes:** Runs automatically, no manual execution needed, keeps demo data in the migration chain.

---

## Store Identification

### Identification Method

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed UUID constant | Hardcoded DEMO_STORE_ID in migration and app code | ✓ |
| Special slug lookup | Use slug='demo' and look it up at runtime | |
| is_demo column | Boolean flag on stores table | |

**User's choice:** Fixed UUID constant
**Notes:** Same pattern as DEV_STORE_ID. Zero-query identification.

### UUID Separation

| Option | Description | Selected |
|--------|-------------|----------|
| Separate UUID | Different from DEV_STORE_ID, both coexist in local dev | ✓ |
| Reuse DEV_STORE_ID | Demo store IS the dev store | |

**User's choice:** Separate UUID
**Notes:** Keeps demo and dev stores independent.

---

## Claude's Discretion

- Category names and product names/SKUs for generic NZ retail
- Exact NZD tax-inclusive price points
- SVG placeholder design approach
- Store address and receipt text

## Deferred Ideas

None -- discussion stayed within phase scope.
