import type { Gstr2bDocRow } from '@ramsoft-builder/gstr2b/models/entities';

export function gstr2bDocRowsToCsv(
  rows: readonly Gstr2bDocRow[],
  columns: readonly { label: string; field: keyof Gstr2bDocRow }[],
): string {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((c) => `"${String(row[c.field] ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
  return `${header}\n${body}`;
}
