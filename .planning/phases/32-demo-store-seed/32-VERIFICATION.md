---
phase: 32-demo-store-seed
verified: 2026-04-06T09:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 32: Demo Store Seed Verification Report

**Phase Goal:** Create demo store seed data — idempotent SQL migration with realistic NZ retail store, 20 products across 5 categories, and TypeScript constants.
**Verified:** 2026-04-06
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                        | Status     | Evidence                                                                                           |
| --- | -------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| 1   | A demo store named 'Aroha Home & Gift' exists with NZ business details                       | VERIFIED | `032_demo_store_seed.sql` line 38: `'Aroha Home & Gift'`, Wellington address, IRD number          |
| 2   | The store has exactly 20 products across 5 categories with NZD tax-inclusive prices          | VERIFIED | 20 product INSERT rows confirmed (c000-000000000001..020), 5 category rows (b000-000000000001..005) |
| 3   | Every product has a placeholder image URL and a unique SKU                                   | VERIFIED | CAN-001..004, HOM-001..004, PRT-001..004, KIT-001..004, JWL-001..004; `/demo/placeholder-*.svg` URLs |
| 4   | Running the migration twice produces the same result with zero duplicate records             | VERIFIED | Every INSERT section uses `ON CONFLICT (id/store_id) DO NOTHING` — 6 ON CONFLICT clauses total    |
| 5   | DEMO_STORE_ID constant is importable from src/lib/constants.ts                               | VERIFIED | `export const DEMO_STORE_ID = '00000000-0000-4000-a000-000000000099'` at line 5                   |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact                                     | Expected                                          | Status   | Details                                                                 |
| -------------------------------------------- | ------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `supabase/migrations/032_demo_store_seed.sql` | Idempotent seed migration for store/categories/products | VERIFIED | 107 lines; 5 sections; 6 ON CONFLICT clauses; all prices integers      |
| `src/lib/constants.ts`                        | DEMO_STORE_ID and DEV_STORE_ID constants          | VERIFIED | Exports both constants; DEMO_STORE_ID matches migration UUID exactly    |
| `public/demo/store-logo.svg`                  | Deep navy #1E293B with AHG initials, 200x200      | VERIFIED | `fill="#1E293B"`, `AHG` text, valid SVG with xmlns attribute           |
| `public/demo/placeholder-candles.svg`         | Amber #E67E22 with letter C, 400x400              | VERIFIED | `fill="#E67E22"`, letter `C`, valid SVG                                |
| `public/demo/placeholder-homewares.svg`       | Deep navy #1E293B with letter H, 400x400          | VERIFIED | `fill="#1E293B"`, letter `H`, valid SVG                                |
| `public/demo/placeholder-prints.svg`          | Purple #7C3AED with letter P, 400x400             | VERIFIED | `fill="#7C3AED"`, letter `P`, valid SVG                                |
| `public/demo/placeholder-kitchen.svg`         | Green #059669 with letter K, 400x400              | VERIFIED | `fill="#059669"`, letter `K`, valid SVG                                |
| `public/demo/placeholder-jewellery.svg`       | Red #DC2626 with letter J, 400x400                | VERIFIED | `fill="#DC2626"`, letter `J`, valid SVG                                |

---

### Key Link Verification

| From                   | To                                        | Via                                          | Status   | Details                                                                                    |
| ---------------------- | ----------------------------------------- | -------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `src/lib/constants.ts` | `supabase/migrations/032_demo_store_seed.sql` | shared UUID `00000000-0000-4000-a000-000000000099` | VERIFIED | UUID appears in constants.ts line 5 as `DEMO_STORE_ID`; appears in migration as store id, auth user id, and all FK references |

---

### Data-Flow Trace (Level 4)

Not applicable. This phase produces static seed data (SQL migration + constants). There are no components or API routes that render dynamic data — those are Phase 33 deliverables.

---

### Behavioral Spot-Checks

