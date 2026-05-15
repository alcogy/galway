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

### DB Mutation Rules (enforced across all +page.server.ts / +server.ts)
1. **Always wrap INSERT / UPDATE / DELETE in try/catch.** Return `fail(500, { error: '...' })` on unexpected errors.
2. **Use `db.transaction(async (tx) => { ... })` whenever two or more related tables are mutated together.** Use `tx` instead of `db` for all operations inside. Do NOT use `db.batch()` — use sequential `await tx.operation()` calls instead.
3. **Slip number conflict handling:** Catch `UNIQUE constraint failed` on `slip_number` and return `fail(409, { error: '伝票番号が競合しました。再度お試しください。' })`.
4. **Redirect after mutation** must be placed *outside* the try/catch block so the SvelteKit redirect is not swallowed.

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
- `accounts` — User accounts (email, password_hash, name, role: admin|general)
- `suppliers` — 仕入先マスタ (name, tel, fax, zipcode, address, email; no code — identified by name)
- `products` — 商品マスタ (code unique, name, unit, description)
- `supplier_products` — 仕入先商品関係 (supplier_id + product_id, unique constraint)
- `receiving_slips` — 入荷伝票 (slip_number unique, received_at, supplier_id FK, account_id FK, note)
- `receiving_slip_details` — 入荷伝票明細 (slip_id FK cascade, product_id FK, line_no, quantity: real)
- `shipping_slips` — 出荷伝票 (slip_number unique, shipped_at, account_id FK, note)
- `shipping_slip_details` — 出荷伝票明細 (slip_id FK cascade, product_id FK, line_no, quantity: real)
- `inventory` — 在庫 (product_id PK FK, quantity: real, updated_at)

### UI Guidelines
- Design inspired by the Cloudflare dashboard — simple and clean.
- Basic UI and layout are already implemented.
- Dark / Light / System theme switching is available, implemented in `/src/lib/theme.svelte.ts`.
- Responsive design for PC, tablet, and smartphone.
- UI components are located in `/src/lib/components/`. Add new components there as needed.
- The project in ../aes-crm/ should be referenced for its UI layout, composition, and design concepts. For more detailed application, see the UI layout, configuration, and design concepts of the project in ../aes-crm/.

### Implementation Plan
1. ✅ Set up local development environment for D1, package.json and configs.
2. ✅ Implement screen UIs.
3. ✅ Create DB table schemas and seed data, then run migrations.
4. ✅ Connect each screen to the DB and implement server actions.
5. ✅ Perform end-to-end verification and fix any issues found.

## Implementation Status

### Plan 1 — Completed
- `wrangler.jsonc`: D1 binding added (`binding: "DB"`, `database_name: "aes-supplier-db"`)
- `drizzle.config.ts`: Simplified (no `DATABASE_URL`; uses sqlite dialect)
- `src/lib/server/db/index.ts`: Replaced `@libsql/client` with `drizzle-orm/d1`; exports `getDb(d1: D1Database)`
- `src/hooks.server.ts`: `getPlatformProxy<Env>()` provides D1 in local dev (`vite dev`)
- `src/app.d.ts`: `App.Locals.user` type added
- `worker-configuration.d.ts`: Generated by `wrangler types` — provides `interface Env { DB: D1Database; ASSETS: Fetcher; }`
- Scripts: `db:generate`, `db:migrate:local`, `db:migrate:remote`, `db:seed:local`

### Plan 2 — Completed
All screens implemented with mock data. Current mock data lives directly in each `+page.server.ts`.
Fine-tuning adjustments are deferred until after DB connection (Plan 4).

#### Route Structure
```
src/routes/(app)/
  +page.svelte / +page.server.ts       — Dashboard (4 stat cards)
  suppliers/                            — Supplier list + create/edit/delete modal + CSV import/export
  products/                             — Product list + create/edit/delete modal + CSV import/export
  receiving/                            — Receiving slip list (row-click → detail) + CSV import
  receiving/new/                        — Receiving slip create page
  receiving/[id]/                       — Receiving slip detail + CSV download
  receiving/[id]/edit/                  — Receiving slip edit page
  receiving/[id]/export/+server.ts      — CSV download endpoint (明細; filename includes 仕入先名 and 入荷日)
  shipping/                             — Shipping slip list (row-click → detail) + CSV import
  shipping/new/                         — Shipping slip create page
  shipping/[id]/                        — Shipping slip detail + CSV download
  shipping/[id]/edit/                   — Shipping slip edit page
  shipping/[id]/export/+server.ts       — CSV download endpoint (明細; filename includes 出荷日)
  inventory/                            — Inventory list + 棚卸登録 modal + CSV import/export
  inventory/export/+server.ts           — CSV download endpoint (在庫一覧)
```

