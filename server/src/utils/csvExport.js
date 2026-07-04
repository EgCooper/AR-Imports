/**
 * Escapa un valor para CSV RFC4180.
 * @param {unknown} value
 */
export function escapeCsvValue(value) {
  if (value == null) return '';
  const stringValue = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Genera contenido CSV a partir de filas y definición de columnas.
 * @param {object[]} rows
 * @param {{ header: string, value: (row: object) => unknown }[]} columns
 */
export function buildCsv(rows, columns) {
  const header = columns.map((col) => escapeCsvValue(col.header)).join(',');
  const body = rows.map((row) => columns.map((col) => escapeCsvValue(col.value(row))).join(','));
  return `\uFEFF${[header, ...body].join('\r\n')}`;
}

/**
 * @param {import('express').Response} res
 * @param {string} filename
 * @param {string} csvContent
 */
export function sendCsvResponse(res, filename, csvContent) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csvContent);
}