| Behavior                                    | Command                                                                                       | Result                      | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| Migration has at least 5 ON CONFLICT clauses | `grep -c "ON CONFLICT" supabase/migrations/032_demo_store_seed.sql`                          | 6                           | PASS   |
| Exactly 20 product rows inserted            | count of c000-prefix UUID rows in VALUES block                                                | 20                          | PASS   |
| Exactly 5 category rows inserted            | count of b000-prefix UUID rows in VALUES block                                                | 5                           | PASS   |
| All prices are integers (no decimals)       | `grep -E "price_cents.*\." migration`                                                         | 0 matches                   | PASS   |
| All 20 SKUs present with correct prefixes   | `grep -oE "CAN-[0-9]+\|HOM-[0-9]+\|PRT-[0-9]+\|KIT-[0-9]+\|JWL-[0-9]+"` migration         | 20 SKUs (4 per category)    | PASS   |
| DEMO_STORE_ID exported with correct UUID    | `grep "00000000-0000-4000-a000-000000000099" src/lib/constants.ts`                            | export const DEMO_STORE_ID  | PASS   |
| All 6 SVG files exist in public/demo/       | `ls public/demo/`                                                                             | 6 files listed              | PASS   |
| SVG files are valid XML with xmlns          | Read each file; all contain `xmlns="http://www.w3.org/2000/svg"`                             | All 6 valid                 | PASS   |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                 | Status    | Evidence                                                                    |
| ----------- | ----------- | --------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| DEMO-01     | 32-01-PLAN  | Demo store exists in DB with store name, logo, and NZ business details      | SATISFIED | Store row with name, logo_url, address, ird_gst_number in migration section 2 |
| DEMO-02     | 32-01-PLAN  | Demo store has ~20 products across 4+ categories with realistic NZD prices  | SATISFIED | Exactly 20 products, 5 categories, prices 999–8999 cents (NZD tax-inclusive) |
| DEMO-03     | 32-01-PLAN  | Demo store products have placeholder images and valid SKUs                  | SATISFIED | All 20 products have `/demo/placeholder-*.svg` image_url and unique SKUs    |
| DEMO-04     | 32-01-PLAN  | Demo store has seed migration or script that is idempotent (re-runnable)    | SATISFIED | 6 ON CONFLICT DO NOTHING clauses cover auth.users, stores, store_plans, categories (batch), products (batch) |

All 4 requirements for Phase 32 are satisfied. No orphaned requirements — REQUIREMENTS.md maps DEMO-01 through DEMO-04 exclusively to Phase 32, all accounted for.

---

### Anti-Patterns Found

No anti-patterns detected.

- No TODO/FIXME/PLACEHOLDER comments in any deliverable file
- No hardcoded empty arrays or objects used as final data
- No stub implementations — migration contains full, realistic data
- Prices are integers throughout (correct for price_cents column)
- `setup_completed_steps` uses integer `0` (correct per migration 018, not JSONB as the plan draft suggested — this was a plan error that was correctly resolved)

---

### Human Verification Required

#### 1. Migration applies cleanly against real Supabase instance

**Test:** Run `supabase db reset` against a local Supabase instance and then query: `SELECT COUNT(*) FROM products WHERE store_id = '00000000-0000-4000-a000-000000000099'`
**Expected:** Returns 20
**Why human:** Requires a running local Supabase instance; cannot verify SQL execution programmatically from file inspection alone.

#### 2. Migration is idempotent under `supabase db reset`

**Test:** Run `supabase db reset` twice in succession; confirm no duplicate key errors and row counts remain at 1 store, 5 categories, 20 products.
**Expected:** Second reset produces identical state, zero errors.
**Why human:** Requires a running local Supabase instance.

#### 3. SVG placeholder images render correctly in browser

**Test:** Start the dev server and open `/demo/placeholder-candles.svg` and `/demo/store-logo.svg` in a browser.
**Expected:** Colored square with white letter visible; store logo shows "AHG" on navy background.
**Why human:** Visual rendering cannot be verified programmatically.

---

### Gaps Summary

No gaps. All 5 must-have truths are verified, all 8 artifacts exist and are substantive, the key UUID link between constants.ts and the migration is confirmed, and all 4 requirements are satisfied. The phase goal is fully achieved.

The only items routed to human verification are integration-level checks (migration execution against a live database and SVG visual rendering) that are outside the scope of static code analysis.

---

_Verified: 2026-04-06T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
