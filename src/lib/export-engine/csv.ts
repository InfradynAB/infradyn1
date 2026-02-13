import type { TabularExportPayload } from "./types";
import { normalizeFileName, rowsToMatrix, triggerBlobDownload } from "./helpers";

function csvEscape(value: string) {
  const escaped = value.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function exportCsv(payload: TabularExportPayload) {
  const { columns, rows, fileName } = payload;
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const matrix = rowsToMatrix(rows, columns)
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const csv = [header, matrix].filter(Boolean).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerBlobDownload(blob, normalizeFileName(fileName, "csv"));
}
