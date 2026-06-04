# Galway — Procurement Management System

A simple procurement management system for centrally managing suppliers, products, receiving/shipping slips, and inventory.

## Tech Stack

| Item | Details |
|------|---------|
| Framework | SvelteKit 2 + Svelte 5 |
| Deployment | Cloudflare Pages / Workers |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| Package Manager | Bun |

---

## Features

### Dashboard (`/`)
- Summary cards: supplier count, product count, receiving count, shipping count
- **Today's Receiving**: purchase order details with status `ordered` and today as the expected arrival date
- **Today's Shipping**: shipping slip details with today as the ship date
- **Low Stock Alert**: products where current stock is below the minimum quantity (can be toggled in Settings)

### Suppliers (`/suppliers`)
- List, create, edit, and delete suppliers
- Search by supplier name
- CSV import (append / replace mode) and CSV export
- Fields: supplier name, phone, fax, zip code, address, email

### Products (`/products`)
- List, create, edit, and delete products
- Search by product code or name; filter by category
- CSV import (append / replace mode) and CSV export
- Fields: product code (unique), product name, unit, description, category, minimum stock
- Automatically creates an inventory record (quantity 0) when a product is registered

### Categories (`/categories`)
- List, create, edit, and delete categories
- Shows product count per category

### Purchasing (`/purchasing`)
- List, create, view, and edit purchase orders
- Status workflow: `Draft` → `Ordered` → `Received` / `Cancelled`
- Order numbers: `PO-YYYY-NNN` format (auto-generated within a transaction)
- Expected arrival date links to the Dashboard's Today's Receiving section
- **Create Receiving Slip** directly from an ordered PO (with date and note fields); slip is linked via `purchase_order_number`
- **Received Qty Summary**: per-product breakdown of ordered vs. total received quantities and the difference

### Receiving (`/receiving`)
- List, create, view, edit, and delete receiving slips
- Slip numbers: `RCV-YYYY-NNN` format (auto-generated)
- Receiving increases inventory (UPSERT)
- CSV import (bulk register with supplier and date)
- Line item CSV download (filename includes supplier name and date)
- Admins can change the person in charge

### Shipping (`/shipping`)
- List, create, view, edit, and delete shipping slips
- Slip numbers: `SHP-YYYY-NNN` format (auto-generated)
- Shipping decreases inventory
- CSV import (bulk register with date)
- Line item CSV download
- **Print PDF** (`/shipping/[id]/print`): A4 print layout; print dialog opens automatically
- Can link a customer (ship-to)
- Admins can change the person in charge

### Customers (`/customers`)
- List, create, edit, and delete customers (ship-to)
- Fields: customer name, phone, fax, zip code, address, email

### Inventory (`/inventory`)
- View current stock for all products
- Search by product code or name
- Highlights products below minimum stock in warning color
- **Stocktake**: directly enter and overwrite actual stock quantities via modal
- CSV import (bulk update stock quantities) and CSV export

### Stocktake Schedule (`/inventory-schedules`)
- List, create, and view stocktake schedules
- Status management: `Planned` → `In Progress` → `Completed`

### Reports (`/reports`)
- Bar charts for receiving and shipping trends over the past 6 months
- Top 10 products by shipping quantity
- Receiving count ranking by supplier

### Accounts (`/accounts`) — Admin only
- List, create, edit, and delete user accounts
- Roles: `admin` / `general`
- Cannot delete accounts that are in use (handles foreign key constraint error)

### Audit Logs (`/audit-logs`) — Admin only
- View audit log of all CRUD operations
- Filter by action, target, and user
- Action types: `create` `update` `delete` `import` `stocktake` `status_change` `settings_save`

### Settings (`/settings`) — Admin only
- Toggle low stock alert on/off
- Set admin notification email address (for low-stock alerts and other admin alerts)
- Toggle email alerts on/off
- Select email language (English / Japanese)
- Test email sending

---

## Setup

### 1. Install dependencies

```sh
bun install
```

### 2. Set up local DB

```sh
# Apply migrations
bun run db:migrate:local

# Seed base data (accounts, suppliers, products, receiving/shipping slips, inventory)
bun run db:seed:local

# Seed additional data (categories, customers, purchase orders, stocktake schedules)
bun run db:seed-plan6:local
```

### 3. Start development server

```sh
bun run dev
```

Open `http://localhost:5173` in your browser.

---

## Login Credentials (Development)

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | Admin |
| suzuki@example.com | general123 | General |
| sato@example.com | general123 | General |

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Production build |
| `bun run preview` | Preview build locally (Wrangler) |
| `bun run check` | Type check |
| `bun run lint` | Lint / format check |
| `bun run format` | Auto-format |
| `bun run test:unit` | Unit tests (Vitest) |
| `bun run test:e2e` | E2E tests (Playwright) |
| `bun run db:generate` | Generate Drizzle migration files |
| `bun run db:migrate:local` | Apply migrations to local D1 |
| `bun run db:migrate:remote` | Apply migrations to remote D1 |
| `bun run db:seed:local` | Seed base data (local) |
| `bun run db:seed-plan6:local` | Seed additional data (local) |
| `bun run db:studio` | Start Drizzle Studio |

---

## Remote Deployment

1. Create a D1 database in the [Cloudflare Dashboard](https://dash.cloudflare.com/):

```sh
wrangler d1 create galway-db
```

2. Set the returned `database_id` in `wrangler.jsonc` at `d1_databases[0].database_id`

3. Apply migrations to remote:

```sh
bun run db:migrate:remote
```

4. Deploy to Cloudflare Pages:

```sh
bun run build
wrangler pages deploy .svelte-kit/cloudflare
```

---

## License

MIT