#### Key UI Patterns
- **Row-click navigation**: Receiving and shipping lists use `onrowclick={(row) => goto('/receiving/${row.id}')}` — no action column
- **Detail page layout**: back link → page header with actions (CSV download, 編集 button) → 伝票情報 Card (dl grid) → 明細 Table section → 削除 danger zone
- **Create/Edit as pages**: Receiving and shipping slips use dedicated pages (not modals). Line items serialized as JSON in a hidden input (`name="details"`). Edit pages use `$effect` to set initial state from data.
- **Form page layout**: back link → page header → Card containing the form → form-actions at bottom inside card
- **担当者 (person in charge)**: Displayed on slip detail pages. On create: set automatically from the logged-in account. On edit: admins can change it via a `SearchableSelect` field; non-admins cannot (field hidden, server ignores submitted value).
- **Numeric columns**: `Table.svelte` `Column` interface has `numeric?: boolean`. When true: right-aligns the cell and formats via `Number(val).toLocaleString('ja-JP')`.
- **CSV import on list pages**: Receiving and shipping lists have a CSVインポート button (Upload icon) that opens `SlipCsvImportDialog`. Inventory list uses `CsvImportDialog`. On success, calls `invalidateAll()` and shows an `importNotification` banner (auto-dismisses after 6 s). All import actions are fully implemented.
- **CSV download endpoints**: `+server.ts` GET routes returning `text/csv; charset=utf-8` with UTF-8 BOM (`\uFEFF`). Japanese filenames use RFC 5987 encoding: `filename*=UTF-8''${encodeURIComponent(filename)}`.
- **Pagination**: All lists paginated 20 items/page; `.table-with-pagination` wrapper removes bottom border-radius from Table so Pagination attaches seamlessly
- **Server-side search**: All list pages (suppliers, products, inventory, accounts) use server-side search via URL params (`?search=...&page=N`). Search triggers `goto()` on form submit; page change via `handlePageChange(n)`. Initialize `searchQuery` from `page.url.searchParams.get('search')` using `import { page } from '$app/state'`. No client-side `$derived` filtering.
- **`$state` init rule**: Never initialize `$state` from `data.*` directly — use empty string/null and set values in `$effect` or handler functions (autofixer flags this)
- **Slip list columns**: Receiving list shows 伝票番号, 仕入先, 入荷日, 品目数, 担当者. Shipping list shows 伝票番号, 出荷日, 品目数, 担当者.

#### Components (`src/lib/components/`)
- `Select.svelte`: Styled `<select>` wrapper; value must be `$bindable()`
- `SearchableSelect.svelte`: Searchable dropdown; `position: fixed` panel positioned via `getBoundingClientRect()` on click event to escape `overflow: hidden` parents; hidden `<input type="hidden">` for form submission; `{@attach (node) => { node.focus(); }}` for search input auto-focus; Props — `options`, `placeholder`, `value=$bindable('')`, `name`, `disabled`, `error`
- `Table.svelte`: Accepts `columns`, `rows`, `onrowclick`, `actions` snippet, `cell` snippet, `empty` snippet
- `Card.svelte`: Accepts `title` and `children`; `card-body` has `padding: var(--space-xl)` — override with `:global(.card-body)` for full-width content
- `CsvImportDialog.svelte`: Used in suppliers and products pages (append/replace mode + file drop zone)
- `SlipCsvImportDialog.svelte`: Used in receiving and shipping list pages; append-only; Props — `open=$bindable()`, `title`, `dateLabel='入荷日'`, `suppliers?: {id,name}[]` (omit for shipping), `onimport?: (file, date, supplierId?) => void`; expected CSV columns: 商品コード, 商品名, 数量
- `Pagination.svelte`: Props — `totalItems`, `itemsPerPage`, `currentPage`, `onPageChange`
- `ReceivingSlipForm.svelte`: Shared form for receiving slip create/edit. Props — `suppliers`, `products`, `accounts?`, `isAdmin?=false`, `initialData?` (undefined = create mode), `oncancel?`. Derives `action` (`?/create`|`?/update`) and `submitLabel` (登録|更新) from `initialData`. Uses `$effect` to initialize mutable state from `initialData`. Shows 担当者 `SearchableSelect` when `isAdmin=true`.
- `ShippingSlipForm.svelte`: Same as ReceivingSlipForm but without supplier field; uses `shipped_at` instead of `received_at`.

