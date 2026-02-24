import type { PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = drizzle(platform!.env.DB, { schema });
	const today = new Date().toISOString().slice(0, 10);

	// WBS list with status
	const wbsList = await db
		.select({
			id: schema.wbs.id,
			title: schema.wbs.title,
			start_date: schema.wbs.start_date,
			end_date: schema.wbs.end_date
		})
		.from(schema.wbs)
		.orderBy(schema.wbs.start_date);

	const active = wbsList.filter((w) => w.start_date <= today && w.end_date >= today);
	const upcoming = wbsList.filter((w) => w.start_date > today);
	const finished = wbsList.filter((w) => w.end_date < today);

	// User's assigned tasks
	const myTasks = await db
		.select({
			id: schema.wbs_tasks.id,
			name: schema.wbs_tasks.name,
			wbs_id: schema.wbs_tasks.wbs_id,
			wbs_title: schema.wbs.title,
			planned_end: schema.wbs_tasks.planned_end,
			actual_start: schema.wbs_tasks.actual_start,
			actual_end: schema.wbs_tasks.actual_end,
			progress: schema.wbs_tasks.progress
		})
		.from(schema.wbs_tasks)
		.innerJoin(schema.wbs, eq(schema.wbs_tasks.wbs_id, schema.wbs.id))
		.where(eq(schema.wbs_tasks.assignee_id, locals.user!.id));

	const delayedTasks = myTasks.filter(
		(t) => t.planned_end && t.planned_end < today && t.progress < 100
	);
	const todayTasks = myTasks.filter(
		(t) => t.planned_end === today && t.progress < 100
	);

	return {
		wbsSummary: { active, upcoming, finished },
		delayedTasks,
		todayTasks
	};
};
