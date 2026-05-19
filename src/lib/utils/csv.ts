export function escapeCSV(value: string): string {
	// Prevent formula injection in Excel/Google Sheets
	if (value.length > 0 && '=+-@\t\r'.includes(value[0])) {
		value = "'" + value;
	}
	if (value.includes(',') || value.includes('"') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function generateCSV(headers: string[], rows: string[][]): string {
	const csvRows = [headers.join(',')];

	for (const row of rows) {
		csvRows.push(row.map(escapeCSV).join(','));
	}

	return csvRows.join('\n');
}

export function parseCSV(text: string): string[][] {
	// Strip UTF-8 BOM if present
	const content = text.startsWith('\uFEFF') ? text.slice(1) : text;
	const result: string[][] = [];
	let pos = 0;

	while (pos < content.length) {
		const row: string[] = [];

		// Parse one row
		while (pos < content.length) {
			let field = '';

			if (content[pos] === '"') {
				// Quoted field
				pos++; // skip opening "
				while (pos < content.length) {
					if (content[pos] === '"' && content[pos + 1] === '"') {
						field += '"';
						pos += 2;
					} else if (content[pos] === '"') {
						pos++; // skip closing "
						break;
					} else {
						field += content[pos++];
					}
				}
			} else {
				// Unquoted field
				while (
					pos < content.length &&
					content[pos] !== ',' &&
					content[pos] !== '\r' &&
					content[pos] !== '\n'
				) {
					field += content[pos++];
				}
			}

			row.push(field);

			// End of row?
			if (pos >= content.length || content[pos] === '\r' || content[pos] === '\n') {
				break;
			}
			pos++; // skip comma
		}

		// Skip line ending
		if (pos < content.length && content[pos] === '\r') pos++;
		if (pos < content.length && content[pos] === '\n') pos++;

		// Only keep non-empty rows
		if (row.length > 0 && row.some((c) => c.trim() !== '')) {
			result.push(row);
		}
	}

	return result;
}