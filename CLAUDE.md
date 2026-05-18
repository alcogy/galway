You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

**Rule**
Write CLAUDE.md (this file) entirely in English.

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
- **D1 binding**: `binding: "DB"`, `database_name: "galway-db"`
- **Migrations dir**: `./drizzle` (managed by drizzle-kit generate + wrangler d1 migrations apply)

### DB Mutation Rules (enforced across all +page.server.ts / +server.ts)
1. **Always wrap INSERT / UPDATE / DELETE in try/catch.** Return `fail(500, { error: '...' })` on unexpected errors.
2. **Use `db.transaction(async (tx) => { ... })` whenever two or more related tables are mutated together.** Use `tx` instead of `db` for all operations inside. Do NOT use `db.batch()` — use sequential `await tx.operation()` calls instead.
3. **Slip number conflict handling:** Catch `UNIQUE constraint failed` on `slip_number` and return `fail(409, { error: 'Slip number conflict. Please try again.' })`.
4. **Redirect after mutation** must be placed *outside* the try/catch block so the SvelteKit redirect is not swallowed.

## System Overview

This is a simple procurement management system.

### Core Business Functions
- **Master Management**: Manage suppliers and products
- **Receiving Management**: Record incoming stock; increases inventory
- **Shipping Management**: Record outgoing stock; decreases inventory
- **Inventory Management**: Physical inventory count (stocktake) — registers actual stock quantities per product and updates inventory records

### Screens
- Supplier Management
- Product Management
- Receiving Management
- Shipping Management
- Inventory Management

### Database Tables
- `accounts` — User accounts (email, password_hash, name, role: admin|general)
- `suppliers` — Supplier master (name, tel, fax, zipcode, address, email; no code — identified by name)
- `products` — Product master (code unique, name, unit, description)
- `supplier_products` — Supplier-product relation (supplier_id + product_id, unique constraint)
- `receiving_slips` — Receiving slips (slip_number unique, received_at, supplier_id FK, account_id FK, note)
- `receiving_slip_details` — Receiving slip line items (slip_id FK cascade, product_id FK, line_no, quantity: real)
- `shipping_slips` — Shipping slips (slip_number unique, shipped_at, account_id FK, note)
- `shipping_slip_details` — Shipping slip line items (slip_id FK cascade, product_id FK, line_no, quantity: real)
- `inventory` — Inventory (product_id PK FK, quantity: real, updated_at)

### UI Guidelines
- Design inspired by the Cloudflare dashboard — simple and clean.
- Basic UI and layout are already implemented.
- Dark / Light / System theme switching is available, implemented in `/src/lib/theme.svelte.ts`.
- Responsive design for PC, tablet, and smartphone.
- UI components are located in `/src/lib/ui/`. Add new components there as needed.
- The project in ../aes-crm/ should be referenced for its UI layout, composition, and design concepts. For more detailed application, see the UI layout, configuration, and design concepts of the project in ../aes-crm/.

### Implementation Plan
1. ✅ Set up local development environment for D1, package.json and configs.
2. ✅ Implement screen UIs.
3. ✅ Create DB table schemas and seed data, then run migrations.
4. ✅ Connect each screen to the DB and implement server actions.
5. ✅ Perform end-to-end verification and fix any issues found.

## Implementation Status

### Plan 1 — Completed
- `wrangler.jsonc`: D1 binding added (`binding: "DB"`, `database_name: "galway-db"`)
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
  receiving/[id]/export/+server.ts      — CSV download endpoint (line items; filename includes supplier name and date)
  shipping/                             — Shipping slip list (row-click → detail) + CSV import
  shipping/new/                         — Shipping slip create page
  shipping/[id]/                        — Shipping slip detail + CSV download
  shipping/[id]/edit/                   — Shipping slip edit page
  shipping/[id]/export/+server.ts       — CSV download endpoint (line items; filename includes ship date)
  inventory/                            — Inventory list + stocktake modal + CSV import/export
  inventory/export/+server.ts           — CSV download endpoint (inventory list)
