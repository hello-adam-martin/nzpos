---
phase: 02-product-catalog
plan: 04
subsystem: csv-import
tags: [csv, import, papaparse, bulk-upload, server-action, ui-flow]
dependency_graph:
  requires:
    - 02-01 (categories Server Actions — createCategory pattern)
    - 02-02 (money.ts parsePriceToCents, product schema)
  provides:
    - src/lib/csv/parseCSV.ts (parseCSVText)
    - src/lib/csv/validateRows.ts (validateImportRows, ColumnMapping, ValidatedRow)
    - src/lib/csv/generateErrorReport.ts (generateErrorCSV)
    - src/actions/products/importProducts.ts (importProducts)
    - src/components/admin/csv/CSVImportFlow.tsx (3-step modal state machine)
  affects:
    - /admin/products page (CSV import flow accessible via ImportCSVButton)
tech_stack:
  added:
    - papaparse ^5.5.3 (CSV parsing — already in package.json, installed in worktree)
  patterns:
    - Client state machine with lifted inter-step state (no mapping reset on back navigation)
    - Chunked batch insert (CHUNK_SIZE = 100) in Server Action
    - Auto-category creation per D-10 via direct Supabase insert in importProducts
    - parsePriceToCents imported from money.ts — not re-implemented
    - Blob download for error report CSV via URL.createObjectURL
key_files:
  created:
    - src/lib/csv/parseCSV.ts
    - src/lib/csv/parseCSV.test.ts
    - src/lib/csv/validateRows.ts
    - src/lib/csv/validateRows.test.ts
    - src/lib/csv/generateErrorReport.ts
    - src/actions/products/importProducts.ts
    - src/components/admin/csv/CSVImportFlow.tsx
    - src/components/admin/csv/CSVUploadStep.tsx
    - src/components/admin/csv/ColumnMapperStep.tsx
    - src/components/admin/csv/ImportPreviewTable.tsx
    - src/components/admin/csv/ImportSummaryBar.tsx
  modified: []
decisions:
  - papaparse used for both parse (parseCSVText) and unparse (generateErrorCSV) — consistent library, no manual CSV string construction
  - validateImportRows takes empty Sets/Maps in preview step — actual DB duplicate detection happens server-side at insert time; preview shows structural validation only
  - buildInitialMapping exported from ColumnMapperStep for reuse in CSVImportFlow (avoids duplication)
  - importProducts does NOT call createCategory Server Action in a loop — uses direct Supabase insert to avoid redundant auth checks per plan spec
metrics:
  duration: "~10 minutes"
  completed: "2026-04-01"
  tasks: 2
  files: 11
---

# Phase 02 Plan 04: CSV Import Flow Summary

CSV import feature with papaparse parsing, row validation, auto-category creation, and a 3-step modal UI (Upload → Map Columns → Review & Import) with error report download.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | CSV parsing library, row validation, error report generation, and import Server Action | c19d64e | parseCSV.ts, validateRows.ts, generateErrorReport.ts, importProducts.ts, 2 test files |
| 2 | CSV import 3-step UI flow | b811bf7 | CSVImportFlow.tsx, CSVUploadStep.tsx, ColumnMapperStep.tsx, ImportPreviewTable.tsx, ImportSummaryBar.tsx |

## What Was Built

**Task 1 — Server-side CSV infrastructure:**

- `parseCSV.ts`: papaparse wrapper that trims headers, skips empty lines, handles quoted commas. Exports `parseCSVText(csvText) -> { headers, rows }`.
- `validateRows.ts`: validates each row against product requirements. Uses `parsePriceToCents` from `money.ts` (not re-implemented). Returns `ValidatedRow[]` with status `new | duplicate | invalid`. Fuzzy category lookup by lowercase name in `existingCategories` Map; unmatched categories stored as `category_name` for Server Action auto-creation.
- `generateErrorReport.ts`: `generateErrorCSV(invalidRows)` produces a CSV string with Row Number, Name, SKU, Error columns using Papa.unparse.
- `importProducts.ts`: Server Action (`'use server'`). Gets `store_id` from JWT `app_metadata`. Auto-creates missing categories via direct Supabase insert (D-10). Inserts in chunks of 100 (`CHUNK_SIZE = 100`). Calls `revalidatePath('/admin/products')`. Returns `{ success, imported, errors }`.

**Task 2 — 3-step UI flow:**

- `CSVImportFlow.tsx`: Modal overlay with step state machine (`upload | map | preview | committing | done`). All inter-step state lifted to this component (csvText, parsedCSV, columnMapping, validatedRows) — prevents mapping reset on back navigation. 3-step indicator shows completed checkmarks and active underline per UI-SPEC.
- `CSVUploadStep.tsx`: File picker (`.csv` only), FileReader.readAsText, shows filename + row/column count.
- `ColumnMapperStep.tsx`: Two-column table layout. Fuzzy header matching pre-fills dropdowns. Required fields (name, price) marked with red asterisk. Next disabled until both required fields mapped.
- `ImportPreviewTable.tsx`: First 10 rows, colour-coded (green=new, amber=duplicate, red=invalid). Inline error messages per row. "Download Error Report ({N} rows)" ghost button triggers Blob download. "Import {N} Products" navy button disabled when 0 valid rows. Confirmation copy matches UI-SPEC exactly.
- `ImportSummaryBar.tsx`: Pill badges: emerald (new count), amber (skipped), red (errors).

## Verification Results

- `npx vitest run src/lib/csv/` — 16/16 tests pass
- `npx tsc --noEmit` — 0 errors
- `npx vitest run` (full suite) — 56 passed, 1 skipped (pre-existing)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Deviation: npm install required in worktree

**Found during:** Task 1 verification
**Issue:** papaparse was in package.json but node_modules in the worktree was empty. Vitest failed to resolve `import Papa from 'papaparse'`.
**Fix:** Ran `npm install` in the worktree to populate node_modules.
**Type:** [Rule 3 - Blocking Issue] — missing dependency blocking test execution.

## Known Stubs

None — all data paths are wired. The preview step uses empty Sets/Maps for existingSKUs and existingCategories, which means preview shows structural validation only (missing name, invalid price) but not server-side duplicate detection. This is intentional: the Server Action handles DB-level uniqueness at insert time. The plan spec documents this pattern.

## Self-Check: PASSED
