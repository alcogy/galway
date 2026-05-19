import { dev } from '$app/environment';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, gt } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { RequestEvent } from '@sveltejs/kit';

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const ALGORITHM = 'PBKDF2';
const HASH = 'SHA-256';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const SESSION_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	secure: !dev,
	maxAge: 60 * 60 * 24 * 7 // 7 days
} as const;

function toHex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a[i] ^ b[i];
	}
	return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		ALGORITHM,
		false,
		['deriveBits']
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: ALGORITHM, hash: HASH, salt, iterations: ITERATIONS },
		key,
		KEY_LENGTH * 8
	);
	return `${toHex(salt.buffer as ArrayBuffer)}:${toHex(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltHex, hashHex] = stored.split(':');
	if (!saltHex || !hashHex) return false;
	const salt = fromHex(saltHex).buffer as ArrayBuffer;
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		ALGORITHM,
		false,
		['deriveBits']
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: ALGORITHM, hash: HASH, salt, iterations: ITERATIONS },
		key,
		KEY_LENGTH * 8
	);
	return timingSafeEqual(new Uint8Array(derived), fromHex(hashHex));
}

export async function createSession(d1: D1Database, accountId: string): Promise<string> {
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
	const token = toHex(tokenBytes.buffer as ArrayBuffer);
	const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS).toISOString();
	const db = drizzle(d1, { schema });
	await db.insert(schema.sessions).values({ id: token, account_id: accountId, expires_at: expiresAt });
	return token;
}

export async function deleteSession(d1: D1Database, token: string): Promise<void> {
	const db = drizzle(d1, { schema });
	await db.delete(schema.sessions).where(eq(schema.sessions.id, token));
}

export async function getSession(event: RequestEvent) {
	const token = event.cookies.get('session');
	if (!token || token.length !== 64) return null;

	const db = drizzle(event.platform!.env.DB, { schema });
	const now = new Date().toISOString();
	const result = await db
		.select({ account: schema.accounts })
		.from(schema.sessions)
		.innerJoin(schema.accounts, eq(schema.sessions.account_id, schema.accounts.id))
		.where(and(eq(schema.sessions.id, token), gt(schema.sessions.expires_at, now)))
		.limit(1);
	return result[0]?.account ?? null;
}
