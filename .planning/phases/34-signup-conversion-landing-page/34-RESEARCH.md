# Phase 34: Signup Conversion & Landing Page - Research

**Researched:** 2026-04-06
**Domain:** React component composition, conditional UI, Next.js Link navigation, marketing page CTA patterns
**Confidence:** HIGH

## Summary

Phase 34 is a narrow UI phase with two integration points: (1) adding an inline signup CTA banner below the receipt content inside `ReceiptScreen.tsx` when `demoMode` is true, and (2) adding a secondary "Try POS Demo" ghost button to `LandingHero.tsx`. Both changes touch existing components with well-established prop patterns and no new dependencies.

The technical surface is small and well-bounded. `ReceiptScreen` already accepts `onNewSale` and a `mode` prop — adding `demoMode?: boolean` follows the same pattern Phase 33 used throughout. `LandingHero` already has one `<Link>` CTA with a known styling pattern; adding a second follows normal React. No new libraries are required.

The primary planning concern is that the existing `ReceiptScreen` renders as a fixed overlay (`position: fixed`) over the POS canvas. The CTA banner must be placed inside the scrollable card content, not outside the overlay, and must not collide with the existing "New Sale" amber button.

**Primary recommendation:** Add `demoMode` prop to `ReceiptScreen`, render the CTA section between the store info footer and the existing "New Sale" button. Add a ghost button to `LandingHero` copy column immediately after the existing amber button.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Inline banner below receipt content — not overlay/modal. Appears as natural next section below receipt on ReceiptScreen.
- **D-02:** CTA includes dismiss ("Start new sale" link or close button) that resets to empty cart using existing `onNewSale` callback.
- **D-03:** CTA only appears when `demoMode` is true — production receipt screen unaffected.
- **D-04:** Confident Kiwi SaaS tone — matches Phase 28 D-07 messaging direction. Brief, action-oriented, references demo experience.
- **D-06:** CTA links to `/signup`. No query params, no tracking for v1.
- **D-07:** "Try POS Demo" button placed in hero section as secondary CTA alongside existing "Get started free" amber button.
- **D-08:** Ghost/outlined button style — white border on navy background. Amber = primary, outlined = secondary.
- **D-09:** Button navigates to `/demo/pos` via standard Next.js `<Link>`.

### Claude's Discretion

- Exact CTA copy (headline, sub-copy, button text)
- Whether CTA banner uses subtle background color or border to distinguish from receipt content
- Spacing and padding of CTA section relative to receipt
- Whether to also add "Try POS Demo" link in `LandingCTA.tsx`
- Animation/transition for CTA appearance (fade-in vs instant)

### Deferred Ideas (OUT OF SCOPE)

- 2-column signup page redesign (Stripe/Linear style with value prop panel)
- Demo-to-signup tracking/analytics (UTM params, conversion funnel metrics)
- A/B testing CTA copy variants
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONV-01 | After completing a demo sale, visitor sees a signup CTA overlay/banner | Add `demoMode` prop to `ReceiptScreen`; render CTA section conditionally inside card |
| CONV-02 | CTA links to the merchant signup page | Use `<Link href="/signup">` inside the CTA section |
| CONV-03 | Visitor can dismiss the CTA and start a new demo sale | Wire dismiss to existing `onNewSale` callback already flowing from POSClientShell |
| LAND-01 | Landing page has a visible "Try POS Demo" button | Add ghost button in `LandingHero` copy column after existing amber button |
| LAND-02 | Button navigates to `/demo/pos` | Use `<Link href="/demo/pos">` |
</phase_requirements>

---

## Standard Stack

### Core (no new installs required)

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| next/link | 16.2.1 | Client-side navigation for CTA buttons | Yes |
| React | 19.2.4 | Component composition | Yes |
| lucide-react | ^1.7.0 | Icons (optional dismiss X icon) | Yes |
| Tailwind CSS | ^4 | Utility styling for banner and ghost button | Yes |

**Installation:** None required.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline `<Link>` | `router.push('/signup')` | `<Link>` is correct for navigation — prefetches, works without JS enabled |
| Ghost button via Tailwind utilities | New CSS class or component | Tailwind utilities are the established pattern in this codebase |

---

## Architecture Patterns

### ReceiptScreen CTA Integration

The card layout in `ReceiptScreen.tsx` is a flex column (`flex flex-col`) fixed at `max-w-md` with `overflow-hidden`. The internal content flow is:

