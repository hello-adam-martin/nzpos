# Phase 2: Product Catalog - Research

**Researched:** 2026-04-01
**Domain:** Next.js App Router admin UI — product CRUD, Supabase Storage image upload, CSV import with column mapping, drag-and-drop category reorder
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Data table layout — sortable columns: image thumbnail, name, SKU, price (NZD), stock quantity, category, active/inactive status.
- **D-02:** Search (name + SKU) + filters: category dropdown, stock status (in stock / low / out), active/inactive toggle.
- **D-03:** Essential columns only — no barcode, reorder threshold, or dates in the default view.
- **D-04:** Single image per product. One hero image. Multi-image deferred to v2.
- **D-05:** Click-to-browse file picker (no drag-and-drop). Image preview after selection.
- **D-06:** Server-side auto-resize to max 800x800px on upload. Uses Supabase Storage.
- **D-07:** Flexible column mapping UI. Owner uploads any CSV, maps columns visually.
- **D-08:** Preview table with diff highlighting. Duplicates by SKU, showing existing vs new values. Confirm before commit.
- **D-09:** Import valid rows, skip invalid. Errors shown inline. Invalid rows in downloadable error report.
- **D-10:** Auto-create categories from CSV if category name doesn't exist yet.
- **D-11:** Price column accepts dollar values (e.g., $8.99) and converts to integer cents internally.
- **D-12:** Categories displayed as sidebar panel on product list page. Click category to filter; edit/rename via icon.
- **D-13:** Flat categories only (no nesting/subcategories).
- **D-14:** Drag-and-drop reordering of categories. Updates sort_order field.

### Claude's Discretion

- Product form layout (create/edit modal vs full page) — UI-SPEC resolved this: slide-in drawer (480px, right side)
- Table pagination strategy (client-side for <500 products, server-side if needed)
- Image placeholder/fallback when no image uploaded
- CSV parsing library choice
- Column mapper UI component approach
- Drag-and-drop library choice for category reordering — UI-SPEC resolved this: @dnd-kit/core + @dnd-kit/sortable

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROD-01 | Owner can create products with name, SKU, barcode, price (cents), category, stock, reorder threshold | Server Action pattern, Zod schema exists, Supabase insert with store_id RLS |
| PROD-02 | Owner can upload product images via Supabase Storage | Supabase Storage upload API, sharp for server-side resize in Route Handler |
| PROD-03 | Owner can edit and deactivate products | UpdateProductSchema partial() exists; deactivate = set is_active=false |
| PROD-04 | Owner can import products from CSV (batch processing for 500+ rows, skip duplicates) | papaparse for parsing; upsert-or-skip pattern on SKU unique constraint; streaming/chunked for 500+ rows |
| PROD-05 | Product images display in POS grid and online store | image_url stored in DB; next/image with Supabase Storage remotePatterns |
| PROD-06 | Categories can be created, edited, and reordered | sort_order field exists; @dnd-kit/sortable for drag-and-drop; Server Action for reorder update |
</phase_requirements>

---

## Summary

Phase 2 builds the admin product catalog — the owner's primary workspace for managing inventory. The foundation (Next.js 16, Supabase, Tailwind v4, Zod v4, auth) is fully in place from Phase 1. The database schema is deployed: `products` and `categories` tables both exist with all required columns. Zod schemas for product create/update are already written. The key new work is UI (data table, slide-in drawer, category sidebar) and three substantial feature areas: Supabase Storage image uploads with server-side resize, a multi-step CSV import with column mapping, and drag-and-drop category reordering.

The UI-SPEC (already approved) specifies @dnd-kit/core + @dnd-kit/sortable for drag-and-drop and documents all component names and interaction contracts. Neither @dnd-kit nor papaparse are installed — both need to be added. Sharp is already installed (used by Next.js image optimisation). The CSV import is the most complex sub-feature: 500+ rows requires chunked processing, and the column mapper UI is bespoke.

The admin layout is currently a bare wrapper (`min-h-screen bg-bg`). This phase must build the `AdminSidebar` nav component that will be shared across all admin pages.

**Primary recommendation:** Implement in four sequential areas — (1) admin shell + product list page + CRUD drawer, (2) image upload with server-side resize, (3) CSV import flow, (4) category sidebar with drag-and-drop. Each area can be a separate plan wave.

---

## Standard Stack

