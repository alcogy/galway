import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export type DB = DrizzleD1Database<typeof schema>;

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
		db: drizzle(platform.env.DB, { schema }),
		env: platform.env,
		user: locals.user!,
		request
	};
}