```
header (store name + check icon)
items list (flex-1, scrollable)
totals section
store info footer (conditional)
email capture (conditional, pos mode only)
"New Sale" button (conditional, only when onNewSale provided)
```

The CTA banner must be inserted **before** the "New Sale" button, so dismissing via that button remains the natural dismiss. The card already scrolls internally (`max-h-[90vh] overflow-hidden` with `flex-1 min-h-0 overflow-y-auto` on the items list), so adding content below totals is safe — the card will grow to fit until it hits `max-h-[90vh]`.

**Pattern: Conditional section within existing card**

```tsx
// Source: src/components/pos/ReceiptScreen.tsx (existing pattern confirmed)
{demoMode && onNewSale && (
  <div className="px-4 pb-4 border-t border-border-light pt-4">
    {/* CTA content */}
  </div>
)}
```

The `demoMode` guard mirrors every other demo-conditional in `POSClientShell` and `POSTopBar`.

### Prop Threading: ReceiptScreen demoMode

`POSClientShell` already passes `demoMode` to `ReceiptScreen` via the `onEmailCapture` conditional (line 482 of `POSClientShell.tsx`). The `ReceiptScreen` call at line 473-487 currently does NOT pass `demoMode`. This must be added.

`ReceiptScreenProps` must gain:
```tsx
demoMode?: boolean
```

And `POSClientShell` must pass it:
```tsx
<ReceiptScreen
  receiptData={lastReceiptData}
  onNewSale={...}
  onEmailCapture={demoMode ? undefined : ...}
  mode="pos"
  demoMode={demoMode}     // ADD THIS
/>
```

### Ghost Button Pattern (new, none exists in marketing)

No ghost/outlined button exists yet in the marketing components. Establish this pattern in `LandingHero` and document it.

Per DESIGN.md:
- Navy background: `#1E293B` (the section background)
- Ghost button on navy: white border, white text, transparent background
- Hover: slight white fill (e.g., `hover:bg-white/10`)
- Transition: `duration-150` to match the amber button pattern

```tsx
// Source: pattern derived from existing LandingHero amber button + DESIGN.md spec
<Link
  href="/demo/pos"
  className="inline-block border border-white/70 text-white px-[var(--space-xl)] py-[var(--space-sm)] rounded-md text-sm font-bold mt-[var(--space-sm)] hover:bg-white/10 transition-colors duration-150"
  aria-label="Try the POS demo"
>
  Try POS Demo
</Link>
```

**Visual hierarchy:** amber filled = primary action (signup), white outlined = secondary action (demo). Both sit in the copy column's natural flow.

### LandingHero CTA Column Structure (current)

```tsx
<div>  {/* copy column */}
  <h1>...</h1>
  <p>...</p>
  <Link href="/signup">Get started free</Link>   {/* amber button */}
  <p>No credit card required...</p>
</div>
```

After change, the two buttons can sit inline or stacked. Given the copy text below the amber button, the ghost button should appear immediately after the amber button, either:
- On the same line (flex row, gap) — works if screen width allows
- Stacked (block, `mt-[var(--space-sm)]`) — safer across breakpoints

**Recommended layout:** Wrap both buttons in a flex row with `gap-[var(--space-sm)]` and `flex-wrap` for mobile safety. This matches the Stripe/Linear pattern of side-by-side CTAs in hero sections.

### Anti-Patterns to Avoid

- **Placing CTA outside the receipt card:** The overlay is `position: fixed` — any sibling element would be obscured. All CTA content must be inside the `cardContent` div.
- **Replacing "New Sale" button with CTA:** The dismiss action is the "New Sale" button or a text link within the CTA. Do not remove the amber button — it is the primary dismiss action and is expected by existing `onNewSale` callback consumers.
- **Conditional hook calls:** Phase 33 established that `demoMode` guards use ternary or early-return logic, never conditional hooks. The CTA is pure JSX — no hooks needed.
- **Adding new state for CTA visibility:** The CTA shows whenever `demoMode && receiptData` — no separate `showCTA` state needed. Dismiss via `onNewSale` clears `lastReceiptData`, which unmounts the receipt screen entirely.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client navigation | Manual `window.location.href` | Next.js `<Link>` | Prefetching, SPA navigation, accessibility |
| Ghost button styles | Custom CSS class | Tailwind utilities | Consistent with established codebase pattern |
| CTA animation | Custom keyframe | Tailwind `animate-[fadeIn_150ms_ease-out]` | The ReceiptScreen overlay already uses this exact class for fade-in |

