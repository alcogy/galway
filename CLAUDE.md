You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

**Rule**
Write CLAUDE.md (this file) entirely in English, except when quoting screen items or labels.

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Project Constraints & Technical Specification

### Runtime & Deployment
- **Framework**: SvelteKit 2 + Svelte 5
- **Deployment Target**: Cloudflare Pages
- **Runtime Environment**: Cloudflare Workers Runtime (Edge Runtime)
- **Constraint**: NO Node.js native modules (`fs`, `path`, etc.). Use Web Standard APIs or Edge-compatible libraries only.

### Package Management
- **Package Manager**: Bun
- Use `bun add` / `bun remove` for dependencies.
- Use `bunx` instead of `npx`.
- Use `bun run <script>` for scripts.

### Database
- **DB**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM (`drizzle-orm/d1`)
- **Runtime access**: `platform.env.DB` binding (never `DATABASE_URL` at runtime)
- **Local dev**: Wrangler's local D1 via `getPlatformProxy()` in `hooks.server.ts`
- **Config file**: `wrangler.jsonc` (NOT `wrangler.toml`)
- **D1 binding**: `binding: "DB"`, `database_name: "aes-supplier-db"`
- **Migrations dir**: `./drizzle` (managed by drizzle-kit generate + wrangler d1 migrations apply)

## System Overview

This is a simple procurement management system (仕入管理システム).

### Core Business Functions
- **Master Management**: Manage suppliers and products
- **Receiving Management (入荷管理)**: Record incoming stock; increases inventory relatively
- **Shipping Management (出荷管理)**: Record outgoing stock; decreases inventory relatively
- **Inventory Management (在庫管理)**: Physical inventory count (棚卸) — registers actual stock quantities per product and updates inventory records

### Screens
- 仕入先管理 (Supplier Management)
- 商品管理 (Product Management)
- 入荷管理 (Receiving Management)
- 出荷管理 (Shipping Management)
- 在庫管理 (Inventory Management)

### Database Tables
- 仕入先マスタ (Supplier Master)
- 商品マスタ (Product Master)
- 仕入先商品関係 (Supplier-Product Relationship)
- 入荷伝票 (Receiving Slip)
- 入荷伝票明細 (Receiving Slip Detail)
- 出荷伝票 (Shipping Slip)
- 出荷伝票明細 (Shipping Slip Detail)
- 在庫テーブル (Inventory Table)

### UI Guidelines
- Design inspired by the Cloudflare dashboard — simple and clean.
- Basic UI and layout are already implemented.
- Dark / Light / System theme switching is available, implemented in `/src/lib/theme.svelte.ts`.
- Responsive design for PC, tablet, and smartphone.
- UI components are located in `/src/lib/components/`. Add new components there as needed.

### Implementation Plan
1. Set up local development environment for D1, package.json and configs.
2. Implement screen UIs.
3. Create DB table schemas and seed data, then run migrations.
4. Connect each screen to the DB and implement server actions.
5. Perform end-to-end verification and fix any issues found.