```

#### Key UI Patterns
- **Row-click navigation**: Receiving and shipping lists use `onrowclick={(row) => goto('/receiving/${row.id}')}` — no action column
- **Detail page layout**: back link → page header with actions (CSV download, Edit button) → Slip Info Card (dl grid) → Line Items Table section → Delete danger zone
- **Create/Edit as pages**: Receiving and shipping slips use dedicated pages (not modals). Line items serialized as JSON in a hidden input (`name="details"`). Edit pages use `$effect` to set initial state from data.
- **Form page layout**: back link → page header → Card containing the form → form-actions at bottom inside card
- **Person in charge**: Displayed on slip detail pages. On create: set automatically from the logged-in account. On edit: admins can change it via a `SearchableSelect` field; non-admins cannot (field hidden, server ignores submitted value).
- **Numeric columns**: `Table.svelte` `Column` interface has `numeric?: boolean`. When true: right-aligns the cell and formats via `Number(val).toLocaleString('ja-JP')`.
- **CSV import on list pages**: Receiving and shipping lists have a CSV Import button (Upload icon) that opens `SlipCsvImportDialog`. Inventory list uses `CsvImportDialog`. On success, calls `invalidateAll()` and shows an `importNotification` banner (auto-dismisses after 6 s). All import actions are fully implemented.
- **CSV download endpoints**: `+server.ts` GET routes returning `text/csv; charset=utf-8` with UTF-8 BOM (`﻿`). Non-ASCII filenames use RFC 5987 encoding: `filename*=UTF-8''${encodeURIComponent(filename)}`.
- **Pagination**: All lists paginated 20 items/page; `.table-with-pagination` wrapper removes bottom border-radius from Table so Pagination attaches seamlessly
- **Server-side search**: All list pages (suppliers, products, inventory, accounts) use server-side search via URL params (`?search=...&page=N`). Search triggers `goto()` on form submit; page change via `handlePageChange(n)`. Initialize `searchQuery` from `page.url.searchParams.get('search')` using `import { page } from '$app/state'`. No client-side `$derived` filtering.
- **`$state` init rule**: Never initialize `$state` from `data.*` directly — use empty string/null and set values in `$effect` or handler functions (autofixer flags this)
- **Slip list columns**: Receiving list shows Slip No., Supplier, Received Date, Item Count, Person. Shipping list shows Slip No., Ship Date, Item Count, Person.

#### Components (`src/lib/ui/`)
- `Select.svelte`: Styled `<select>` wrapper; value must be `$bindable()`
- `SearchableSelect.svelte`: Searchable dropdown; `position: fixed` panel positioned via `getBoundingClientRect()` on click event to escape `overflow: hidden` parents; hidden `<input type="hidden">` for form submission; `{@attach (node) => { node.focus(); }}` for search input auto-focus; Props — `options`, `placeholder`, `value=$bindable('')`, `name`, `disabled`, `error`
- `Table.svelte`: Accepts `columns`, `rows`, `onrowclick`, `actions` snippet, `cell` snippet, `empty` snippet
- `Card.svelte`: Accepts `title` and `children`; `card-body` has `padding: var(--space-xl)` — override with `:global(.card-body)` for full-width content
- `CsvImportDialog.svelte`: Used in suppliers and products pages (append/replace mode + file drop zone)
- `SlipCsvImportDialog.svelte`: Used in receiving and shipping list pages; append-only; Props — `open=$bindable()`, `title`, `dateLabel` (defaults to t('receiving.receivedAt')), `suppliers?: {id,name}[]` (omit for shipping), `onimport?: (file, date, supplierId?) => void`; expected CSV columns: product code, product name, quantity
- `Pagination.svelte`: Props — `totalItems`, `itemsPerPage`, `currentPage`, `onPageChange`
- `ReceivingSlipForm.svelte`: Shared form for receiving slip create/edit. Props — `suppliers`, `products`, `accounts?`, `isAdmin?=false`, `initialData?` (undefined = create mode), `oncancel?`. Derives `action` (`?/create`|`?/update`) and `submitLabel` from `initialData`. Uses `$effect` to initialize mutable state from `initialData`. Shows person-in-charge `SearchableSelect` when `isAdmin=true`.
- `ShippingSlipForm.svelte`: Same as ReceivingSlipForm but without supplier field; uses `shipped_at` instead of `received_at`.

#### Known Pre-existing Type Errors
- `Module '"$lib/ui"' has no exported member 'SearchableSelect'` — SearchableSelect is exported in index.ts; likely a TS server cache issue
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
// UNIQUE constraint violation on slip_number → fail(409, { error: 'Slip number conflict. Please try again.' })
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
- `suppliers`: append/replace mode, columns: supplier name, phone, fax, zip code, address, email
- `products`: append/replace mode, columns: product code, product name, unit, description
- `receiving`: creates a new slip + details + inventory UPSERT; columns: product code, quantity
- `shipping`: creates a new slip + details + inventory UPDATE; columns: product code, quantity
- `inventory`: append/replace mode (UPSERT); columns: product code, quantity (or stock quantity)
- CSV parsing via `$lib/utils/csv.ts`

#### Account CRUD Error Handling
- `AccountEditor.svelte`: Error banner inside modal for create/update `fail()` responses (via `use:enhance` `result.type === 'failure'`)
- `accounts/+page.svelte`: Error notification banner for delete failures; uses `fetch` with `x-sveltekit-action: 'true'` + `deserialize`
- `accounts/+page.server.ts` delete action: Detects `FOREIGN KEY constraint failed` → returns "This account is in use and cannot be deleted."

#### Shared Slip Form Components
- Created `ReceivingSlipForm.svelte` and `ShippingSlipForm.svelte` in `$lib/ui`
- All 4 slip pages (`receiving/new`, `receiving/[id]/edit`, `shipping/new`, `shipping/[id]/edit`) use shared components
- Admins can change person in charge on edit pages via `SearchableSelect`

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

## Plan 6 — Completed (2026-05-15)

New features added on top of Plan 5:

### B. Low Stock Alert
- `products.min_quantity` column added (migration 0001)
- Dashboard shows low-stock alert section (items where `quantity < min_quantity`)
- Inventory list highlights low-stock rows with warning color and badge

### C. Product Category Management
- `product_categories` table added (migration 0002); `products.category_id` FK (SET NULL on delete)
- `/categories` page: CRUD for categories; shows product count per category
- Products list: category column, category filter dropdown
- Products form: category selector field
- CSV export includes category and min_quantity columns

### D. Customer (Ship-to) Management
- `customers` table added (migration 0003); `shipping_slips.customer_id` FK (SET NULL on delete)
- `/customers` page: CRUD for customers
- ShippingSlipForm updated with customer_id SearchableSelect
- Shipping list, detail, and new/edit pages show customer_name

### A. Shipping Slip PDF Export
- `/shipping/[id]/print` dedicated print page — A4 layout with slip info, details table, signature boxes
- Sidebar hidden via `:global()` CSS; "Print PDF" button on shipping slip detail page (opens in new tab)
- Print is triggered manually via a Print button on the print page (not auto-triggered on mount)

### E. Purchase Order Management
- `purchase_orders` + `purchase_order_details` tables added (migration 0004)
- `/purchasing` pages: list, new, detail, edit
- Status workflow: draft → ordered → received / cancelled
- Order numbers: PO-YYYY-NNN (auto-numbered in transaction)

### F. Reports & Analytics
- `/reports` page: bar charts (6-month receiving/shipping trend), top-10 shipping products, supplier ranking
- Pure CSS/HTML bar charts (no external chart library)

### G. Stocktake Schedule
- `inventory_schedules` table added (migration 0005)
- `/inventory-schedules` page: list, create, status transitions (planned → in_progress → completed / cancelled)

### DB Migrations Added
- `0001_clammy_swordsman.sql` — products.min_quantity
- `0002_medical_peter_quill.sql` — product_categories, products.category_id
- `0003_superb_red_skull.sql` — customers, shipping_slips.customer_id
- `0004_sad_spacker_dave.sql` — purchase_orders, purchase_order_details
- `0005_steep_joystick.sql` — inventory_schedules

## Plan 7 — Completed (2026-05-15)

Additional features and fixes implemented in the same session:

### Settings page (/settings)
- `settings` table added (migration 0006) — key-value store (`key` PK, `value`, `updated_at`)
- Default keys seeded: `notification_email`, `low_stock_alert_enabled`, `alert_email_enabled`, `slack_webhook_url`
- `/settings` page (admin only): toggle for low-stock alert on/off, email/Slack fields as placeholders
- Dashboard low-stock alert section respects `low_stock_alert_enabled` setting
- `use:enhance` form for save without full reload; success/error banner

### Dashboard — Today's Schedule Sections
- **Today's Receiving**: purchase order details where `expected_at = today` AND `status = 'ordered'`
- **Today's Shipping**: shipping slip details where `shipped_at = today`
- Displayed as two-column grid cards between stats and low-stock alert

### Audit Log
- `audit_logs` table added (migration 0007): `id, user_id, user_name, action, target_type, target_id, target_label, detail(JSON text), created_at`
- `src/lib/server/audit.ts`: `logAudit()` utility — wraps in try/catch so a log failure never breaks the main operation
- All CRUD actions instrumented across 18 server files:
  - Actions logged: `create`, `update`, `delete`, `import`, `status_change`, `stocktake`, `settings_save`
  - Targets: `product`, `supplier`, `receiving_slip`, `shipping_slip`, `inventory`, `purchase_order`, `customer`, `category`, `account`, `settings`
- `/audit-logs` page (admin only): paginated table with action/target/user filters; color-coded action badges

### Bug fixes
- **Inventory table style**: `row` snippet `<td>` elements don't inherit Table.svelte's scoped CSS; fixed with `:global(tbody tr td)` padding/border in `.table-with-pagination`
- **Sidebar active state**: `/inventory-schedules` was incorrectly matching `/inventory` — fixed `isActive()` to use `pathname === href || pathname.startsWith(href + '/')`

### Supplemental seed data (scripts/seed-plan6.sql)
- 5 product categories; all 12 products assigned category + min_quantity (PRD004/006/008 trigger low-stock alert)
- 3 customers; linked to existing shipping slips
- 3 purchase orders with details (received/ordered/draft)
- 3 inventory schedules (completed/planned/planned)
- Script: `bun run db:seed-plan6:local`
- **Note**: admin account ID is a UUID `3ec44910-...`, not `acc-1`

### Product rename: AES Supplier → Galway
- `package.json` name: `galway`
- `wrangler.jsonc` name: `galway`, database_name: `galway-db`
- All page `<title>` tags and Sidebar logo updated to "Galway"
- CLAUDE.md updated
- **Pending**: repository rename and local directory rename (done by user)

### Route additions (Plan 7)
```
src/routes/(app)/
  settings/                   — Settings page (admin only)
  audit-logs/                 — Audit log viewer (admin only)
