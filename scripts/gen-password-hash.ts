/**
 * Generate PBKDF2-SHA256 password hashes for seed data.
 * Usage: bun run scripts/gen-password-hash.ts [password...]
 * Example: bun run scripts/gen-password-hash.ts general123 admin123
 */

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const ALGORITHM = 'PBKDF2';
const HASH = 'SHA-256';

function toHex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
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

const passwords = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['general123'];

for (const password of passwords) {
	const hash = await hashPassword(password);
	console.log(`${password}\t${hash}`);
}
