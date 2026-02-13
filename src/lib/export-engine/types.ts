export type ExportFormat = "csv" | "excel" | "pdf";

export interface ExportColumn {
  key: string;
  label: string;
}

export type ExportValue = string | number | boolean | null | undefined;
export type ExportRow = Record<string, ExportValue>;

export interface TabularExportPayload {
  fileName: string;
  format: ExportFormat;
  columns: ExportColumn[];
  rows: ExportRow[];
  title?: string;
}
