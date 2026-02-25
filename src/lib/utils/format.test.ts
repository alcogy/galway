import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './format';

describe('formatDate', () => {
	it('returns a non-empty string', () => {
		const result = formatDate('2026-02-25T12:00:00.000Z');
		expect(result.length).toBeGreaterThan(0);
	});

	it('includes the year in the output', () => {
		expect(formatDate('2026-02-25T12:00:00.000Z')).toContain('2026');
	});

	it('produces different output for dates in different months', () => {
		const jan = formatDate('2026-01-15T12:00:00.000Z');
		const dec = formatDate('2026-12-15T12:00:00.000Z');
		expect(jan).not.toBe(dec);
	});

	it('produces different output for different years', () => {
		const y2025 = formatDate('2025-06-01T12:00:00.000Z');
		const y2026 = formatDate('2026-06-01T12:00:00.000Z');
		expect(y2025).not.toBe(y2026);
	});

	it('output does not include hours or minutes notation', () => {
		// formatDate should not include time components like "10:30"
		const result = formatDate('2026-02-25T10:30:00.000Z');
		expect(result).not.toMatch(/\d{1,2}:\d{2}/);
	});
});

describe('formatDateTime', () => {
	it('returns a non-empty string', () => {
		const result = formatDateTime('2026-02-25T12:00:00.000Z');
		expect(result.length).toBeGreaterThan(0);
	});

	it('includes the year in the output', () => {
		expect(formatDateTime('2026-02-25T12:00:00.000Z')).toContain('2026');
	});

	it('produces longer output than formatDate for the same input', () => {
		const iso = '2026-02-25T12:00:00.000Z';
		expect(formatDateTime(iso).length).toBeGreaterThan(formatDate(iso).length);
	});

	it('produces different output for datetimes in different hours', () => {
		const morning = formatDateTime('2026-02-25T09:00:00.000Z');
		const evening = formatDateTime('2026-02-25T21:00:00.000Z');
		expect(morning).not.toBe(evening);
	});

	it('produces different output for different years', () => {
		const y2025 = formatDateTime('2025-06-01T12:00:00.000Z');
		const y2026 = formatDateTime('2026-06-01T12:00:00.000Z');
		expect(y2025).not.toBe(y2026);
	});
});
