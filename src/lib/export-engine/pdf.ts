import type { TabularExportPayload } from "./types";
import { normalizeFileName, rowsToMatrix } from "./helpers";

type JsPdfWithAutoTable = {
  lastAutoTable?: {
    finalY?: number;
  };
};

export async function exportPdf(payload: TabularExportPayload) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const autoTable = autoTableModule.default;
  const { columns, rows, fileName, title, chartImages = [] } = payload;

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

  if (chartImages.length > 0) {
    const autoTableDoc = doc as unknown as JsPdfWithAutoTable;
    const finalY = autoTableDoc.lastAutoTable?.finalY;
    let y = typeof finalY === "number" ? finalY + 24 : 80;
    const usableWidth = pageWidth - 48;
    const imageHeight = 220;

    for (const chart of chartImages) {
      if (y + imageHeight + 40 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        y = 40;
      }

      doc.setFontSize(11);
      doc.text(chart.title, 24, y);
      y += 10;

      try {
        doc.addImage(chart.dataUrl, "PNG", 24, y, usableWidth, imageHeight, undefined, "FAST");
        y += imageHeight + 20;
      } catch {
        doc.setFontSize(9);
        doc.text("Chart image unavailable", 24, y + 12);
        y += 28;
      }
    }
  }

  doc.save(normalizeFileName(fileName, "pdf"));
}