### Core (already installed — no new installs for these)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.1 | App Router, Server Actions, Route Handlers | Already scaffolded |
| @supabase/supabase-js | ^2.101.1 | Supabase DB + Storage client | Already installed |
| @supabase/ssr | ^0.10.0 | Cookie-based auth for App Router | Already installed |
| zod | ^4.3.6 | Input validation on Server Actions | Already installed, schemas exist |
| tailwindcss | ^4 | Utility CSS with @theme tokens | Already configured |
| sharp | latest | Image processing (resize on upload) | Already installed |

### New Dependencies Required

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @dnd-kit/core | 6.3.1 (current) | Drag-and-drop primitives | Specified in UI-SPEC (D-14). Accessible, pointer + keyboard, no DOM dependency. Works with React 19. |
| @dnd-kit/sortable | 10.0.0 (current) | Sortable list abstraction on @dnd-kit/core | Required companion for vertical list sort. Used specifically for category reorder. |
| papaparse | 5.5.3 (current) | CSV parsing | Industry-standard CSV parser. Handles quoted fields, encoding, flexible delimiters. Used in a Server Action/Route Handler for parsing uploaded CSV. |
| @types/papaparse | latest | TypeScript types for papaparse | Dev dependency — papaparse is not typed natively |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable papaparse
npm install -D @types/papaparse
```

**Version verification (confirmed against npm registry 2026-04-01):**
- @dnd-kit/core: 6.3.1
- @dnd-kit/sortable: 10.0.0
- papaparse: 5.5.3

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | react-beautiful-dnd is unmaintained (archived 2023). @dnd-kit is the current standard. |
| @dnd-kit | HTML5 drag-and-drop API | No keyboard accessibility, no touch support on iPad, no smooth animations. @dnd-kit handles all edge cases. |
| papaparse | Native string split | CSV has many edge cases: quoted commas, newlines in fields, encoding. Never hand-roll. |
| Server Action for image upload | Direct Supabase Storage from client | Client-side upload exposes storage credentials. Server Route Handler or Server Action is correct. |
| sharp resize in Route Handler | Client-side resize (Canvas API) | Server-side ensures consistent output regardless of client. sharp is already installed. |

---

## Architecture Patterns

### Recommended Project Structure for Phase 2

```
src/
├── app/
│   └── (admin)/
│       ├── layout.tsx              # ADD: AdminSidebar wrapper (currently bare)
│       ├── dashboard/page.tsx      # existing
│       └── products/
│           ├── page.tsx            # Product list page (Server Component)
│           └── loading.tsx         # Skeleton loading state
├── actions/
│   └── products/
│       ├── createProduct.ts        # Server Action
│       ├── updateProduct.ts        # Server Action
│       ├── deactivateProduct.ts    # Server Action
│       ├── importProducts.ts       # Server Action (CSV commit)
│       └── reorderCategories.ts   # Server Action
│   └── categories/
│       ├── createCategory.ts       # Server Action
│       ├── updateCategory.ts       # Server Action (rename)
│       └── deleteCategory.ts       # Server Action
├── components/
│   └── admin/
│       ├── AdminSidebar.tsx        # 240px nav sidebar (shared all admin pages)
│       ├── products/
│       │   ├── ProductDataTable.tsx
│       │   ├── ProductSearchBar.tsx
│       │   ├── ProductFilterBar.tsx
│       │   ├── ProductStatusBadge.tsx
│       │   ├── ProductFormDrawer.tsx
│       │   ├── ProductImagePicker.tsx
│       │   └── PriceInput.tsx
│       ├── categories/
│       │   ├── CategorySidebarPanel.tsx
│       │   ├── CategoryRow.tsx
│       │   └── CategoryInlineEditor.tsx
│       └── csv/
│           ├── CSVUploadStep.tsx
│           ├── ColumnMapperStep.tsx
│           ├── ImportPreviewTable.tsx
│           └── ImportSummaryBar.tsx
├── lib/
│   └── csv/
│       ├── parseCSV.ts             # papaparse wrapper
│       ├── validateRows.ts         # Row validation against product schema
│       └── generateErrorReport.ts  # Downloadable error CSV generation
├── schemas/
│   └── product.ts                  # EXISTING — already has CreateProductSchema
└── app/
    └── api/
        └── products/
            └── image/route.ts      # Route Handler: image upload + sharp resize
