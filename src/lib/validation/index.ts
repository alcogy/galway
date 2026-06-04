import { z } from 'zod';

const nullableStr = (maxLen: number) =>
	z.nullable(z.string().max(maxLen, `Must be ${maxLen} characters or fewer`));

const optionalEmail = z
	.string()
	.max(254)
	.refine((v) => !v || z.string().email().safeParse(v).success, {
		message: 'Invalid email address'
	});

const nullableEmail = z.nullable(
	z
		.string()
		.max(254)
		.refine((v) => z.string().email().safeParse(v).success, {
			message: 'Invalid email address'
		})
);

export const accountCreateSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	email: z.string().email('Invalid email address').max(254),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.max(128),
	role: z.enum(['admin', 'general'], { message: 'Invalid role' })
});

export const accountUpdateSchema = z.object({
	id: z.string().min(1, 'ID is required'),
	name: z.string().min(1, 'Name is required').max(100),
	email: z.string().email('Invalid email address').max(254),
	password: z.string().max(128).optional(),
	role: z.enum(['admin', 'general'], { message: 'Invalid role' })
});

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

export const profileUpdateSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	currentPassword: z.preprocess(emptyToUndefined, z.string().max(128).optional()),
	newPassword: z.preprocess(
		emptyToUndefined,
		z.string().min(8, 'New password must be at least 8 characters').max(128).optional()
	),
});

export const settingsSchema = z.object({
	notification_email: optionalEmail,
	low_stock_alert_enabled: z.boolean(),
	alert_email_enabled: z.boolean(),
	email_locale: z.enum(['en', 'ja']).default('en'),
});

export const supplierSchema = z.object({
	name: z.string().min(1, 'Supplier name is required').max(100),
	tel: nullableStr(30),
	fax: nullableStr(30),
	zipcode: nullableStr(10),
	address: nullableStr(300),
	email: nullableEmail
});

export const productSchema = z.object({
	code: z.string().min(1, 'Product code is required').max(50),
	name: z.string().min(1, 'Product name is required').max(100),
	unit: z.string().min(1, 'Unit is required').max(20),
	description: nullableStr(1000),
	category_id: z.string().nullable().optional(),
	min_quantity: z.number().min(0, 'Minimum stock must be 0 or greater')
});

export const customerSchema = z.object({
	name: z.string().min(1, 'Customer name is required').max(100),
	tel: nullableStr(30),
	zipcode: nullableStr(10),
	address: nullableStr(300),
	email: nullableEmail,
	note: nullableStr(2000)
});

export const categorySchema = z.object({
	name: z.string().min(1, 'Category name is required').max(100),
	description: nullableStr(500)
});