#### Known Pre-existing Type Errors
- `Module '"$lib/components"' has no exported member 'SearchableSelect'` — SearchableSelect is exported in index.ts; likely a TS server cache issue
- `json is of type 'unknown'` in CSV import handlers — resolved with `as any` cast on `res.json()`

### Plan 3 — Completed
- **Schema** (`src/lib/server/db/schema.ts`): 9 tables defined with Drizzle ORM
  - `accounts`: email unique, role enum (`admin`|`general`), `created_at` uses `sql\`(datetime('now'))\``
  - `suppliers`: no business code — identified by name; tel/fax/zipcode/address/email
  - `products`: `code` unique (used for CSV import matching)
  - `supplier_products`: (supplier_id, product_id) unique constraint
  - `receiving_slips` / `shipping_slips`: `account_id` FK → accounts, `note` text field
  - `*_slip_details`: `line_no` integer for ordering, `quantity` real for kg/m support
  - `inventory`: `product_id` as PK (one row per product)
- **Migration** (`drizzle/0000_keen_thunderbird.sql`): generated by `bun run db:generate`
- **Seed** (`scripts/seed.sql`): 3 accounts, 8 suppliers, 12 products, 13 receiving slips (38 detail rows), 7 shipping slips (19 detail rows), 12 inventory rows
  - Inventory quantities verified: `SUM(receiving_details) - SUM(shipping_details) = inventory.quantity` for all 12 products
  - All seed accounts have real PBKDF2-SHA256 password hashes (generated with `scripts/gen-password-hash.ts`)
- **`wrangler.jsonc`**: added `"migrations_dir": "./drizzle"` to D1 binding
- **`package.json`**: `db:seed:local` updated to `--file=./scripts/seed.sql` (seed is outside migration dir to avoid being picked up as a migration)
- Local D1 database built and seeded successfully

#### Schema Design Notes
- `item_count` is NOT stored — computed at query time with `COUNT` join
- `suppliers` has no `code` field; products have `code` for CSV import key matching
- `quantity` is `real` in both slip details and inventory (supports fractional units like kg, m)
- `updated_at` on `suppliers` and `products` must be set explicitly in UPDATE queries (no DB trigger)
- `account_id` in slips links to the logged-in account; `user_name` for display is resolved by joining `accounts`

### Plan 4 — Completed
All `+page.server.ts` and `+server.ts` files connected to the DB. Mock data removed.

#### DB Access Pattern
```typescript
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
const db = getDb(platform!.env.DB);
const account_id = locals.user!.id; // guaranteed by (app)/+layout.server.ts auth guard
```

#### Inventory Logic
- **Receiving create**: UPSERT inventory with `quantity + delta` (`onConflictDoUpdate`)
- **Receiving delete**: subtract old quantities from inventory
- **Receiving update**: reverse old (subtract) → delete old details → insert new details → apply new (UPSERT add)
- **Shipping create**: UPDATE inventory `quantity - delta`
- **Shipping delete**: add back quantities to inventory
- **Shipping update**: add back old (reverse) → delete old details → insert new details → subtract new
- **Stocktake**: UPSERT inventory setting quantity directly to submitted value
- All multi-table mutations use `db.transaction(async (tx) => { ... })` for atomicity

#### Slip Number Generation
```typescript
// Inside db.transaction() to prevent race conditions
const year = new Date(date_field).getFullYear();
const [last] = await tx.select({ n: schema.receivingSlips.slip_number })
  .from(schema.receivingSlips)
  .where(like(schema.receivingSlips.slip_number, `RCV-${year}-%`))
  .orderBy(desc(schema.receivingSlips.slip_number)).limit(1);
const lastNum = last ? parseInt(last.n.split('-')[2], 10) : 0;
const slip_number = `RCV-${year}-${String(lastNum + 1).padStart(3, '0')}`;
// SHP-YYYY-NNN for shipping
// UNIQUE constraint violation on slip_number → fail(409, { error: '伝票番号が競合しました。再度お試しください。' })
```

#### Product Create → Auto-create Inventory Row
When a product is created (UI or CSV import), an inventory row is inserted with `quantity: 0` via `.onConflictDoNothing()`, wrapped in the same `db.transaction()`.

### Plan 5 — Completed

