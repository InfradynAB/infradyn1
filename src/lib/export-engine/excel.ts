import type { TabularExportPayload } from "./types";
import { normalizeFileName, formatExportValue } from "./helpers";

export async function exportExcel(payload: TabularExportPayload) {
  const XLSX = await import("xlsx");
  const { columns, rows, fileName } = payload;

  const sheetRows = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const column of columns) {
      out[column.label] = formatExportValue(row[column.key]);
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
  XLSX.writeFile(workbook, normalizeFileName(fileName, "xlsx"));
}
