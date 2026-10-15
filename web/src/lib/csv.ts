/**
 * Spreadsheet apps run cells that start with = + - @ (or tab / CR) as
 * formulas. Scanned content is attacker-controlled, so prefix those with a
 * quote to keep them as plain text (OWASP "CSV injection").
 */
function neutralize(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Builds an RFC 4180 CSV string; every cell is quoted and formula-safe. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => `"${(typeof v === "number" ? String(v) : neutralize(v)).replace(/"/g, '""')}"`;
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
}

/** Hands the browser a CSV file to save. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