**Key insight:** The existing `animate-[fadeIn_150ms_ease-out]` on the ReceiptScreen overlay already provides entry animation for the entire receipt card including the CTA — no separate animation needed for the banner.

---

## Common Pitfalls

### Pitfall 1: CTA placed outside cardContent
**What goes wrong:** The banner renders outside the `max-w-md` card and is either invisible or mispositioned under the navy overlay.
**Why it happens:** The card content is built as `const cardContent = (...)` and then wrapped in the overlay div. Elements added outside `cardContent` but inside the overlay return will be hidden by the overlay background.
**How to avoid:** Insert the CTA section inside the `cardContent` variable, between the store info footer and the "New Sale" button.
**Warning signs:** CTA is not visible in the demo receipt view despite `demoMode=true`.

### Pitfall 2: ReceiptScreen used in admin without demoMode prop
**What goes wrong:** TypeScript error or undefined behavior if `ReceiptScreen` is called in admin mode without the new prop.
**Why it happens:** `ReceiptScreen` is used in both `POSClientShell` (mode="pos") and presumably admin order views (mode="admin"). Adding `demoMode` as optional (`demoMode?: boolean`) with default `false` prevents regression.
**How to avoid:** Type the prop as optional with `demoMode?: boolean` (default `false`). Admin call sites need no changes.
**Warning signs:** TypeScript errors in admin components after prop addition.

### Pitfall 3: Ghost button invisible on non-navy backgrounds
**What goes wrong:** The ghost button (white border, white text) is designed for the navy hero section. If it were copied elsewhere it would be invisible on white/card backgrounds.
**Why it happens:** The color scheme is context-dependent.
**How to avoid:** This pattern is valid only within `bg-[var(--color-navy)]` sections. Comment it as hero-specific.

### Pitfall 4: Two CTAs competing for attention equally
**What goes wrong:** Both buttons look similar in weight and users don't read hierarchy.
**Why it happens:** If ghost button padding, font-size, and weight match the amber button exactly, visual hierarchy is lost.
**How to avoid:** Amber button = primary (filled, prominent), ghost button = secondary (outlined, same size but less visual weight). Both can use the same padding/font-weight — the fill vs outline distinction is sufficient.

---

## Code Examples

### Pattern: Demo-conditional section in ReceiptScreen

```tsx
// Source: derived from existing conditional patterns in ReceiptScreen.tsx
// Insert between store info footer and the "New Sale" button

{demoMode && (
  <div className="px-4 pb-4 pt-4 border-t border-border-light">
    <p className="text-sm font-bold text-text text-center">
      Ready to set up your own store?
    </p>
    <p className="text-xs text-text-muted text-center mt-1">
      Get your POS and online store live in minutes.
    </p>
    <Link
      href="/signup"
      className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center bg-navy text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity duration-150"
    >
      Create your free store
    </Link>
  </div>
)}
```

### Pattern: Ghost secondary CTA in LandingHero

```tsx
// Source: derived from existing LandingHero amber button pattern + DESIGN.md ghost button spec

{/* CTA buttons row */}
<div className="flex flex-wrap gap-[var(--space-sm)] mt-[var(--space-lg)] items-center">
  <Link
    href="/signup"
    className="inline-block bg-[var(--color-amber)] text-white px-[var(--space-xl)] py-[var(--space-sm)] rounded-md text-sm font-bold hover:opacity-90 transition-opacity duration-150"
    aria-label="Get started free — hero call to action"
  >
    Get started free
  </Link>
  <Link
    href="/demo/pos"
    className="inline-block border border-white/70 text-white px-[var(--space-xl)] py-[var(--space-sm)] rounded-md text-sm font-bold hover:bg-white/10 transition-colors duration-150"
    aria-label="Try the POS demo"
  >
    Try POS Demo
  </Link>
</div>
<p className="text-sm text-white/50 mt-[var(--space-sm)]">
  No credit card required. NZD pricing.
</p>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `onEmailCapture` controls email section visibility | Prop-conditional sections inside card — same pattern for demoMode CTA | Established: add `demoMode` to ReceiptScreenProps the same way |
| Separate demo components | Single component with `demoMode` prop guards | No new components needed |

---

## Open Questions

1. **Should the CTA banner also appear in the "New Sale" button slot, or sit above it?**
   - What we know: D-02 says dismiss via `onNewSale` callback; the existing amber "New Sale" button already does this.
   - What's unclear: Does the UX want the amber button to remain visible below the CTA (two separate actions: "sign up" vs "start new sale"), or should the CTA replace/incorporate it?
   - Recommendation: Keep both visible — CTA for conversion, amber button as the obvious dismiss. The signed-up path is `/signup`; the dismiss path is "New Sale". Clear separation.

2. **Should `LandingCTA.tsx` also get a demo link?**
   - What we know: CONTEXT.md marks this as Claude's Discretion.
   - Recommendation: YES — add a text link "or try the demo first" below the CTA button in `LandingCTA.tsx`. Low effort, supports users who scroll to the bottom before deciding. Not a full ghost button — just a text link `text-white/60 underline` inline with the existing "Set up in under 5 minutes" copy.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase is pure UI component changes with Next.js Link navigation; no new services, CLIs, or runtimes required).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.mts` |
