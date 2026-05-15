import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';

export type AuditAction =
	| 'create'
	| 'update'
	| 'delete'
	| 'import'
	| 'status_change'
	| 'stocktake'
	| 'settings_save';

export type AuditTargetType =
	| 'product'
	| 'supplier'
	| 'receiving_slip'
	| 'shipping_slip'
	| 'inventory'
	| 'purchase_order'
	| 'customer'
	| 'category'
	| 'account'
	| 'settings';

interface AuditParams {
	db: ReturnType<typeof getDb>;
	user_id: string | null;
	user_name: string | null;
	action: AuditAction;
	target_type: AuditTargetType;
	target_id?: string | null;
	target_label?: string | null;
	detail?: Record<string, unknown> | null;
}

export async function logAudit({
	db,
	user_id,
	user_name,
	action,
	target_type,
	target_id,
	target_label,
	detail,
}: AuditParams): Promise<void> {
	try {
		await db.insert(schema.auditLogs).values({
			user_id,
			user_name,
			action,
			target_type,
			target_id: target_id ?? null,
			target_label: target_label ?? null,
			detail: detail ? JSON.stringify(detail) : null,
		});
	} catch (err) {
		// ログ失敗はメイン処理に影響させない
		console.error('Audit log write failed:', err);
	}
}

export const ACTION_LABELS: Record<AuditAction, string> = {
	create: '作成',
	update: '更新',
	delete: '削除',
	import: 'インポート',
	status_change: 'ステータス変更',
	stocktake: '棚卸',
	settings_save: '設定保存',
};

export const TARGET_LABELS: Record<AuditTargetType, string> = {
	product: '商品',
	supplier: '仕入先',
	receiving_slip: '入荷伝票',
	shipping_slip: '出荷伝票',
	inventory: '在庫',
	purchase_order: '発注',
	customer: '出荷先',
	category: 'カテゴリ',
	account: 'アカウント',
	settings: '設定',
};
