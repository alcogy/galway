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

