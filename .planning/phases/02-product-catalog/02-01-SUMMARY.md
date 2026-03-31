---
phase: 02-product-catalog
plan: 01
subsystem: ui
tags: [dnd-kit, supabase-storage, next-image, tailwind, zod, vitest, categories, admin-sidebar]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Supabase server client, auth setup, database schema with categories table, Zod, Tailwind v4 theme tokens

provides:
  - 240px navy AdminSidebar with Dashboard and Products nav links (active state detection)
  - Admin layout updated to flex sidebar + main content
  - Category CRUD Server Actions (createCategory, updateCategory, deleteCategory, reorderCategories)
  - CategorySidebarPanel with @dnd-kit drag-and-drop reordering
  - CategoryRow with inline edit toggle, delete confirmation dialog, product count guard
  - CategoryInlineEditor with Enter/Escape keyboard support
  - Supabase Storage bucket migration for product-images
  - next.config.ts remotePatterns configured for *.supabase.co
  - Category Zod schemas (create/update/delete/reorder) with 14 passing unit tests

affects: [02-02-product-form, 02-03-product-list, 03-pos-checkout, future-admin-pages]

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core ^6.3.1"
    - "@dnd-kit/sortable ^10.0.0"
    - "papaparse ^5.5.3"
    - "@types/papaparse ^5.5.2"
  patterns:
    - "Server Actions return { success: true, data } or { error: fieldErrors } — consistent with ownerSignup pattern"
    - "Category Server Actions extract store_id from user.app_metadata.store_id (JWT claims pattern)"
    - "Client components use optimistic state updates before awaiting Server Action results"
    - "DndContext wraps SortableContext; arrayMove for optimistic reorder then server persist"
    - "CategoryRow uses useSortable with CSS.Transform for drag transform and isDragging opacity"

key-files:
  created:
    - src/schemas/category.ts
    - src/schemas/category.test.ts
    - src/actions/categories/createCategory.ts
    - src/actions/categories/updateCategory.ts
    - src/actions/categories/deleteCategory.ts
    - src/actions/categories/reorderCategories.ts
    - src/components/admin/AdminSidebar.tsx
    - src/components/admin/categories/CategorySidebarPanel.tsx
    - src/components/admin/categories/CategoryRow.tsx
    - src/components/admin/categories/CategoryInlineEditor.tsx
    - supabase/migrations/002_storage_bucket.sql
  modified:
    - src/app/(admin)/layout.tsx
    - next.config.ts
    - package.json

key-decisions:
  - "AdminSidebar is 'use client' due to usePathname for active link detection — acceptable for a layout component"
  - "CategoryRow renders confirmation dialog inline (not a portal) — simpler for v1, no z-index conflicts in current layout"
  - "createCategory extracts store_id from user.app_metadata (JWT custom claims from Phase 1) not a separate DB query"
  - "RFC 4122 v4 UUID required for Zod v4 (.uuid() validates version and variant bits) — test UUIDs must be properly formatted"

patterns-established:
  - "Pattern: Server Action returns { success: true, category } or { error: fieldErrors } with flatten()"
  - "Pattern: Optimistic UI — update local state first, then call Server Action, revert on error"
  - "Pattern: deleteCategory guards with product count check before deletion"

requirements-completed:
  - PROD-06

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 2 Plan 01: Admin Shell and Category Management Summary

**@dnd-kit drag-and-drop category management with CRUD Server Actions, navy AdminSidebar, and Supabase Storage bucket configured for product images**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-31T21:53:58Z
- **Completed:** 2026-03-31T21:59:00Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Full category CRUD: create (auto sort_order), rename (inline editor), delete (product count guard), reorder (drag-and-drop persist)
- 240px navy AdminSidebar with active state detection via usePathname, integrated into admin layout
- CategorySidebarPanel with @dnd-kit optimistic drag-and-drop + keyboard accessibility (spacebar/arrows/escape)
- 14 unit tests covering all Zod schemas — all passing (fixed RFC 4122 v4 UUID format for Zod v4 compatibility)
- Storage bucket migration + next/image configured for Supabase URLs

