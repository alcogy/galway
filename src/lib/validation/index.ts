import { z } from 'zod';

// Nullable optional text with max length
const nullableStr = (maxLen: number) =>
	z.nullable(z.string().max(maxLen, `最大${maxLen}文字以内で入力してください`));

// Optional (possibly empty) email — accepts '' or a valid email address
const optionalEmail = z
	.string()
	.max(254)
	.refine((v) => !v || z.string().email().safeParse(v).success, {
		message: 'メールアドレスの形式が正しくありません'
	});

// Nullable email — accepts null or a valid email address
const nullableEmail = z.nullable(
	z
		.string()
		.max(254)
		.refine((v) => z.string().email().safeParse(v).success, {
			message: 'メールアドレスの形式が正しくありません'
		})
);

export const accountCreateSchema = z.object({
	name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
	email: z.string().email('メールアドレスの形式が正しくありません').max(254),
	password: z
		.string()
		.min(8, 'パスワードは8文字以上で入力してください')
		.max(128, 'パスワードは128文字以内で入力してください'),
	role: z.enum(['admin', 'general'], { message: '権限の値が不正です' })
});

export const accountUpdateSchema = z.object({
	id: z.string().min(1, 'IDが必要です'),
	name: z.string().min(1, '名前は必須です').max(100),
	email: z.string().email('メールアドレスの形式が正しくありません').max(254),
	password: z.string().max(128).optional(),
	role: z.enum(['admin', 'general'], { message: '権限の値が不正です' })
});

export const profileUpdateSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	currentPassword: z.string().max(128).optional(),
	newPassword: z
		.string()
		.min(8, 'New password must be at least 8 characters')
		.max(128)
		.optional()
});

export const settingsSchema = z.object({
	notification_email: optionalEmail,
	low_stock_alert_enabled: z.boolean(),
	alert_email_enabled: z.boolean(),
	slack_webhook_url: z
		.string()
		.max(500)
		.refine((v) => !v || v.startsWith('https://hooks.slack.com/'), {
			message: 'Slack webhook URLは https://hooks.slack.com/ で始まる必要があります'
		}),
	email_locale: z.enum(['en', 'ja']).default('en'),
});

export const supplierSchema = z.object({
	name: z.string().min(1, '仕入先名は必須です').max(100, '仕入先名は100文字以内で入力してください'),
	tel: nullableStr(30),
	fax: nullableStr(30),
	zipcode: nullableStr(10),
	address: nullableStr(300),
	email: nullableEmail
});

export const productSchema = z.object({
	code: z.string().min(1, '商品コードは必須です').max(50, '商品コードは50文字以内で入力してください'),
	name: z.string().min(1, '商品名は必須です').max(100, '商品名は100文字以内で入力してください'),
	unit: z.string().min(1, '単位は必須です').max(20, '単位は20文字以内で入力してください'),
	description: nullableStr(1000),
	category_id: z.string().nullable().optional(),
	min_quantity: z.number().min(0, '最小在庫数は0以上で入力してください')
});

export const customerSchema = z.object({
	name: z
		.string()
		.min(1, '出荷先名は必須です')
		.max(100, '出荷先名は100文字以内で入力してください'),
	tel: nullableStr(30),
	zipcode: nullableStr(10),
	address: nullableStr(300),
	email: nullableEmail,
	note: nullableStr(2000)
});

export const categorySchema = z.object({
	name: z
		.string()
		.min(1, 'カテゴリ名は必須です')
		.max(100, 'カテゴリ名は100文字以内で入力してください'),
	description: nullableStr(500)
});
