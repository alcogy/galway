import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';

export type DB = ReturnType<typeof getDb>;

export type ServiceCtx = {
	db: DB;
	env: Env;
	user: NonNullable<App.Locals['user']>;
	request?: Request;
};

export function makeCtx(
	platform: App.Platform,
	locals: App.Locals,
	request?: Request
): ServiceCtx {
	return {
		db: getDb(platform.env.DB),
		env: platform.env,
		user: locals.user!,
		request
	};
}