```

### Pattern 1: Server Action with Zod Validation (established pattern)

**What:** Every mutation goes through a Server Action. Inputs validated with `z.safeParse()` before any DB call.
**When to use:** All product/category mutations (create, update, deactivate, reorder).

```typescript
// Source: established pattern from src/actions/auth/ownerSignup.ts
'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CreateProductSchema } from '@/schemas/product'

export async function createProduct(formData: FormData) {
  const parsed = CreateProductSchema.safeParse({
    name: formData.get('name'),
    price_cents: Number(formData.get('price_cents')),
    // ...
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createSupabaseServerClient()
  // RLS enforces store_id — JWT claims inject it automatically
  const { error } = await supabase
    .from('products')
    .insert({ ...parsed.data })

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/admin/products')
  return { success: true }
}
```

### Pattern 2: Image Upload via Route Handler + Sharp Resize

**What:** POST to `/api/products/image`. Receives `multipart/form-data`, resizes with sharp to max 800x800, uploads to Supabase Storage, returns public URL.
**When to use:** Product image upload (D-06).

```typescript
// src/app/api/products/image/route.ts
import sharp from 'sharp'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('image') as File

  const buffer = Buffer.from(await file.arrayBuffer())
  const resized = await sharp(buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()

  const supabase = await createSupabaseServerClient()
  const filename = `${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage
    .from('product-images')
    .upload(filename, resized, { contentType: 'image/webp', upsert: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('product-images').getPublicUrl(filename)
  return Response.json({ url: data.publicUrl })
}
```

**Note:** Supabase Storage bucket `product-images` must be created and set to public. This requires a migration or manual setup — include in Wave 0 plan.

### Pattern 3: @dnd-kit/sortable for Category Reorder

**What:** Wrap `CategorySidebarPanel` with `DndContext` and `SortableContext`. Each `CategoryRow` uses the `useSortable` hook. On drag end, call Server Action to persist new `sort_order`.
**When to use:** Category drag-and-drop (D-14).

```typescript
// Source: @dnd-kit/sortable documentation
'use client'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'

function CategorySidebarPanel({ initialCategories }) {
  const [categories, setCategories] = useState(initialCategories)

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex(c => c.id === active.id)
    const newIndex = categories.findIndex(c => c.id === over.id)
    const reordered = arrayMove(categories, oldIndex, newIndex)

    setCategories(reordered) // optimistic update
    await reorderCategories(reordered.map((c, i) => ({ id: c.id, sort_order: i })))
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
        {categories.map(c => <CategoryRow key={c.id} category={c} />)}
      </SortableContext>
    </DndContext>
  )
}
```

### Pattern 4: CSV Import — 3-Step State Machine

**What:** Multi-step import managed as client-side state: `'upload' | 'map' | 'preview' | 'committing'`. Each step is a separate component. State passes parsed rows and column mappings through steps.
**When to use:** CSV import flow (D-07, D-08, D-09).

**CSV parsing with papaparse:**
```typescript
// src/lib/csv/parseCSV.ts — runs in a Server Action or Route Handler
import Papa from 'papaparse'

export function parseCSVBuffer(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
  }
}
```

**Price conversion (D-11):**
```typescript
// Strip dollar sign, parse float, multiply by 100, round to integer
function parsePriceToCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '')
  const float = parseFloat(cleaned)
  if (isNaN(float) || float < 0) return null
  return Math.round(float * 100)
}
```

**Duplicate detection (D-08):** Query existing SKUs for the store before committing. Compare parsed SKUs against the set. Mark rows as `new`, `duplicate`, or `invalid`.

**Batch insert for 500+ rows:** Use Supabase's `.upsert()` in chunks of 100 rows inside the Server Action. Do not insert all 500+ in one call — Supabase has a practical limit and the request would time out.

```typescript
// Chunk array for batch inserts
const CHUNK_SIZE = 100
for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
  const chunk = validRows.slice(i, i + CHUNK_SIZE)
  await supabase.from('products').insert(chunk)
}
```

### Pattern 5: Price Input (dollars → cents)

**What:** Display input accepts decimal dollars (e.g., "8.99"). Convert to integer cents before Server Action validation.
**When to use:** All product price inputs (PROD-01, D-11).

```typescript
// In form submit handler — convert before sending to Server Action
const priceCents = Math.round(parseFloat(priceInput) * 100)
// Zod schema enforces: z.number().int().min(0)
```

### Anti-Patterns to Avoid

- **Client-side image upload to Supabase:** Exposes storage credentials. Always proxy through a Route Handler.
- **Single large INSERT for CSV:** 500+ rows in one call risks Supabase/Vercel timeout. Chunk at 100.
- **Float price storage:** The schema uses INTEGER cents. Never store a float even temporarily. Convert in UI before the Server Action boundary.
- **RLS bypass without admin client:** Never use the service role key for product CRUD. Normal Server Actions use the cookie-based client — RLS enforces store_id automatically via JWT claims.
- **Missing `revalidatePath` after mutations:** Next.js caches Server Component data. Every successful mutation must call `revalidatePath('/admin/products')` to refresh the product list.
- **DndContext in a Server Component:** @dnd-kit requires `'use client'`. `CategorySidebarPanel` must be a Client Component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom string split / regex | papaparse | CSV edge cases: quoted commas, multi-line cells, encoding, BOM. papaparse handles all of these. |
| Drag-and-drop sort | HTML5 drag events | @dnd-kit/sortable | Keyboard accessibility (required), touch support for iPad, smooth animations, auto-scroll. |
| Image resize | Canvas API in browser | sharp in Route Handler (server-side) | Consistent output quality, no client-side memory pressure, handles all input formats. |
| Price string parsing | ad-hoc regex | Documented `parsePriceToCents` utility | NZD format variations: "$8.99", "8.99", "$8,99" — centralise parsing. |
| Duplicate detection | Array.find in JS | SQL query against existing SKUs | Database is source of truth. JS-only check would miss concurrent imports. |
| Sortable list reorder | Manual index management | `arrayMove` from @dnd-kit/sortable | Off-by-one errors, immutability. `arrayMove` is a pure helper. |

**Key insight:** The CSV import has 4+ distinct failure modes (missing price, duplicate SKU, invalid category, malformed row). Do not try to validate CSV rows with ad-hoc logic — use the existing Zod schema (minus image_url, which isn't in CSV) adapted for the mapped fields.

---

## Common Pitfalls

### Pitfall 1: Supabase Storage Bucket Not Public

**What goes wrong:** Images upload successfully, `image_url` is stored in the DB, but `<Image>` src returns 400/403.
**Why it happens:** Supabase Storage buckets are private by default. `getPublicUrl()` generates a URL, but it only works if the bucket has public access enabled.
**How to avoid:** Create the `product-images` bucket with `public: true` in a migration or via Supabase dashboard. Add a storage policy allowing public reads. Include this in Wave 0 setup tasks.
**Warning signs:** Image loads in Supabase dashboard but not in the app.

### Pitfall 2: next/image Remote Pattern Missing

**What goes wrong:** `<Image>` throws `Invalid src` error for Supabase Storage URLs.
**Why it happens:** Next.js requires all remote image hosts to be allowlisted in `next.config.ts`.
**How to avoid:** Add `remotePatterns` for `*.supabase.co` in `next.config.ts`.
```typescript
// next.config.ts
images: {
  remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }]
}
```
**Warning signs:** Build error or runtime error mentioning "hostname not configured".

### Pitfall 3: DndContext Breaks with Server Component Boundary

**What goes wrong:** @dnd-kit throws "cannot read property of undefined" or "Event listeners added twice" errors.
**Why it happens:** DndContext uses React context and event listeners. If the parent is a Server Component and child is Client Component, the context is broken.
**How to avoid:** Mark `CategorySidebarPanel` and all drag-and-drop components `'use client'`. Pass categories as props from the Server Component page.
**Warning signs:** Error in browser console mentioning DndContext or useSortable.

### Pitfall 4: CSV Column Mapper State Not Persisted Between Steps

**What goes wrong:** User goes back from step 3 to step 2 and column mappings are reset.
**Why it happens:** Step navigation using conditional rendering destroys unmounted component state.
**How to avoid:** Lift CSV state (parsed rows, column mappings, preview result) to the parent step controller component. Do not rely on per-step local state for inter-step data.
**Warning signs:** Mapping dropdowns reset when navigating between steps.

### Pitfall 5: SKU Uniqueness Constraint Error on Import

**What goes wrong:** CSV import fails mid-batch with a Supabase unique constraint error for `(store_id, sku)`.
**Why it happens:** The products table has `UNIQUE (store_id, sku)`. Inserting a row with an existing SKU throws a DB error.
**How to avoid:** Pre-flight duplicate check before the insert loop — query all existing SKUs for the store, then filter out duplicates in the preview step (D-08 handles this in the UI). On the server action, use `.upsert()` with `onConflict: 'sku'` and `ignoreDuplicates: true` as a safety net, OR handle the constraint error per-chunk and collect errors.
**Warning signs:** Import partially succeeds then returns an error on chunk N.

### Pitfall 6: Reorder Server Action Called on Every Drag Move

**What goes wrong:** Excessive DB writes during drag (user drags slowly = 20+ updates).
**Why it happens:** Calling the Server Action in `onDragMove` instead of `onDragEnd`.
**How to avoid:** Only call the reorder Server Action in `onDragEnd`. Use optimistic `setCategories(arrayMove(...))` for visual feedback during drag.
**Warning signs:** Network tab shows many rapid `/api/...` calls during drag.

### Pitfall 7: Price Parsing Loses Precision

**What goes wrong:** `$8.99` parsed as `8.990000000000001` due to float arithmetic, then `* 100 = 899.0000000000001`, then `Math.round() = 899`. Usually correct but breaks on some inputs.
**Why it happens:** IEEE 754 float imprecision.
**How to avoid:** `Math.round(parseFloat(cleaned) * 100)` is correct for currency to 2dp. Do NOT use `parseInt(parseFloat(...) * 100)` — `parseInt` truncates instead of rounding.
**Warning signs:** Price $10.005 (edge case) stored as 1000 instead of 1001.

---

## Runtime State Inventory

> Phase 2 adds a new Supabase Storage bucket and potentially storage policies — these are infrastructure state, not runtime data.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | No existing product/category records (fresh schema from Phase 1 migration) | None — clean slate |
| Live service config | Supabase Storage: `product-images` bucket does NOT exist yet | Create bucket with public=true (migration or dashboard step in Wave 0) |
| OS-registered state | None | None — verified: no cron jobs, task scheduler entries for this feature |
| Secrets/env vars | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — all existing from Phase 1, no new secrets needed | None |
| Build artifacts | None — no stale build artifacts from Phase 1 that conflict | None |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev server | ✓ | Inferred (Next.js 16 requires >=18.18) | — |
| sharp | Server-side image resize | ✓ | Installed in node_modules | — |
| @dnd-kit/core | Category drag-and-drop | ✗ | Not installed | No fallback — install required |
| @dnd-kit/sortable | Category drag-and-drop | ✗ | Not installed | No fallback — install required |
| papaparse | CSV parsing | ✗ | Not installed | No fallback — install required |
| Supabase Storage bucket `product-images` | Image uploads | ✗ | Not created | No fallback — must be created in Wave 0 |

**Missing dependencies with no fallback:**
- `@dnd-kit/core` + `@dnd-kit/sortable` — install: `npm install @dnd-kit/core @dnd-kit/sortable`
- `papaparse` + `@types/papaparse` — install: `npm install papaparse && npm install -D @types/papaparse`
- Supabase Storage bucket `product-images` — create via migration or Supabase dashboard; set public=true + public read policy

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + @testing-library/react 16.x |
| Config file | `vitest.config.mts` (exists, jsdom environment, tsconfigPaths) |
| Quick run command | `npm test` (runs `vitest run`) |
| Full suite command | `npm test` |
| E2E command | `npm run test:e2e` (Playwright) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROD-01 | createProduct Server Action validates inputs, inserts product | unit | `npm test -- src/actions/products/createProduct.test.ts` | ❌ Wave 0 |
| PROD-01 | Price display conversion (dollars → cents round-trip) | unit | `npm test -- src/lib/money.test.ts` | ✅ existing |
| PROD-02 | Image upload route resizes to ≤800x800, returns public URL | unit | `npm test -- src/app/api/products/image/route.test.ts` | ❌ Wave 0 |
| PROD-03 | updateProduct Server Action with partial fields, deactivate sets is_active=false | unit | `npm test -- src/actions/products/updateProduct.test.ts` | ❌ Wave 0 |
| PROD-04 | parseCSV returns correct headers + rows for various CSV formats | unit | `npm test -- src/lib/csv/parseCSV.test.ts` | ❌ Wave 0 |
| PROD-04 | parsePriceToCents converts $8.99, 8.99, $1,000.00 to correct cents | unit | `npm test -- src/lib/csv/parseCSV.test.ts` | ❌ Wave 0 |
| PROD-04 | importProducts skips duplicate SKUs, inserts valid rows in chunks | unit | `npm test -- src/actions/products/importProducts.test.ts` | ❌ Wave 0 |
| PROD-05 | image_url stored in DB renders via next/image (smoke) | manual | Visual check in browser | — |
| PROD-06 | reorderCategories Server Action updates sort_order for all affected rows | unit | `npm test -- src/actions/categories/reorderCategories.test.ts` | ❌ Wave 0 |
| PROD-06 | createCategory, updateCategory, deleteCategory (0-product guard) | unit | `npm test -- src/actions/categories/*.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test` (full Vitest suite — fast, < 10 seconds)
- **Per wave merge:** `npm test` + manual browser smoke test of affected UI
- **Phase gate:** Full Vitest suite green + manual walkthrough of product create/edit/import/deactivate/category reorder before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/actions/products/createProduct.test.ts` — covers PROD-01 create + validation
- [ ] `src/actions/products/updateProduct.test.ts` — covers PROD-03 edit + deactivate
- [ ] `src/actions/products/importProducts.test.ts` — covers PROD-04 import logic
- [ ] `src/actions/categories/reorderCategories.test.ts` — covers PROD-06 reorder
- [ ] `src/lib/csv/parseCSV.test.ts` — covers PROD-04 parsing + price conversion
- [ ] `src/app/api/products/image/route.test.ts` — covers PROD-02 resize + upload

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2022 (rbd archived 2023) | @dnd-kit is now the standard. rbd has unresolved React 18/19 issues. |
| Fixed CSV template (owner must format) | Column mapper UI | Ongoing pattern | Better UX for importing from any supplier spreadsheet. |
| Prisma + raw pg | Supabase JS client | Project decision | No ORM — Supabase client handles typed queries. |
| Tailwind config.js | @theme block in globals.css | Tailwind v4 (2025) | CSS-native config. No tailwind.config.js in this project. |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not use.
- `react-beautiful-dnd`: Archived. Use @dnd-kit.
- `moment.js`: Replaced by `date-fns` (already in project).

---

## Code Examples

### Supabase Storage: Upload with Server Client

```typescript
// Source: Supabase docs — Storage upload via server client
const supabase = await createSupabaseServerClient()
const { data, error } = await supabase.storage
  .from('product-images')
  .upload(path, fileBuffer, { contentType: 'image/webp', upsert: false })

const { data: urlData } = supabase.storage
  .from('product-images')
  .getPublicUrl(path)
// urlData.publicUrl is the CDN URL to store in products.image_url
```

### Supabase: Query with RLS (store_id enforced by JWT)

```typescript
// No need to filter by store_id manually — RLS enforces it
const supabase = await createSupabaseServerClient()
const { data: products } = await supabase
  .from('products')
  .select('*, categories(name)')
  .eq('is_active', true)
  .order('name')
// RLS policy ensures only this store's products are returned
```

### @dnd-kit/sortable: useSortable Hook

```typescript
// Source: @dnd-kit/sortable — individual sortable item
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function CategoryRow({ category }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <button {...attributes} {...listeners} className="cursor-grab">
        {/* drag handle icon */}
      </button>
      {category.name}
    </div>
  )
}
```

### papaparse: Parse CSV Text

```typescript
// Source: papaparse docs — header mode
import Papa from 'papaparse'

const result = Papa.parse<Record<string, string>>(csvText, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim(),
})
// result.data: array of row objects
// result.meta.fields: column header names
// result.errors: parse errors per row
```

### Price Input → Cents Conversion

```typescript
// Centralised in src/lib/csv/parseCSV.ts (also used in PriceInput component)
export function parsePriceToCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '').trim()
  if (cleaned === '') return null
  const float = parseFloat(cleaned)
  if (isNaN(float) || float < 0) return null
  return Math.round(float * 100)
}
```

### Batch Upsert for CSV Import (chunked)

```typescript
'use server'
const CHUNK_SIZE = 100

