import { error } from '@sveltejs/kit';
import { desc, count, eq, and, like } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Access denied');
	const db = getDb(platform!.env.DB);

	const itemsPerPage = 30;
	const currentPage = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const filterAction = url.searchParams.get('action') || '';
	const filterTarget = url.searchParams.get('target') || '';
	const filterUser = url.searchParams.get('user') || '';
	const offset = (currentPage - 1) * itemsPerPage;

	const conditions = [];
	if (filterAction) conditions.push(eq(schema.auditLogs.action, filterAction));
	if (filterTarget) conditions.push(eq(schema.auditLogs.target_type, filterTarget));
	if (filterUser) conditions.push(like(schema.auditLogs.user_name, `%${filterUser}%`));
	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult, logs] = await Promise.all([
		db.select({ count: count() }).from(schema.auditLogs).where(whereClause),
		db
			.select()
			.from(schema.auditLogs)
			.where(whereClause)
			.orderBy(desc(schema.auditLogs.created_at))
			.limit(itemsPerPage)
			.offset(offset),
	]);

	return {
		logs,
		totalItems: countResult[0]?.count ?? 0,
		itemsPerPage,
		currentPage,
		filterAction,
		filterTarget,
		filterUser,
	};
};