| Quick run command | `npm test -- --reporter=verbose src/components/pos/__tests__/` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONV-01 | CTA section renders when `demoMode=true` | unit | `npm test -- src/components/pos/__tests__/ReceiptScreen.demo.test.tsx` | Wave 0 |
| CONV-02 | CTA contains link to `/signup` | unit | same file | Wave 0 |
| CONV-03 | Dismiss calls `onNewSale` callback | unit | same file | Wave 0 |
| LAND-01 | LandingHero renders "Try POS Demo" text | unit | `npm test -- src/app/__tests__/LandingHero.test.tsx` | Wave 0 |
| LAND-02 | "Try POS Demo" link href is `/demo/pos` | unit | same file | Wave 0 |

**Note:** CONV-03's dismiss behavior (triggering `onNewSale`) results in the receipt screen being unmounted — the test can verify the callback is called with a spy.

### Sampling Rate

- **Per task commit:** `npm test -- src/components/pos/__tests__/ src/app/__tests__/`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/pos/__tests__/ReceiptScreen.demo.test.tsx` — covers CONV-01, CONV-02, CONV-03
- [ ] `src/app/__tests__/LandingHero.test.tsx` — covers LAND-01, LAND-02

*(Existing `POSClientShell.demo.test.tsx` covers POSTopBar demo mode and can be extended, but ReceiptScreen demo CTA should be in its own file for clarity.)*

---

## Project Constraints (from CLAUDE.md)

- **Stack is non-negotiable:** Next.js App Router, Supabase, Stripe, Tailwind CSS v4. No alternatives.
- **Tailwind v4:** CSS-native config. No `tailwind.config.js`. Use `var(--color-*)` and `var(--space-*)` CSS variables as seen in existing marketing components.
- **Design system:** Read `DESIGN.md` before any visual decisions. Navy `#1E293B`, amber `#E67E22`, Satoshi display, DM Sans body.
- **Testing:** Vitest (not Jest). `npm test` runs `vitest run`. New component behavior must have unit tests.
- **No Prisma, no Redux, no NextAuth, no Tailwind v3 config patterns.**
- **GSD workflow:** All file changes go through GSD commands — do not make direct edits outside `/gsd:execute-phase`.
- **No offline mode, no Realtime subscription, no Stripe Terminal SDK.**

---

## Sources

### Primary (HIGH confidence)

- `src/components/pos/ReceiptScreen.tsx` — Confirmed prop interface, card layout structure, conditional section patterns
- `src/components/pos/POSClientShell.tsx` — Confirmed `demoMode` prop flow, ReceiptScreen call site (lines 472-487), `onNewSale` callback pattern
- `src/app/(marketing)/components/LandingHero.tsx` — Confirmed existing amber button pattern, CSS variable usage, two-column layout
- `src/app/(marketing)/components/LandingCTA.tsx` — Confirmed existing CTA section structure
- `DESIGN.md` — Confirmed color tokens, spacing scale, motion duration, border radius
- `vitest.config.mts` — Confirmed test framework, environment (jsdom), setup file path

### Secondary (MEDIUM confidence)

- `src/components/pos/__tests__/POSClientShell.demo.test.tsx` — Confirmed existing demo test pattern (vi.mock pattern, makeTopBarProps factory) as reference for new test files

### Tertiary (LOW confidence)

- None — all findings verified from direct source code inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; verified from package.json
- Architecture: HIGH — verified from direct source reading of all affected files
- Pitfalls: HIGH — derived from specific code structure (fixed overlay, cardContent variable, optional prop pattern)
- Test gaps: HIGH — confirmed from directory listing and existing test file inspection

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable codebase, no fast-moving dependencies)
