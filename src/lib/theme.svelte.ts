import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

let theme: Theme = $state('system');

if (browser) {
	const saved = localStorage.getItem('theme') as Theme | null;
	if (saved === 'light' || saved === 'dark' || saved === 'system') {
		theme = saved;
	}
}

export function getTheme(): Theme {
	return theme;
}

export function setTheme(next: Theme) {
	theme = next;
	if (browser) {
		localStorage.setItem('theme', next);
	}
}
