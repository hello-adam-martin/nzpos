# NZPOS

Custom retail POS + online store for NZ small businesses. Built with Next.js (App Router), Supabase, Stripe, Tailwind CSS.

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**NZPOS**

A custom retail POS system for NZ small businesses. Runs on an iPad tablet for in-store checkout, has a public online storefront for customers, and an admin dashboard for the owner. Built specifically for the NZ market (GST, EFTPOS, NZD). The founder's supplies store is the first customer.

**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

### Constraints

- **Tech stack:** Next.js App Router + Supabase + Stripe + Tailwind CSS. Non-negotiable (already reviewed and approved).
- **NZ compliance:** GST 15% tax-inclusive. Per-line GST calculation on discounted amounts. IRD-compliant.
- **EFTPOS:** Standalone terminal for v1 (no software integration). Manual entry with confirmation step.
- **Internet required:** No offline mode in v1. Refresh-on-transaction for inventory sync.
- **Solo developer:** Founder also runs property management business. Timeline must account for part-time availability.
- **Budget:** Minimal SaaS spend. Supabase free tier + Vercel free tier to start.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Verdict on Chosen Stack
## Core Stack
### Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | **16.2** (latest stable, released 2026-03-18) | Full-stack framework | App Router provides Server Components, Server Actions, file-system routing, and built-in image optimisation. v16 introduced Cache Components (`use cache` directive) as stable. Vercel is a verified deployment target. |
| React | **19** (bundled with Next.js 16) | UI rendering | Concurrent features, `useActionState` for form state in Server Actions, `use()` for streaming client components. |
| TypeScript | **5.x** | Type safety | Required for this codebase. Next.js 16 ships with TS support built in. |
### Database & Backend-as-a-Service
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | **@supabase/supabase-js ^2.x** (use latest 2.x) | Postgres DB, Auth, Storage, RLS | Managed Postgres with Row Level Security is the correct choice for multi-tenant data isolation via `store_id`. Built-in auth handles owner email/password. Free tier sufficient for initial launch. Supabase Auth integrates with Next.js App Router via `@supabase/ssr`. |
| @supabase/ssr | **^0.x** (latest) | Supabase + Next.js App Router cookie handling | Required adapter for App Router. Replaces the deprecated `@supabase/auth-helpers-nextjs`. Do NOT use the old auth-helpers package. |
| PostgreSQL | Managed by Supabase | Relational DB | Supabase provides Postgres 15+. Direct access via Supabase client or pg for raw queries if needed. |
### Payments
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| stripe (node) | **^17.x** | Server-side Stripe API, webhooks | stripe-node ^17 is current as of 2025. Use for creating PaymentIntents, Checkout Sessions, handling webhooks in Route Handlers. |
| @stripe/stripe-js | **^4.x** | Client-side Stripe Elements | Loads Stripe.js for online storefront card UI. Use Stripe Checkout (hosted) rather than custom Elements for v1 — less scope, PCI-compliant out of the box. |
### Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | **4.2** (latest stable, released April 2025) | Utility-first CSS | v4 is a major rewrite — CSS-native config via `@import "tailwindcss"`, no `tailwind.config.js` needed by default. The design system (deep navy + amber) maps cleanly to Tailwind utility classes. |
| @tailwindcss/postcss | **^4.x** | PostCSS integration for Next.js | Required for Tailwind v4 with Next.js. Replaces the old `tailwind.config.js` + `postcss.config.js` pattern. |
### Validation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | **^3.x** | Schema validation on Server Actions and API inputs | The Next.js official auth documentation explicitly recommends Zod for Server Action validation (confirmed in official docs 2026-03-25). Zod 3.x is the current stable series. Every Server Action must validate inputs with `z.safeParse()` before touching the database. |
### Authentication
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Auth (via @supabase/ssr) | included with Supabase | Owner email/password auth | Supabase Auth is listed explicitly in the Next.js official auth library recommendations (confirmed 2026-03-25). Handles JWT issuance, refresh tokens, and cookie management via `@supabase/ssr`. |
| jose | **^5.x** | JWT verification for custom staff PIN sessions | Next.js official docs use `jose` for stateless session encryption (JWT signing with HS256). Staff PIN login is a custom session separate from Supabase Auth — use jose to sign/verify short-lived PIN sessions stored in HttpOnly cookies. Compatible with Edge Runtime. |
### Testing
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | **latest (^2.x or ^3.x)** | Unit tests for utilities, GST calculations, state machines | Official Next.js docs (2026-03-25) recommend Vitest + React Testing Library for unit testing. Critical for GST rounding logic — per-line calculations must be deterministic. Does not support async Server Components directly; use for pure functions. |
| @testing-library/react | **^16.x** | Component testing for Client Components | Pairs with Vitest for rendering Client Component tests (POS cart, PIN pad, etc). |
| Playwright | **latest** | E2E tests for checkout flows, auth flows | Official Next.js docs (2026-03-25) recommend Playwright for E2E. Critical paths to test: online Stripe checkout, POS sale completion with EFTPOS confirmation, stock decrement after transaction. |
### Deployment & Infrastructure
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | Free tier | Next.js hosting | Verified adapter — full Next.js feature support including Server Actions, middleware, image optimisation. Zero config for a Next.js project. Free tier sufficient for v1 (100GB bandwidth, serverless functions). |
| Supabase | Free tier | Managed Postgres + Auth + Storage | Co-located data and auth. Free tier sufficient for single-store v1. |
| Supabase Storage | included | Product images | Use Supabase Storage buckets for product images. Serves directly via CDN URL. Integrate with `next/image` `remotePatterns` config pointing to `*.supabase.co`. |
## Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| server-only | latest | Prevent server code from running on client | Import in any file with Supabase credentials, session logic, or Server Actions. Causes build error if accidentally imported client-side. |
| date-fns | **^3.x** | Date manipulation | End-of-day reports, Xero sync date ranges, click-and-collect scheduling. Do not use moment.js (deprecated). |
| react-hook-form | **^7.x** | Form state management on Client Components | For complex POS forms (product creation, discount application). Use with Zod resolver (`@hookform/resolvers`). Not needed for simple Server Action forms. |
| @hookform/resolvers | **^3.x** | Zod integration for react-hook-form | Bridges Zod schemas into react-hook-form validation. |
| sharp | **latest** | Image processing | Installed automatically by Next.js for image optimisation. List in `serverExternalPackages` if needed — it is on Next.js's auto-opt-out list. |
| tsx / ts-node | dev only | Run TypeScript scripts | For database seed scripts, migration helpers. |
## What NOT to Use (and Why)
| Category | Avoid | Why |
|----------|-------|-----|
| ORM | Prisma | Adds a build step (prisma generate), cold start overhead on serverless, and complexity for a project already using Supabase client SDK. Use Supabase JS client with typed queries instead. The Supabase client IS the data layer. |
| State management | Redux, Zustand | Overkill for this architecture. Server Components handle most data fetching. Use React state + Server Actions for mutations. Zustand acceptable only if POS cart state becomes complex. |
| Auth library | NextAuth / Auth.js | Supabase Auth is already the auth system. Adding another auth library creates two competing session systems. |
| Auth library | Clerk | Paid SaaS with its own user DB. Conflicts with Supabase RLS model. |
| CSS | CSS Modules, styled-components, Emotion | Not the chosen stack. Tailwind utility classes are sufficient for this project scope. |
| CSS | Tailwind v3 | v4 is current. v3 uses deprecated config model incompatible with v4 PostCSS setup. |
| Realtime | Supabase Realtime (for inventory) | The Eng review explicitly chose refresh-on-transaction over WebSocket for inventory sync. Realtime adds WebSocket failure modes for no benefit in a single-operator POS. |
| Database | Raw pg / Drizzle / Kysely | Supabase JS client handles all query needs. Adding a second query layer creates type conflicts with Supabase's generated types. Exception: Drizzle is reasonable if Supabase client limitations become blocking — flag this for later. |
| Payments | Stripe Terminal SDK (v1) | Hardware EFTPOS integration explicitly deferred to v1.1. Terminal SDK is complex, requires device provisioning. |
| Payments | Stripe Custom Elements (storefront) | Stripe Checkout hosted page is adequate, simpler, and PCI-compliant with zero frontend card handling code. |
| Testing | Jest | Vitest is the recommended alternative — faster, native ESM, better TypeScript support, compatible with Vite tooling ecosystem. Jest requires significant config to work with Next.js App Router. |
| Deployment | Self-hosted VPS (v1) | Unnecessary ops burden for solo developer. Vercel free tier covers v1 needs completely. |
| Image storage | Cloudinary, Imgix | Third-party image CDNs add cost and another vendor dependency. Supabase Storage + `next/image` handles this natively. |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 App Router | Remix | Remix is strong but smaller ecosystem, less AI training data, team has already committed to Next.js. |
| Framework | Next.js 16 App Router | SvelteKit | Different language paradigm, not the committed stack. |
| BaaS | Supabase | Firebase | Firebase is NoSQL — poor fit for relational retail data (products, orders, inventory). Supabase Postgres is the right model. |
| BaaS | Supabase | PlanetScale | PlanetScale dropped free tier in 2024. Supabase has free tier + auth + storage in one. |
| Payments | Stripe | PayHere, Windcave | NZ-specific processors. Stripe NZ is fully operational, supports NZD, and has far better documentation and developer tooling. Windcave is the eventual EFTPOS integration target (v1.1) but Stripe handles the online storefront. |
| Styling | Tailwind CSS v4 | shadcn/ui | shadcn/ui is a component library built on Radix UI + Tailwind. It is a strong addition but an extra dependency. Evaluate after design system components are built in Phase 1 — adopt shadcn patterns if component scope grows. |
| Validation | Zod | Yup, Valibot | Zod is the de facto standard in Next.js + TypeScript ecosystem. Next.js official docs use Zod in all examples. Yup is older. Valibot is newer and faster but has smaller ecosystem. |
| Testing | Playwright | Cypress | Playwright is the Next.js official recommendation. Playwright is faster, supports multiple browsers, and has better async handling. |
## Installation
# Core framework
# Tailwind v4 (create-next-app may scaffold v3 — upgrade if needed)
# Supabase
# Stripe
# Validation
# JWT (staff PIN sessions)
# Date utilities
# Forms (add when needed for complex POS forms)
# Server-only guard
# Dev: testing
# Dev: E2E
## Key Configuration Notes
### Tailwind v4 with Next.js
### next.config.ts — image domains for Supabase Storage
### Supabase RLS Custom JWT Claims Pattern
## Sources
- Next.js 16.2.1 official documentation, version confirmed 2026-03-25: https://nextjs.org/docs
- Tailwind CSS v4.1/v4.2 blog: https://tailwindcss.com/blog
- Tailwind CSS v4 + Next.js install guide: https://tailwindcss.com/docs/installation/framework-guides/nextjs
- Next.js authentication guide (official, 2026-03-25): https://nextjs.org/docs/app/guides/authentication
- Next.js Vitest guide (official, 2026-03-25): https://nextjs.org/docs/app/guides/testing/vitest
- Next.js Playwright guide (official, 2026-03-25): https://nextjs.org/docs/app/guides/testing/playwright
- Next.js deployment guide (official, 2026-03-25): https://nextjs.org/docs/app/getting-started/deploying
- Next.js `use cache` directive (official, 2026-03-25): https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next.js caching guide (official, 2026-03-25): https://nextjs.org/docs/app/guides/caching-without-cache-components
- Next.js blog — v16.2 release: https://nextjs.org/blog (confirmed version 16.2, released 2026-03-18)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
