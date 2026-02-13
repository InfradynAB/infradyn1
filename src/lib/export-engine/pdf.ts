import type { TabularExportPayload } from "./types";
import { normalizeFileName, rowsToMatrix } from "./helpers";

export async function exportPdf(payload: TabularExportPayload) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const autoTable = autoTableModule.default;
  const { columns, rows, fileName, title } = payload;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const docTitle = title || fileName;

  doc.setFontSize(12);
  doc.text(docTitle, 40, 34);

  autoTable(doc, {
    startY: 48,
    head: [columns.map((column) => column.label)],
    body: rowsToMatrix(rows, columns),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [15, 97, 87] },
    margin: { left: 24, right: 24 },
    tableWidth: pageWidth - 48,
  });

  doc.save(normalizeFileName(fileName, "pdf"));
}