```

### Sidebar nav order (complete)
Dashboard → Suppliers → Products → Categories → Purchasing → Receiving → Shipping → Customers → Inventory → Stocktake Schedule → Reports → [admin: Accounts, Audit Logs, Settings]

## Plan 8 — Completed (2026-05-18)

### EN/JA Language Switching
- `src/lib/i18n/en.ts`: English dictionary (source of truth); `Dict` type defined as `{ [K in keyof typeof en]: { [J in keyof typeof en[K]]: string } }` — allows Japanese values in `ja.ts` without literal type errors
- `src/lib/i18n/ja.ts`: Japanese dictionary (`const ja: Dict = { ... }`)
- `src/lib/i18n/index.svelte.ts`: reactive `locale` state (`$state`), `t(key)`, `setLocale()`, `initLocale()` (no-op, kept for compatibility)
- `src/lib/i18n/index.ts`: barrel re-export (`export * from './index.svelte.js'`) so `$lib/i18n` resolves correctly via TypeScript module resolution
- All `.svelte` files and UI components import `{ t } from '$lib/i18n'` and use `t('section.key')` for all UI strings
- Language persisted in `localStorage` under key `galway-locale` **and** in cookie `galway-locale` (set by `setLocale()`)
- Language switcher: Settings page (`/settings`) → Language card with EN / JA toggle buttons
- Default locale: `en`
- README.md and CLAUDE.md fully translated to English

### Stocktake Schedule — Cancel Action
- Added `actionCancel` / `cancelConfirm` i18n keys to both dictionaries
- Cancel button shown for `planned` and `in_progress` statuses; opens a confirmation dialog before transitioning to `cancelled`
- `updateStatus` action now validates that only `in_progress`, `completed`, `cancelled` are accepted as target statuses
- Cancelled schedules can only be deleted (no further status transition)
- Status flow: planned → in_progress → completed; planned / in_progress → cancelled

### Shipping Print Page Improvements
- **Localization**: all hardcoded Japanese labels replaced with `t()` calls; number/date formatting uses `getLocale() === 'ja' ? 'ja-JP' : 'en-US'`
- **No auto-print**: removed `onMount(() => { window.print(); })`; a "Print / 印刷" button is shown on screen (hidden in print mode) so the user triggers printing manually
- **Unit column**: widened from `40px` → `60px` in the print page items table; from `80px` → `120px` in the shipping slip detail page table

## Plan 9 — Completed (2026-05-18)

Polish and UX alignment with the Cork reference project.

### Language FOUC Fix
- **Root cause**: `initLocale()` was called inside `onMount`, causing a re-render after hydration when locale was Japanese
- **Fix**: locale is now initialized at module load time in `index.svelte.ts` (reads `localStorage` immediately via `if (browser)` block); `initLocale()` is now a no-op kept for compatibility
- `setLocale()` now also writes the `galway-locale` cookie (max-age 1 year, SameSite=Lax) so the server can read it on the next request
- `src/hooks.server.ts`: reads `galway-locale` cookie → `event.locals.locale`
- `src/app.d.ts`: `locale?: string` added to `App.Locals`
- `src/routes/(app)/+layout.server.ts`: returns `locale` in page data
- `src/routes/(app)/+layout.svelte`: calls `setLocale(data.locale as Locale)` directly (no `onMount`); locale is correct on SSR → no FOUC
- `src/app.html`: inline script now also sets `document.documentElement.lang` before first paint (covers edge cases)

### Sidebar — Settings Moved to Secondary Nav
- `src/lib/ui/Sidebar.svelte`: `settings` removed from `primaryNavItems`; added to `secondaryNavItems` between Profile and Sign Out (with `adminOnly: true`)

### Theme Switcher Moved to Settings Page
- Removed theme switcher (`Sun/Moon/Monitor` buttons) from the Sidebar footer entirely
- `src/lib/ui/Sidebar.svelte`: removed `theme` and `onthemechange` props; removed `sidebar-footer` with theme UI
- `src/routes/(app)/+layout.svelte`: no longer passes `theme`/`onthemechange` to Sidebar
- `src/routes/(app)/settings/+page.svelte`: new Appearance card added with Light / Dark / System toggle buttons
- i18n keys added: `settings.appearance`, `settings.theme`, `settings.themeDesc`, `settings.themeLight`, `settings.themeDark`, `settings.themeSystem`

### Profile Page Redesign (Cork-style)
- Replaced modal-based profile page with cork-style two-column inline form
- Left card: name field + email (read-only, disabled) + Change Password section (current / new password)
- Right card: Account Details (role badge + member-since date)
- `src/routes/(app)/profile/+page.server.ts`: removed email update; simplified to name + optional password change; returns `{ success: true }` for `use:enhance`
- i18n keys added: `profile.accountDetails`, `profile.memberSince`, `profile.namePlaceholder`, `profile.emailNote`, `profile.changePassword`, `profile.currentPasswordHint`, `profile.newPasswordHint`, `profile.savedSuccessfully`, `common.saving`, `common.saveChanges`

### Directory Structure — types/ and services/ Added
- `src/lib/types/shared.ts`: common TypeScript types (`User`, `Role`, `PaginationParams`, `PaginationMeta`)
- `src/lib/services/index.ts`: `ServiceCtx` type + `makeCtx()` factory function (mirrors Cork architecture)
- **Next**: migrate existing `+page.server.ts` business logic into service functions (see TODO below)

### UI Components — i18n Fixes
- `src/lib/ui/Pagination.svelte`: hardcoded Japanese info text and aria-labels replaced with `t('pagination.*')` keys; info string uses `{start}`, `{end}`, `{total}`, `{current}`, `{pages}` placeholders
- `src/lib/ui/SearchBar.svelte`: hardcoded「検索」button replaced with `t('common.search')`
- `src/lib/ui/Table.svelte`: hardcoded「操作」actions column header replaced with `t('common.actions')`
- i18n keys added: `pagination.info/first/previous/next/last`, `common.search`, `common.actions`

## TODO — Future Features (not yet implemented)

### Types & Services Refactoring (Next Session — Plan 10)

Migrate domain types and business logic out of `+page.server.ts` files into the `src/lib/types/` and `src/lib/services/` layers, mirroring the Cork architecture.

**Types to extract** (`src/lib/types/`):
- `supplier.ts` — Supplier
- `product.ts` — Product, ProductCategory
- `receiving.ts` — ReceivingSlip, ReceivingSlipDetail
- `shipping.ts` — ShippingSlip, ShippingSlipDetail, Customer
- `inventory.ts` — Inventory, InventorySchedule
- `purchasing.ts` — PurchaseOrder, PurchaseOrderDetail
- `account.ts` — Account (extend `shared.ts` User)

**Services to create** (`src/lib/services/`):
- `supplier.ts` — listSuppliers, createSupplier, updateSupplier, deleteSupplier, importSuppliers
- `product.ts` — listProducts, createProduct, updateProduct, deleteProduct, importProducts
- `receiving.ts` — listReceivingSlips, getReceivingSlip, createReceivingSlip, updateReceivingSlip, deleteReceivingSlip
- `shipping.ts` — listShippingSlips, getShippingSlip, createShippingSlip, updateShippingSlip, deleteShippingSlip
- `inventory.ts` — listInventory, stocktake, importInventory
- `purchasing.ts` — listPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrder, updateStatus
- `account.ts` — listAccounts, createAccount, updateAccount, deleteAccount
- `category.ts` — listCategories, createCategory, updateCategory, deleteCategory
- `customer.ts` — listCustomers, createCustomer, updateCustomer, deleteCustomer

**Pattern** (same as Cork):
```ts
// +page.server.ts — thin glue
export const actions = {
  create: async ({ request, platform, locals }) => {
    const f = await request.formData();
    return createSupplier(makeCtx(platform!, locals, request), {
      name: f.get('name')?.toString().trim() ?? '',
    });
  }
};

