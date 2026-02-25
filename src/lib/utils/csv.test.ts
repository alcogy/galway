import { describe, it, expect } from 'vitest';
import { escapeCSV, generateCSV, parseCSV } from './csv';

describe('escapeCSV', () => {
	it('returns plain value unchanged', () => {
		expect(escapeCSV('hello')).toBe('hello');
	});

	it('returns empty string unchanged', () => {
		expect(escapeCSV('')).toBe('');
	});

	it('returns Japanese characters unchanged', () => {
		expect(escapeCSV('日本語テスト')).toBe('日本語テスト');
	});

	it('wraps in quotes when value contains a comma', () => {
		expect(escapeCSV('foo,bar')).toBe('"foo,bar"');
	});

	it('wraps in quotes and doubles inner double-quotes', () => {
		expect(escapeCSV('say "hi"')).toBe('"say ""hi"""');
	});

	it('wraps in quotes when value contains a newline', () => {
		expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
	});

	it('wraps in quotes when value contains multiple special characters', () => {
		expect(escapeCSV('"quoted, value"')).toBe('"""quoted, value"""');
	});
});

describe('generateCSV', () => {
	it('produces header row only when rows are empty', () => {
		expect(generateCSV(['A', 'B', 'C'], [])).toBe('A,B,C');
	});

	it('produces header row followed by data rows', () => {
		expect(generateCSV(['Name', 'Age'], [['Alice', '30'], ['Bob', '25']])).toBe(
			'Name,Age\nAlice,30\nBob,25'
		);
	});

	it('escapes commas in cell values', () => {
		expect(generateCSV(['Name'], [['Smith, J.']])).toBe('Name\n"Smith, J."');
	});

	it('escapes quotes in cell values', () => {
		expect(generateCSV(['Title'], [['say "hello"']])).toBe('Title\n"say ""hello"""');
	});

	it('handles Japanese header and values', () => {
		const csv = generateCSV(['商品コード', '商品名'], [['P-001', '蛍光灯']]);
		expect(csv).toBe('商品コード,商品名\nP-001,蛍光灯');
	});
});

describe('parseCSV', () => {
	it('parses a single row of values', () => {
		expect(parseCSV('A,B,C')).toEqual([['A', 'B', 'C']]);
	});

	it('parses multiple rows', () => {
		expect(parseCSV('A,B\n1,2\n3,4')).toEqual([
			['A', 'B'],
			['1', '2'],
			['3', '4']
		]);
	});

	it('handles quoted fields containing commas', () => {
		expect(parseCSV('"Smith, J.",30')).toEqual([['Smith, J.', '30']]);
	});

	it('handles escaped double-quotes inside quoted fields', () => {
		expect(parseCSV('"say ""hi"""')).toEqual([['say "hi"']]);
	});

	it('handles CRLF line endings', () => {
		expect(parseCSV('A,B\r\n1,2\r\n3,4')).toEqual([
			['A', 'B'],
			['1', '2'],
			['3', '4']
		]);
	});

	it('strips UTF-8 BOM at start of input', () => {
		expect(parseCSV('\uFEFFName,Value\nhello,world')).toEqual([
			['Name', 'Value'],
			['hello', 'world']
		]);
	});

	it('ignores blank lines between data rows', () => {
		expect(parseCSV('A,B\n\n1,2\n\n')).toEqual([
			['A', 'B'],
			['1', '2']
		]);
	});

	it('returns empty array for empty input', () => {
		expect(parseCSV('')).toEqual([]);
	});

	it('returns empty array for whitespace-only input', () => {
		expect(parseCSV('   \n  \n')).toEqual([]);
	});

	it('handles a single value with no commas', () => {
		expect(parseCSV('hello')).toEqual([['hello']]);
	});

	it('handles an empty quoted field', () => {
		expect(parseCSV('"",B')).toEqual([['', 'B']]);
	});

	it('roundtrips: generateCSV then parseCSV returns original data', () => {
		const headers = ['商品コード', '商品名', '数量'];
		const rows = [
			['P-001', '蛍光灯 40W', '10.5'],
			['P-002', 'ケーブル,長さ付き', '3']
		];
		const csv = generateCSV(headers, rows);
		const parsed = parseCSV(csv);
		expect(parsed).toEqual([headers, ...rows]);
	});

	it('handles real-world CSV with BOM and CRLF (Windows export format)', () => {
		const input = '\uFEFF商品コード,数量\r\nP-001,5\r\nP-002,10\r\n';
		expect(parseCSV(input)).toEqual([
			['商品コード', '数量'],
			['P-001', '5'],
			['P-002', '10']
		]);
	});
});
