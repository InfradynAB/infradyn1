import { exportCsv } from "./csv";
import { exportExcel } from "./excel";
import { exportPdf } from "./pdf";
import type { TabularExportPayload } from "./types";
import { ensureColumns } from "./helpers";

export type { ExportColumn, ExportFormat, ExportRow, TabularExportPayload } from "./types";

export async function exportTabularData(payload: TabularExportPayload) {
  const columns = ensureColumns(payload.columns);
  const normalizedPayload: TabularExportPayload = {
    ...payload,
    columns,
  };

  if (normalizedPayload.format === "csv") {
    exportCsv(normalizedPayload);
    return;
  }

  if (normalizedPayload.format === "excel") {
    await exportExcel(normalizedPayload);
    return;
  }

  await exportPdf(normalizedPayload);
}
