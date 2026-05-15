import { real, sqliteTable, text, unique, int } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const accounts = sqliteTable('accounts', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	name: text('name').notNull(),
	role: text('role', { enum: ['admin', 'general'] }).notNull().default('general'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

// -----------------------------------------------
// 仕入先マスタ (Supplier Master)
// -----------------------------------------------
export const suppliers = sqliteTable('suppliers', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	tel: text('tel'),
	fax: text('fax'),
	zipcode: text('zipcode'),
	address: text('address'),
	email: text('email'),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updated_at: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// -----------------------------------------------
// 商品カテゴリ (Product Category)
// -----------------------------------------------
export const productCategories = sqliteTable('product_categories', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull().unique(),
	description: text('description'),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// -----------------------------------------------
// 商品マスタ (Product Master)
// -----------------------------------------------
export const products = sqliteTable('products', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	unit: text('unit').notNull(),
	description: text('description'),
	category_id: text('category_id').references(() => productCategories.id, { onDelete: 'set null' }),
	min_quantity: real('min_quantity').notNull().default(0),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updated_at: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// -----------------------------------------------
// 仕入先商品関係 (Supplier-Product Relationship)
// -----------------------------------------------
export const supplierProducts = sqliteTable(
	'supplier_products',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		supplier_id: text('supplier_id')
			.notNull()
			.references(() => suppliers.id, { onDelete: 'cascade' }),
		product_id: text('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' })
	},
	(t) => [unique('uq_supplier_product').on(t.supplier_id, t.product_id)]
);

// -----------------------------------------------
// 入荷伝票 (Receiving Slip)
// -----------------------------------------------
export const receivingSlips = sqliteTable('receiving_slips', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	slip_number: text('slip_number').notNull().unique(),
	received_at: text('received_at').notNull(), // YYYY-MM-DD
	supplier_id: text('supplier_id')
		.notNull()
		.references(() => suppliers.id),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id),
	note: text('note').notNull(),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// -----------------------------------------------
// 入荷伝票明細 (Receiving Slip Detail)
// -----------------------------------------------
export const receivingSlipDetails = sqliteTable('receiving_slip_details', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	slip_id: text('slip_id')
		.notNull()
		.references(() => receivingSlips.id, { onDelete: 'cascade' }),
	product_id: text('product_id')
		.notNull()
		.references(() => products.id),
	line_no: int('line_no').notNull(),
	quantity: real('quantity').notNull()
});

// -----------------------------------------------
// 発注伝票 (Purchase Order)
// -----------------------------------------------
export const purchaseOrders = sqliteTable('purchase_orders', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	order_number: text('order_number').notNull().unique(),
	ordered_at: text('ordered_at').notNull(), // YYYY-MM-DD
	expected_at: text('expected_at'), // YYYY-MM-DD (optional)
	supplier_id: text('supplier_id')
		.notNull()
		.references(() => suppliers.id),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id),
	status: text('status', { enum: ['draft', 'ordered', 'received', 'cancelled'] })
		.notNull()
		.default('draft'),
	note: text('note').notNull().default(''),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

export const purchaseOrderDetails = sqliteTable('purchase_order_details', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	order_id: text('order_id')
		.notNull()
		.references(() => purchaseOrders.id, { onDelete: 'cascade' }),
	product_id: text('product_id')
		.notNull()
		.references(() => products.id),
	line_no: int('line_no').notNull(),
	quantity: real('quantity').notNull()
});

// -----------------------------------------------
// 出荷先マスタ (Customer / Shipping Destination)
// -----------------------------------------------
export const customers = sqliteTable('customers', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	tel: text('tel'),
	zipcode: text('zipcode'),
	address: text('address'),
	email: text('email'),
	note: text('note'),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updated_at: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// -----------------------------------------------
// 出荷伝票 (Shipping Slip)
// -----------------------------------------------
export const shippingSlips = sqliteTable('shipping_slips', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	slip_number: text('slip_number').notNull().unique(),
	shipped_at: text('shipped_at').notNull(), // YYYY-MM-DD
	customer_id: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id),
	note: text('note').notNull(),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// -----------------------------------------------
// 出荷伝票明細 (Shipping Slip Detail)
// -----------------------------------------------
export const shippingSlipDetails = sqliteTable('shipping_slip_details', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	slip_id: text('slip_id')
		.notNull()
		.references(() => shippingSlips.id, { onDelete: 'cascade' }),
	product_id: text('product_id')
		.notNull()
		.references(() => products.id),
	line_no: int('line_no').notNull(),
	quantity: real('quantity').notNull()
});

// -----------------------------------------------
// 在庫テーブル (Inventory)
// -----------------------------------------------
export const inventory = sqliteTable('inventory', {
	product_id: text('product_id')
		.primaryKey()
		.references(() => products.id),
	quantity: real('quantity').notNull().default(0),
	updated_at: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});
