export function escapeCSV(value: string): string {
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
