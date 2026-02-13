import type { ExportColumn, ExportRow } from "./types";

export function ensureColumns(columns: ExportColumn[]): ExportColumn[] {
  return columns.filter((column, index, all) =>
    all.findIndex((item) => item.key === column.key) === index
  );
}

export function normalizeFileName(baseName: string, extension: string): string {
  const safeBase = (baseName || "export")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "export";

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${safeBase}-${stamp}.${extension}`;
}

export function rowsToMatrix(rows: ExportRow[], columns: ExportColumn[]): string[][] {
  return rows.map((row) =>
    columns.map((column) => formatExportValue(row[column.key]))
  );
}

export function formatExportValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
