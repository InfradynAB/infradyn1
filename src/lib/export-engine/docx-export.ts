import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { TabularExportPayload } from "./types";
import { formatExportValue, normalizeFileName, triggerBlobDownload } from "./helpers";

async function dataUrlToUint8Array(dataUrl: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function exportDocx(payload: TabularExportPayload) {
  const { title, fileName, columns, rows, chartImages = [] } = payload;

  const headerRow = new TableRow({
    tableHeader: true,
    children: columns.map(
      (column) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: column.label, bold: true })],
            }),
          ],
        })
    ),
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: columns.map(
          (column) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun(formatExportValue(row[column.key]))],
                }),
              ],
            })
        ),
      })
  );

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: title || fileName,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    }),
  ];

  if (chartImages.length > 0) {
    children.push(
      new Paragraph({
        text: "Charts",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 160 },
      })
    );

    for (const chart of chartImages) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: chart.title, bold: true })],
          spacing: { before: 240, after: 120 },
        })
      );

      const bytes = await dataUrlToUint8Array(chart.dataUrl);
      if (!bytes) {
        children.push(
          new Paragraph({
            text: "Chart image unavailable",
            spacing: { after: 160 },
          })
        );
        continue;
      }

      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: bytes,
              transformation: {
                width: 640,
                height: 320,
              },
              type: "png",
            }),
          ],
          spacing: { after: 160 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, normalizeFileName(fileName, "docx"));
}