#### Authentication
- Login/logout flow fully implemented: `src/routes/login/`, `src/routes/logout/+server.ts`
- Session stored as account UUID in `session` cookie (PBKDF2-SHA256, 100k iterations)
- `src/hooks.server.ts` loads user from session cookie into `event.locals.user`
- `src/routes/(app)/+layout.server.ts` redirects unauthenticated users to `/login`
- Login credentials: `admin@example.com` / `admin123`, `suzuki@example.com` / `general123`, `sato@example.com` / `general123`
- Script `scripts/gen-password-hash.ts` (Bun + Web Crypto) generates PBKDF2 hashes for seeding

#### CSV Import
All import actions fully implemented:
- `suppliers`: append/replace mode, columns: 仕入先名, 電話番号, FAX, 郵便番号, 住所, メールアドレス
- `products`: append/replace mode, columns: 商品コード, 商品名, 単位, 説明
- `receiving`: creates a new slip + details + inventory UPSERT; columns: 商品コード, 数量
- `shipping`: creates a new slip + details + inventory UPDATE; columns: 商品コード, 数量
- `inventory`: append/replace mode (UPSERT); columns: 商品コード, 数量 (or 在庫数)
- CSV parsing via `$lib/utils/csv.ts`

#### Account CRUD Error Handling
- `AccountEditor.svelte`: Error banner inside modal for create/update `fail()` responses (via `use:enhance` `result.type === 'failure'`)
- `accounts/+page.svelte`: Error notification banner for delete failures; uses `fetch` with `x-sveltekit-action: 'true'` + `deserialize`
- `accounts/+page.server.ts` delete action: Detects `FOREIGN KEY constraint failed` → "このアカウントは使用されているため削除できません"

#### Shared Slip Form Components
- Created `ReceivingSlipForm.svelte` and `ShippingSlipForm.svelte` in `$lib/components`
- All 4 slip pages (`receiving/new`, `receiving/[id]/edit`, `shipping/new`, `shipping/[id]/edit`) use shared components
- Admins can change 担当者 on edit pages via `SearchableSelect`

#### DB Mutation Hardening
- All INSERT / UPDATE / DELETE wrapped in try/catch across all server files
- All multi-table mutations migrated from `db.batch()` to `db.transaction(async (tx) => { ... })`
- Slip creation/import: slip number generated inside transaction; UNIQUE conflict → `fail(409, ...)`
- Affected files: `suppliers`, `products`, `receiving/new`, `receiving/[id]`, `receiving/[id]/edit`, `receiving/+page` (import), `shipping/new`, `shipping/[id]`, `shipping/[id]/edit`, `shipping/+page` (import), `inventory`, `profile`

#### Server-side Search
All list pages now use server-side search via URL params (`?search=...&page=N`):
- **suppliers**: filters by `name`
- **products**: filters by `code` OR `name`
- **inventory**: filters by `products.code` OR `products.name`
- **accounts**: filters by `name` OR `email` (was already server-side)
- Export endpoints (`suppliers/export`, `products/export`, `inventory/export`) also respect `search` param
- Pattern: `import { page } from '$app/state'`; `let searchQuery = $state(page.url.searchParams.get('search') || '')`; `handleSearch()` calls `goto()`; `handlePageChange(n)` preserves search query

#### Unit Tests
- **Test runner**: Vitest 4 with two projects — `server` (node) and `client` (chromium/playwright)
- **`fileParallelism: false`** on server project to prevent D1 `SQLITE_BUSY` lock contention
- **6 test files, 46 tests, all passing** (`bun run test:unit -- --run`)
  - `src/demo.spec.ts` (1)
  - `src/lib/server/auth/auth.test.ts` (7) — PBKDF2 hash/verify
  - `src/lib/server/auth/hooks.test.ts` (2) — `getSession` integration with real D1
  - `src/lib/utils/csv.test.ts` (25) — `escapeCSV`, `generateCSV`, `parseCSV` (BOM, CRLF, roundtrip)
  - `src/lib/utils/format.test.ts` (10) — `formatDate`, `formatDateTime`
  - `src/routes/page.svelte.spec.ts` (1) — renders `login/+page.svelte` h1

## TODO — Future Features (not yet implemented)

### Notification System (保留中)
- Email notifications (Cloudflare Email Workers) and/or Slack notifications
- Use cases: low-stock alerts, receiving completion, scheduled inventory reminders
- Deferred: need to decide on channel (email vs Slack vs both) and configuration UI before implementation