## Task Commits

1. **Task 1: Install deps, storage migration, next/image config** - `f99dfdf` (chore)
2. **Task 2: Category Zod schema, unit tests, CRUD Server Actions** - `c9a2060` (feat)
3. **Task 3: AdminSidebar + CategorySidebarPanel with drag-and-drop** - `f80f505` (feat)

## Files Created/Modified

- `src/schemas/category.ts` — CreateCategorySchema, UpdateCategorySchema, ReorderCategoriesSchema, DeleteCategorySchema
- `src/schemas/category.test.ts` — 14 unit tests covering all four schemas
- `src/actions/categories/createCategory.ts` — Server Action with sort_order max+1 and JWT store_id extraction
- `src/actions/categories/updateCategory.ts` — Server Action with RLS-scoped name update
- `src/actions/categories/deleteCategory.ts` — Server Action with product count guard before deletion
- `src/actions/categories/reorderCategories.ts` — Server Action iterating per-category sort_order update
- `src/components/admin/AdminSidebar.tsx` — 240px navy sidebar, usePathname active detection, Dashboard + Products links
- `src/components/admin/categories/CategorySidebarPanel.tsx` — DndContext + SortableContext, optimistic reorder, add category inline input
- `src/components/admin/categories/CategoryRow.tsx` — useSortable, 44x44 drag handle, edit/delete icons, confirmation dialog
- `src/components/admin/categories/CategoryInlineEditor.tsx` — Enter/Escape keyboard handling, updateCategory call
- `src/app/(admin)/layout.tsx` — Updated to flex layout with AdminSidebar + main content
- `next.config.ts` — remotePatterns for *.supabase.co
- `supabase/migrations/002_storage_bucket.sql` — product-images bucket with read/write/delete policies
- `package.json` — @dnd-kit/core, @dnd-kit/sortable, papaparse, @types/papaparse

## Decisions Made

- AdminSidebar marked `'use client'` for usePathname active link detection — acceptable cost for a persistent layout component
- Zod v4 requires RFC 4122 v4 UUIDs (validates version bits 1-8 and variant bits) — test UUIDs updated accordingly
- CategoryRow renders delete confirmation dialog inline rather than a portal — sufficient for v1 layout

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 UUID format stricter than v3 — test UUIDs updated**
- **Found during:** Task 2 (category schema unit tests)
- **Issue:** Zod v4's `.uuid()` validates RFC 4122 version and variant bits. The placeholder UUID `00000000-0000-0000-0000-000000000001` fails because version nibble must be 1-8 and variant bits must be 8-9/a-b/A-B
- **Fix:** Changed all test UUIDs to RFC 4122 v4 compliant `a1b2c3d4-e5f6-4789-ab01-0123456789ab`. Also updated `UpdateCategorySchema` name error test to find error by path key rather than issues[0] position
- **Files modified:** src/schemas/category.test.ts
- **Verification:** `npx vitest run src/schemas/category.test.ts` — 14/14 passing
- **Committed in:** `c9a2060` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test UUID format)
**Impact on plan:** Fix essential for test correctness. No scope creep.

## Issues Encountered

None beyond the Zod v4 UUID deviation documented above.

## Known Stubs

None — all components are functional. CategorySidebarPanel accepts `initialCategories` prop which Plan 03 will wire from the server (DB query). Plan 03 will also pass `productCounts`. Until Plan 03 creates the products page, these components are not rendered in any route — no stub data visible to users.

## Next Phase Readiness

- Category Server Actions are production-ready (Zod validated, RLS-scoped, revalidatePath called)
- CategorySidebarPanel ready to receive `initialCategories` and `productCounts` from Plan 03's server component
- AdminSidebar renders on all admin routes — Plans 02 and 03 can import it without changes
- Storage bucket migration ready to apply to Supabase instance
- next/image configured for Supabase Storage URLs — product images in Plan 02 can use `<Image>` component

## Self-Check: PASSED

All 12 created/modified files verified present. All 3 task commits verified in git log.

---
*Phase: 02-product-catalog*
*Completed: 2026-03-31*