export async function importProducts(rows: ProductInsert[]) {
  const supabase = await createSupabaseServerClient()
  const errors: { row: number; message: string }[] = []

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase
      .from('products')
      .upsert(chunk, { onConflict: 'sku', ignoreDuplicates: true })
    if (error) errors.push({ row: i, message: error.message })
  }

  revalidatePath('/admin/products')
  return { errors }
}
```

---

## Project Constraints (from CLAUDE.md)

All directives from `CLAUDE.md` that apply to this phase:

| Constraint | Detail |
|------------|--------|
| Always read DESIGN.md before UI decisions | Done — UI-SPEC already generated and approved |
| Tech stack non-negotiable | Next.js 16 App Router + Supabase + Tailwind v4 + Zod — no deviations |
| No Prisma | Use Supabase JS client for all queries |
| No ORM | Supabase client IS the data layer |
| No NextAuth / Clerk | Supabase Auth handles owner auth; jose for staff PIN sessions |
| Use @supabase/ssr | NOT the deprecated @supabase/auth-helpers-nextjs |
| Zod v4 validation | Every Server Action validates inputs with `z.safeParse()` |
| Money as integer cents | No floats anywhere — price_cents INTEGER enforced at DB and Zod schema |
| Tailwind v4 CSS-native | @theme block in globals.css — no tailwind.config.js |
| DM Sans body, Satoshi display, Geist Mono for SKU/data | Bunny Fonts CDN already loaded |
| No drag-and-drop on image upload | D-05 locks this — click-to-browse only |
| GSD workflow required | No direct file edits outside a GSD workflow |
| No Supabase Realtime | Refresh-on-transaction (revalidatePath) for inventory sync |

---

## Open Questions

1. **Supabase Storage bucket creation — migration vs dashboard**
   - What we know: The `product-images` bucket does not exist. It needs to be public.
   - What's unclear: Can Supabase bucket creation be done via a SQL migration (`storage.buckets` insert)? Or must it be done via the dashboard / CLI?
   - Recommendation: Use the Supabase CLI (`supabase storage create`) or a migration that inserts into `storage.buckets`. Include as a Wave 0 task. If only dashboard is available in local dev, document the step.

2. **Admin layout — AdminSidebar nav structure**
   - What we know: `src/app/(admin)/layout.tsx` is currently a bare wrapper. Phase 2 must add the `AdminSidebar` (240px, navy). The sidebar will be reused in Phase 3+ (POS reports, admin dashboard).
   - What's unclear: Which nav links to include now vs later phases. Dashboard link exists; Products link is new.
   - Recommendation: Include Dashboard + Products links. Reserve space for future links (POS Reports, Settings). Use a simple vertical nav — no complex routing logic needed yet.

3. **CSV error report download format**
   - What we know: D-09 requires a downloadable error report for invalid rows.
   - What's unclear: Should this be a client-side CSV blob download or a server-generated file?
   - Recommendation: Client-side blob generation using `URL.createObjectURL(new Blob([csvContent]))`. No server round-trip needed — the error data is already in client state after the preview step.

---

## Sources

### Primary (HIGH confidence)

- Supabase JS client (supabase-js ^2.x) — Storage API, from-bucket upload, getPublicUrl pattern
- Next.js 16 App Router — Server Actions, Route Handlers, revalidatePath — official docs (referenced in CLAUDE.md)
- @dnd-kit/sortable — useSortable, arrayMove, DndContext — npm registry confirms v10.0.0 + v6.3.1
- papaparse — header mode, skipEmptyLines, transformHeader — npm registry confirms v5.5.3
- Existing codebase: `src/actions/auth/ownerSignup.ts`, `src/schemas/product.ts`, `vitest.config.mts`, `globals.css`, `001_initial_schema.sql`

### Secondary (MEDIUM confidence)

- sharp resize pattern — well-documented, confirmed sharp is installed in project
- Supabase Storage public bucket pattern — standard Supabase Storage setup, documented in Supabase docs

### Tertiary (LOW confidence — not blocking)

- Supabase Storage bucket creation via SQL migration — not directly verified; may require CLI or dashboard. Flag for Wave 0 investigation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in npm registry, existing code confirmed
- Architecture: HIGH — patterns derived directly from existing Phase 1 code (ownerSignup.ts pattern is the template)
- Pitfalls: HIGH — derived from known Supabase Storage, Next.js image, and @dnd-kit integration points
- CSV import logic: MEDIUM — papaparse API is well-known, but chunked import + column mapper is bespoke UI work

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable libraries — @dnd-kit, papaparse, Supabase are stable; 30-day validity)
