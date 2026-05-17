import enDict from './en.js';
import jaDict from './ja.js';

export type Locale = 'en' | 'ja';

const STORAGE_KEY = 'galway-locale';

let locale = $state<Locale>('en');

export function getLocale(): Locale {
	return locale;
}

export function setLocale(l: Locale) {
	locale = l;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, l);
	}
	if (typeof document !== 'undefined') {
		document.documentElement.lang = l;
	}
}

export function initLocale() {
	if (typeof localStorage !== 'undefined') {
		const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
		if (stored === 'en' || stored === 'ja') {
			locale = stored;
		}
	}
	if (typeof document !== 'undefined') {
		document.documentElement.lang = locale;
	}
}

const dicts = { en: enDict, ja: jaDict };

export function t(key: string): string {
	const parts = key.split('.');
	let obj: unknown = dicts[locale];
	for (const part of parts) {
		obj = (obj as Record<string, unknown>)?.[part];
		if (obj === undefined) return key;
	}
	return typeof obj === 'string' ? obj : key;
}
