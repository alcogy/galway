import { makeCtx } from '$lib/services';
import { loadReports } from '$lib/services/reports';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) =>
	loadReports(makeCtx(platform!, locals));
