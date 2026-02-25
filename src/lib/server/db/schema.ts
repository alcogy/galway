import { real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

// -----------------------------------------------
// 仕入先マスタ (Supplier Master)
// -----------------------------------------------
export const suppliers = sqliteTable('suppliers', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	phone: text('phone'),
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
	user_name: text('user_name').notNull(),
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
	quantity: real('quantity').notNull()
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
	user_name: text('user_name').notNull(),
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
