import { exportCsv } from "./csv";
import { exportExcel } from "./excel";
import { exportPdf } from "./pdf";
import { exportDocx } from "./docx-export";
import type { TabularExportPayload } from "./types";
import { ensureColumns } from "./helpers";

export type { ExportChartImage, ExportColumn, ExportFormat, ExportRow, TabularExportPayload } from "./types";

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

  if (normalizedPayload.format === "docx") {
    await exportDocx(normalizedPayload);
    return;
  }

  await exportPdf(normalizedPayload);
}
