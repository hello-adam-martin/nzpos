# Phase 19: Developer Documentation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 19-developer-documentation
**Areas discussed:** Doc format & location, Architecture depth, Server Action inventory format, Setup guide scope

---

## Doc Format & Location

### Where should developer docs live?

| Option | Description | Selected |
|--------|-------------|----------|
| docs/ folder | Dedicated docs/ directory with separate .md files. Clean separation from code. | ✓ |
| Single DEVELOPER.md | One comprehensive markdown file at repo root. Everything in one place. | |
| Expand CLAUDE.md | Add developer docs into CLAUDE.md sections. | |

**User's choice:** docs/ folder
**Notes:** None

### Should docs include visual diagrams?

| Option | Description | Selected |
|--------|-------------|----------|
| Mermaid diagrams | Inline Mermaid syntax in markdown — renders on GitHub. | ✓ |
| Text-only descriptions | Written descriptions without diagrams. | |
| You decide | Claude picks per section. | |

**User's choice:** Mermaid diagrams
**Notes:** None

### How should the docs/ folder be organized?

| Option | Description | Selected |
|--------|-------------|----------|
| Flat files with index | docs/README.md as TOC, then individual .md files. | ✓ |
| Grouped by audience | docs/developer/ and docs/contributor/ subfolders. | |
| You decide | Claude picks the most practical layout. | |

**User's choice:** Flat files with index
**Notes:** None

---

## Architecture Depth

### How deep on auth systems?

| Option | Description | Selected |
|--------|-------------|----------|
| Flow diagrams + key files | Mermaid sequence diagram per auth type plus key file references. | ✓ |
| High-level summary only | Paragraph per auth type, no file references. | |
| Deep walkthrough | Step-by-step code walkthrough with snippets. | |

**User's choice:** Flow diagrams + key files
**Notes:** None

### Cover multi-tenant request lifecycle?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, full lifecycle | Request → middleware → subdomain → tenant cache → RLS → response. | ✓ |
| Just key concepts | Explain RLS, store_id, tenant cache as concepts only. | |
| You decide | Claude judges detail level. | |

**User's choice:** Yes, full lifecycle
**Notes:** None

### Include feature gating and billing data flow?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include both | Feature gating dual-path AND Stripe billing webhook lifecycle. | ✓ |
| Feature gating only | Cover requireFeature, skip billing details. | |
| You decide | Claude picks based on developer need. | |

**User's choice:** Yes, include both
**Notes:** None

---

## Server Action Inventory Format

### How should 48 actions be organized?

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by domain | One table per domain (Auth, Orders, Products, etc.). | ✓ |
| Single flat table | All 48 actions in one alphabetical table. | |
| You decide | Claude picks most useful format. | |

**User's choice:** Grouped by domain
**Notes:** None

### What columns per action?

| Option | Description | Selected |
|--------|-------------|----------|
| Name + Auth + Input + Description | Four columns covering what a developer needs. | ✓ |
| Add response shape too | Five columns including return type. | |
| Minimal: Name + Auth only | Two columns, quick reference. | |

**User's choice:** Name + Auth + Input + Description
**Notes:** None

---

## Setup Guide Scope

### Supabase setup approach?

| Option | Description | Selected |
|--------|-------------|----------|
| Local Supabase CLI | supabase start for local Postgres + Auth. | |
| Remote Supabase project | Guide to creating a Supabase cloud project. | |
| Both paths | Document both local CLI and remote project setup. | ✓ |

**User's choice:** Both paths
**Notes:** None

### Include seed data?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include seed script | Demo store with sample products, categories, test user. | ✓ |
| No seed data | Developer starts with empty database. | |
| You decide | Claude determines if practical. | |

**User's choice:** Yes, include seed script
**Notes:** None

### Include Stripe CLI setup?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with webhook forwarding | stripe listen --forward-to for both webhook endpoints. | ✓ |
| Mention but don't detail | Note Stripe CLI is needed, link to docs. | |
| You decide | Claude judges detail needed. | |

**User's choice:** Yes, with webhook forwarding
**Notes:** None

### Troubleshooting section?

| Option | Description | Selected |
|--------|-------------|----------|
| Common gotchas section | RLS blocking, missing env vars, lvh.me routing, migrations. | ✓ |
| No troubleshooting | Happy path only. | |
| You decide | Claude determines what's worth documenting. | |

**User's choice:** Common gotchas section
**Notes:** None

---

## Claude's Discretion

- Mermaid diagram structure and detail level per diagram
- Seed script implementation (SQL vs TypeScript, data volume)
- Env var table format and grouping
- Whether additional doc files are needed beyond the four core files

## Deferred Ideas

None — discussion stayed within phase scope.
