import { browser } from '$app/environment';
import enDict from './en.js';
import jaDict from './ja.js';

export type Locale = 'en' | 'ja';

const STORAGE_KEY = 'galway-locale';

let locale: Locale = $state('en');

if (browser) {
	const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
	if (saved === 'en' || saved === 'ja') {
		locale = saved;
		document.documentElement.lang = saved;
	}
}

export function getLocale(): Locale {
	return locale;
}

export function setLocale(l: Locale) {
	locale = l;
	if (browser) {
		localStorage.setItem(STORAGE_KEY, l);
		document.documentElement.lang = l;
		document.cookie = `${STORAGE_KEY}=${l}; path=/; max-age=31536000; SameSite=Lax`;
	}
}

export function initLocale() {}

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