// $lib/services/supplier.ts — business logic
export async function createSupplier(ctx: ServiceCtx, data: {...}) {
  const { db, user } = ctx;
  // DB operations, audit logging
}
```

**Rules**:
- All write operations call `writeAuditLog()` via `ctx`
- Services import only from `$lib/server/` (no client-side code)
- Validation errors: `fail()` in service; missing resources: `error()` throw
- Transaction logic stays in services (not page.server.ts)

### Email Notifications (Next Phase)
- **Decided**: Use Cloudflare Email Workers (Send Email binding)
- **Reason**: keep infrastructure within Cloudflare; no extra cost; domain already/will be managed by Cloudflare
- **Requirement**: root domain must be managed by Cloudflare DNS + Email Routing enabled
- **Sender pattern**: `noreply@notify.yourdomain.com` → admin email address (any external address OK)
- **Local dev**: `send_email` binding is stubbed locally — no real sends, no domain needed for dev
- **Settings already in place**: `notification_email` and `alert_email_enabled` keys exist in `settings` table
- **wrangler.jsonc addition needed**:
  ```jsonc
  "send_email": [{ "name": "EMAIL" }]
  ```
- **Implementation pattern**:
  ```typescript
  if (platform?.env.EMAIL) {
    await platform.env.EMAIL.send({ from, to, subject, html });
  } else {
    console.log('[dev] email skipped');
  }
  ```
- **Trigger points to implement**: low-stock alert on dashboard load, receiving slip created, scheduled inventory reminder
- **Slack notifications**: also possible; Slack webhook URL stored in settings — implement after email

### Repository / Directory Rename — Completed (2026-05-15)
- GitHub repo: `https://github.com/alcogy/galway.git` ✅
- Local directory: `galway/` ✅
- git remote URL updated ✅
