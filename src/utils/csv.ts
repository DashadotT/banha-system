/**
 * Converts an array of flat row objects into a CSV string and triggers a
 * browser download. No external dependency needed — the resulting .csv
 * opens directly in Excel, Google Sheets, or Numbers.
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const escapeCell = (cell: string | number | null): string => {
    const value = cell === null || cell === undefined ? '' : String(cell);
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  // Prefix a BOM so Excel correctly detects UTF-8 (needed for ₂/°/± symbols).
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
