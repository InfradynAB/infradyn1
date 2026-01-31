/**
 * Phase 8: Excel Export Utility
 * Creates professionally styled Excel exports for dashboard data
 */

import ExcelJS from "exceljs";

// ============================================
// STYLE DEFINITIONS
// ============================================

const COLORS = {
    primary: "1E3A5F",      // Dark blue
    secondary: "2E7D32",    // Green
    accent: "F57C00",       // Orange
    danger: "C62828",       // Red
    warning: "FFA000",      // Amber
    light: "F5F5F5",        // Light gray
    white: "FFFFFF",
    black: "000000",
    headerBg: "1E3A5F",
    headerText: "FFFFFF",
    sectionBg: "E3F2FD",
    altRowBg: "F8F9FA",
};

const FONTS = {
    title: { name: "Calibri", size: 18, bold: true, color: { argb: COLORS.primary } },
    sectionHeader: { name: "Calibri", size: 12, bold: true, color: { argb: COLORS.white } },
    tableHeader: { name: "Calibri", size: 10, bold: true, color: { argb: COLORS.white } },
    normal: { name: "Calibri", size: 10 },
    bold: { name: "Calibri", size: 10, bold: true },
    currency: { name: "Calibri", size: 10 },
    percentage: { name: "Calibri", size: 10 },
};

const BORDERS: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "CCCCCC" } },
    left: { style: "thin", color: { argb: "CCCCCC" } },
    bottom: { style: "thin", color: { argb: "CCCCCC" } },
    right: { style: "thin", color: { argb: "CCCCCC" } },
};

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DashboardExportData {
    kpis: {
        financial: {
            totalCommitted: number;
            totalPaid: number;
            totalUnpaid: number;
            totalPending: number;
            retentionHeld: number;
            changeOrderImpact: number;
            forecastToComplete: number;
        };
        progress: {
            physicalProgress: number;
            financialProgress: number;
            milestonesCompleted: number;
            milestonesTotal: number;
            activePOs: number;
            totalPOs: number;
            onTrackCount: number;
            atRiskCount: number;
            delayedCount: number;
        };
        quality: {
            totalNCRs: number;
            openNCRs: number;
            criticalNCRs: number;
            ncrRate: number;
            ncrFinancialImpact: number;
        };
        suppliers: {
            totalSuppliers: number;
            activeSuppliers: number;
            avgDeliveryScore: number;
            avgQualityScore: number;
            topExposure: Array<{ supplierName: string; exposure: number }>;
        };
        logistics: {
            totalShipments: number;
            deliveredOnTime: number;
            delayedShipments: number;
            inTransit: number;
            onTimeRate: number;
        };
    };
    sCurve: Array<{ month: string; plannedCumulative: number; actualCumulative: number }>;
    coBreakdown: { scope: number; rate: number; quantity: number; schedule: number; total: number };
    milestones: Array<{
        poNumber: string;
        supplierName: string;
        milestoneName: string;
        progressPercent: number;
        status: string;
        expectedDate: string | null;
        invoiceStatus: string | null;
        amount: number;
    }>;
    supplierProgress: Array<{
        supplierName: string;
        physicalProgress: number;
        financialProgress: number;
        poCount: number;
        totalValue: number;
        paidAmount: number;
        unpaidAmount: number;
    }>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const num = (val: unknown): number => Number(val) || 0;

function formatCurrency(value: unknown): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num(value));
}

function addSectionHeader(
    worksheet: ExcelJS.Worksheet,
    title: string,
    startRow: number,
    colSpan: number = 2
): number {
    const row = worksheet.getRow(startRow);
    row.height = 24;
    
    worksheet.mergeCells(startRow, 1, startRow, colSpan);
    const cell = worksheet.getCell(startRow, 1);
    cell.value = title;
    cell.font = FONTS.sectionHeader;
    cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.headerBg },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    
    return startRow + 1;
}

function addMetricRow(
    worksheet: ExcelJS.Worksheet,
    label: string,
    value: string | number,
    rowNum: number,
    isHighlight: boolean = false
): number {
    const row = worksheet.getRow(rowNum);
    row.height = 20;
    
    const labelCell = worksheet.getCell(rowNum, 1);
    labelCell.value = label;
    labelCell.font = isHighlight ? FONTS.bold : FONTS.normal;
    labelCell.alignment = { vertical: "middle", indent: 1 };
    labelCell.border = BORDERS;
    
    const valueCell = worksheet.getCell(rowNum, 2);
    valueCell.value = value;
    valueCell.font = isHighlight ? FONTS.bold : FONTS.normal;
    valueCell.alignment = { vertical: "middle", horizontal: "right" };
    valueCell.border = BORDERS;
    
    if (rowNum % 2 === 0) {
        labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.altRowBg } };
        valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.altRowBg } };
    }
    
    return rowNum + 1;
}

function addTableHeader(
    worksheet: ExcelJS.Worksheet,
    headers: string[],
    rowNum: number,
    widths?: number[]
): number {
    const row = worksheet.getRow(rowNum);
    row.height = 22;
    
    headers.forEach((header, idx) => {
        const cell = worksheet.getCell(rowNum, idx + 1);
        cell.value = header;
        cell.font = FONTS.tableHeader;
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.primary },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = BORDERS;
        
        if (widths && widths[idx]) {
            worksheet.getColumn(idx + 1).width = widths[idx];
        }
    });
    
    return rowNum + 1;
}

function addTableRow(
    worksheet: ExcelJS.Worksheet,
    values: (string | number)[],
    rowNum: number,
    alignments?: ("left" | "center" | "right")[]
): number {
    const row = worksheet.getRow(rowNum);
    row.height = 18;
    
    values.forEach((value, idx) => {
        const cell = worksheet.getCell(rowNum, idx + 1);
        cell.value = value;
        cell.font = FONTS.normal;
        cell.alignment = { 
            vertical: "middle", 
            horizontal: alignments?.[idx] || "left" 
        };
        cell.border = BORDERS;
        
        if (rowNum % 2 === 0) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.altRowBg } };
        }
    });
    
    return rowNum + 1;
}

function addStatusBadge(
    worksheet: ExcelJS.Worksheet,
    status: string,
    rowNum: number,
    colNum: number
): void {
    const cell = worksheet.getCell(rowNum, colNum);
    cell.value = status;
    
    const statusColors: Record<string, string> = {
        "COMPLETED": COLORS.secondary,
        "ON_TRACK": COLORS.secondary,
        "AT_RISK": COLORS.warning,
        "DELAYED": COLORS.danger,
        "PAID": COLORS.secondary,
        "APPROVED": COLORS.primary,
        "PENDING": COLORS.warning,
    };
    
    const color = statusColors[status] || COLORS.black;
    cell.font = { ...FONTS.bold, color: { argb: color } };
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export async function generateExcelReport(
    data: DashboardExportData,
    reportType: "summary" | "detailed" = "detailed",
    metadata?: { generatedBy?: string; organizationName?: string }
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = metadata?.generatedBy || "Infradyn";
    workbook.created = new Date();
    
    // ============================================
    // SUMMARY SHEET
    // ============================================
    const summarySheet = workbook.addWorksheet("Executive Summary", {
        properties: { tabColor: { argb: COLORS.primary } },
    });
    
    // Set column widths
    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 20;
    
    // Title
    let currentRow = 1;
    summarySheet.mergeCells(1, 1, 1, 2);
    const titleCell = summarySheet.getCell(1, 1);
    titleCell.value = `Dashboard Report - ${new Date().toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
    })}`;
    titleCell.font = FONTS.title;
    titleCell.alignment = { vertical: "middle" };
    summarySheet.getRow(1).height = 30;
    currentRow = 3;
    
    // Financial Summary
    currentRow = addSectionHeader(summarySheet, "💰 FINANCIAL SUMMARY", currentRow);
    currentRow = addMetricRow(summarySheet, "Total Committed", formatCurrency(data.kpis.financial.totalCommitted), currentRow, true);
    currentRow = addMetricRow(summarySheet, "Total Paid", formatCurrency(data.kpis.financial.totalPaid), currentRow);
    currentRow = addMetricRow(summarySheet, "Total Unpaid", formatCurrency(data.kpis.financial.totalUnpaid), currentRow, true);
    currentRow = addMetricRow(summarySheet, "Pending Approval", formatCurrency(data.kpis.financial.totalPending), currentRow);
    currentRow = addMetricRow(summarySheet, "Retention Held", formatCurrency(data.kpis.financial.retentionHeld), currentRow);
    currentRow = addMetricRow(summarySheet, "Change Order Impact", formatCurrency(data.kpis.financial.changeOrderImpact), currentRow);
    currentRow = addMetricRow(summarySheet, "Forecast to Complete", formatCurrency(data.kpis.financial.forecastToComplete), currentRow, true);
    currentRow++;
    
    // Progress Summary
    currentRow = addSectionHeader(summarySheet, "📊 PROGRESS SUMMARY", currentRow);
    currentRow = addMetricRow(summarySheet, "Physical Progress", `${num(data.kpis.progress.physicalProgress).toFixed(1)}%`, currentRow);
    currentRow = addMetricRow(summarySheet, "Financial Progress", `${num(data.kpis.progress.financialProgress).toFixed(1)}%`, currentRow);
    currentRow = addMetricRow(summarySheet, "Milestones", `${data.kpis.progress.milestonesCompleted} / ${data.kpis.progress.milestonesTotal}`, currentRow);
    currentRow = addMetricRow(summarySheet, "Active POs", `${data.kpis.progress.activePOs} / ${data.kpis.progress.totalPOs}`, currentRow);
    currentRow = addMetricRow(summarySheet, "On Track", String(data.kpis.progress.onTrackCount), currentRow);
    currentRow = addMetricRow(summarySheet, "At Risk", String(data.kpis.progress.atRiskCount), currentRow);
    currentRow = addMetricRow(summarySheet, "Delayed", String(data.kpis.progress.delayedCount), currentRow);
    currentRow++;
    
    // Quality Summary
    currentRow = addSectionHeader(summarySheet, "🔍 QUALITY SUMMARY", currentRow);
    currentRow = addMetricRow(summarySheet, "Total NCRs", String(data.kpis.quality.totalNCRs), currentRow);
    currentRow = addMetricRow(summarySheet, "Open NCRs", String(data.kpis.quality.openNCRs), currentRow);
    currentRow = addMetricRow(summarySheet, "Critical NCRs", String(data.kpis.quality.criticalNCRs), currentRow, data.kpis.quality.criticalNCRs > 0);
    currentRow = addMetricRow(summarySheet, "NCR Rate", `${num(data.kpis.quality.ncrRate).toFixed(1)}%`, currentRow);
    currentRow = addMetricRow(summarySheet, "NCR Financial Impact", formatCurrency(data.kpis.quality.ncrFinancialImpact), currentRow);
    currentRow++;
    
    // Supplier Summary
    currentRow = addSectionHeader(summarySheet, "🏭 SUPPLIER SUMMARY", currentRow);
    currentRow = addMetricRow(summarySheet, "Total Suppliers", String(data.kpis.suppliers.totalSuppliers), currentRow);
    currentRow = addMetricRow(summarySheet, "Active Suppliers", String(data.kpis.suppliers.activeSuppliers), currentRow);
    currentRow = addMetricRow(summarySheet, "Avg Delivery Score", `${num(data.kpis.suppliers.avgDeliveryScore).toFixed(1)}%`, currentRow);
    currentRow = addMetricRow(summarySheet, "Avg Quality Score", `${num(data.kpis.suppliers.avgQualityScore).toFixed(1)}%`, currentRow);
    currentRow++;
    
    // Logistics Summary
    currentRow = addSectionHeader(summarySheet, "🚚 LOGISTICS SUMMARY", currentRow);
    currentRow = addMetricRow(summarySheet, "Total Shipments", String(data.kpis.logistics.totalShipments), currentRow);
    currentRow = addMetricRow(summarySheet, "Delivered On-Time", String(data.kpis.logistics.deliveredOnTime), currentRow);
    currentRow = addMetricRow(summarySheet, "Delayed", String(data.kpis.logistics.delayedShipments), currentRow);
    currentRow = addMetricRow(summarySheet, "In Transit", String(data.kpis.logistics.inTransit), currentRow);
    currentRow = addMetricRow(summarySheet, "On-Time Rate", `${num(data.kpis.logistics.onTimeRate).toFixed(1)}%`, currentRow);
    
    // ============================================
    // S-CURVE SHEET
    // ============================================
    if (data.sCurve.length > 0) {
        const sCurveSheet = workbook.addWorksheet("S-Curve Data", {
            properties: { tabColor: { argb: COLORS.secondary } },
        });
        
        let row = 1;
        sCurveSheet.mergeCells(1, 1, 1, 3);
        sCurveSheet.getCell(1, 1).value = "S-Curve - Planned vs Actual";
        sCurveSheet.getCell(1, 1).font = FONTS.title;
        sCurveSheet.getRow(1).height = 30;
        row = 3;
        
        row = addTableHeader(sCurveSheet, ["Month", "Planned Cumulative", "Actual Cumulative"], row, [15, 20, 20]);
        
        data.sCurve.forEach((item) => {
            row = addTableRow(
                sCurveSheet,
                [item.month, formatCurrency(item.plannedCumulative), formatCurrency(item.actualCumulative)],
                row,
                ["left", "right", "right"]
            );
        });
    }
    
    // ============================================
    // CHANGE ORDERS SHEET
    // ============================================
    const coSheet = workbook.addWorksheet("Change Orders", {
        properties: { tabColor: { argb: COLORS.accent } },
    });
    
    coSheet.getColumn(1).width = 20;
    coSheet.getColumn(2).width = 18;
    
    let coRow = 1;
    coSheet.mergeCells(1, 1, 1, 2);
    coSheet.getCell(1, 1).value = "Change Order Breakdown";
    coSheet.getCell(1, 1).font = FONTS.title;
    coSheet.getRow(1).height = 30;
    coRow = 3;
    
    coRow = addSectionHeader(coSheet, "CO BREAKDOWN BY TYPE", coRow);
    coRow = addMetricRow(coSheet, "Scope Changes", formatCurrency(data.coBreakdown.scope), coRow);
    coRow = addMetricRow(coSheet, "Rate Changes", formatCurrency(data.coBreakdown.rate), coRow);
    coRow = addMetricRow(coSheet, "Quantity Changes", formatCurrency(data.coBreakdown.quantity), coRow);
    coRow = addMetricRow(coSheet, "Schedule Changes", formatCurrency(data.coBreakdown.schedule), coRow);
    coRow = addMetricRow(coSheet, "Total Impact", formatCurrency(data.coBreakdown.total), coRow, true);
    
    // ============================================
    // DETAILED SHEETS (if detailed report)
    // ============================================
    if (reportType === "detailed") {
        // Milestone Tracker Sheet
        if (data.milestones.length > 0) {
            const msSheet = workbook.addWorksheet("Milestone Tracker", {
                properties: { tabColor: { argb: COLORS.warning } },
            });
            
            let msRow = 1;
            msSheet.mergeCells(1, 1, 1, 8);
            msSheet.getCell(1, 1).value = "Milestone Tracker - Detailed View";
            msSheet.getCell(1, 1).font = FONTS.title;
            msSheet.getRow(1).height = 30;
            msRow = 3;
            
            msRow = addTableHeader(
                msSheet,
                ["PO Number", "Supplier", "Milestone", "Progress", "Status", "Expected Date", "Invoice", "Amount"],
                msRow,
                [15, 20, 25, 12, 12, 14, 12, 15]
            );
            
            data.milestones.forEach((m) => {
                const row = msSheet.getRow(msRow);
                row.height = 18;
                
                msSheet.getCell(msRow, 1).value = m.poNumber;
                msSheet.getCell(msRow, 2).value = m.supplierName;
                msSheet.getCell(msRow, 3).value = m.milestoneName;
                msSheet.getCell(msRow, 4).value = `${num(m.progressPercent).toFixed(0)}%`;
                msSheet.getCell(msRow, 4).alignment = { horizontal: "center" };
                
                addStatusBadge(msSheet, m.status, msRow, 5);
                msSheet.getCell(msRow, 5).alignment = { horizontal: "center" };
                
                msSheet.getCell(msRow, 6).value = m.expectedDate 
                    ? new Date(m.expectedDate).toLocaleDateString() 
                    : "—";
                msSheet.getCell(msRow, 6).alignment = { horizontal: "center" };
                
                if (m.invoiceStatus) {
                    addStatusBadge(msSheet, m.invoiceStatus, msRow, 7);
                } else {
                    msSheet.getCell(msRow, 7).value = "—";
                }
                msSheet.getCell(msRow, 7).alignment = { horizontal: "center" };
                
                msSheet.getCell(msRow, 8).value = formatCurrency(m.amount);
                msSheet.getCell(msRow, 8).alignment = { horizontal: "right" };
                
                // Apply borders and alternating colors
                for (let col = 1; col <= 8; col++) {
                    const cell = msSheet.getCell(msRow, col);
                    cell.border = BORDERS;
                    if (msRow % 2 === 0) {
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.altRowBg } };
                    }
                }
                
                msRow++;
            });
        }
        
        // Supplier Progress Sheet
        if (data.supplierProgress.length > 0) {
            const spSheet = workbook.addWorksheet("Supplier Progress", {
                properties: { tabColor: { argb: COLORS.danger } },
            });
            
            let spRow = 1;
            spSheet.mergeCells(1, 1, 1, 7);
            spSheet.getCell(1, 1).value = "Supplier Progress Report";
            spSheet.getCell(1, 1).font = FONTS.title;
            spSheet.getRow(1).height = 30;
            spRow = 3;
            
            spRow = addTableHeader(
                spSheet,
                ["Supplier", "Physical %", "Financial %", "PO Count", "Total Value", "Paid", "Unpaid"],
                spRow,
                [25, 12, 12, 10, 15, 15, 15]
            );
            
            data.supplierProgress.forEach((s) => {
                spRow = addTableRow(
                    spSheet,
                    [
                        s.supplierName,
                        `${num(s.physicalProgress).toFixed(1)}%`,
                        `${num(s.financialProgress).toFixed(1)}%`,
                        String(s.poCount),
                        formatCurrency(s.totalValue),
                        formatCurrency(s.paidAmount),
                        formatCurrency(s.unpaidAmount),
                    ],
                    spRow,
                    ["left", "center", "center", "center", "right", "right", "right"]
                );
            });
        }
        
        // Top Supplier Exposure Sheet
        if (data.kpis.suppliers.topExposure.length > 0) {
            const expSheet = workbook.addWorksheet("Supplier Exposure", {
                properties: { tabColor: { argb: COLORS.accent } },
            });
            
            let expRow = 1;
            expSheet.mergeCells(1, 1, 1, 2);
            expSheet.getCell(1, 1).value = "Top Supplier Exposure";
            expSheet.getCell(1, 1).font = FONTS.title;
            expSheet.getRow(1).height = 30;
            expRow = 3;
            
            expRow = addTableHeader(expSheet, ["Supplier", "Exposure"], expRow, [30, 20]);
            
            data.kpis.suppliers.topExposure.forEach((s) => {
                expRow = addTableRow(
                    expSheet,
                    [s.supplierName, formatCurrency(s.exposure)],
                    expRow,
                    ["left", "right"]
                );
            });
        }
    }
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ============================================
// SIMPLE CSV EXPORT (fallback)
// ============================================

export function generateCSVReport(data: DashboardExportData): string {
    const num = (val: unknown): number => Number(val) || 0;
    const fmt = (val: unknown, decimals = 2): string => num(val).toFixed(decimals);

    const lines: string[] = [];
    const addSection = (title: string, headers: string[], rows: string[][]) => {
        lines.push(`\n${title}`);
        lines.push(headers.join(","));
        rows.forEach(row => lines.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")));
    };

    // Financial Summary
    addSection("FINANCIAL SUMMARY", 
        ["Metric", "Value"],
        [
            ["Total Committed", fmt(data.kpis.financial.totalCommitted)],
            ["Total Paid", fmt(data.kpis.financial.totalPaid)],
            ["Total Unpaid", fmt(data.kpis.financial.totalUnpaid)],
            ["Pending Approval", fmt(data.kpis.financial.totalPending)],
            ["Retention Held", fmt(data.kpis.financial.retentionHeld)],
            ["CO Impact", fmt(data.kpis.financial.changeOrderImpact)],
            ["Forecast to Complete", fmt(data.kpis.financial.forecastToComplete)],
        ]
    );

    // Progress Summary
    addSection("PROGRESS SUMMARY",
        ["Metric", "Value"],
        [
            ["Physical Progress %", fmt(data.kpis.progress.physicalProgress, 1)],
            ["Financial Progress %", fmt(data.kpis.progress.financialProgress, 1)],
            ["Milestones Completed", `${data.kpis.progress.milestonesCompleted}/${data.kpis.progress.milestonesTotal}`],
            ["Active POs", `${data.kpis.progress.activePOs}/${data.kpis.progress.totalPOs}`],
            ["On Track", String(data.kpis.progress.onTrackCount)],
            ["At Risk", String(data.kpis.progress.atRiskCount)],
            ["Delayed", String(data.kpis.progress.delayedCount)],
        ]
    );

    // Quality Summary
    addSection("QUALITY SUMMARY",
        ["Metric", "Value"],
        [
            ["Total NCRs", String(data.kpis.quality.totalNCRs)],
            ["Open NCRs", String(data.kpis.quality.openNCRs)],
            ["Critical NCRs", String(data.kpis.quality.criticalNCRs)],
            ["NCR Rate %", fmt(data.kpis.quality.ncrRate, 1)],
            ["NCR Financial Impact", fmt(data.kpis.quality.ncrFinancialImpact)],
        ]
    );

    // Supplier Summary
    addSection("SUPPLIER SUMMARY",
        ["Metric", "Value"],
        [
            ["Total Suppliers", String(data.kpis.suppliers.totalSuppliers)],
            ["Active Suppliers", String(data.kpis.suppliers.activeSuppliers)],
            ["Avg Delivery Score", fmt(data.kpis.suppliers.avgDeliveryScore, 1)],
            ["Avg Quality Score", fmt(data.kpis.suppliers.avgQualityScore, 1)],
        ]
    );

    // Top Supplier Exposure
    if (data.kpis.suppliers.topExposure.length > 0) {
        addSection("TOP SUPPLIER EXPOSURE",
            ["Supplier", "Exposure"],
            data.kpis.suppliers.topExposure.map(s => [s.supplierName, fmt(s.exposure)])
        );
    }

    // S-Curve Data
    if (data.sCurve.length > 0) {
        addSection("S-CURVE DATA",
            ["Month", "Planned Cumulative", "Actual Cumulative"],
            data.sCurve.map(d => [d.month, fmt(d.plannedCumulative), fmt(d.actualCumulative)])
        );
    }

    // CO Breakdown
    addSection("CHANGE ORDER BREAKDOWN",
        ["Type", "Value"],
        [
            ["Scope", fmt(data.coBreakdown.scope)],
            ["Rate", fmt(data.coBreakdown.rate)],
            ["Quantity", fmt(data.coBreakdown.quantity)],
            ["Schedule", fmt(data.coBreakdown.schedule)],
            ["Total", fmt(data.coBreakdown.total)],
        ]
    );

    // Milestone Tracker
    if (data.milestones.length > 0) {
        addSection("MILESTONE TRACKER",
            ["PO Number", "Supplier", "Milestone", "Progress %", "Status", "Expected Date", "Invoice Status", "Amount"],
            data.milestones.map(m => [
                m.poNumber,
                m.supplierName,
                m.milestoneName,
                fmt(m.progressPercent, 1),
                m.status,
                m.expectedDate || "N/A",
                m.invoiceStatus || "N/A",
                fmt(m.amount),
            ])
        );
    }

    // Supplier Progress
    if (data.supplierProgress.length > 0) {
        addSection("SUPPLIER PROGRESS",
            ["Supplier", "Physical Progress %", "Financial Progress %", "PO Count", "Total Value", "Paid", "Unpaid"],
            data.supplierProgress.map(s => [
                s.supplierName,
                fmt(s.physicalProgress, 1),
                fmt(s.financialProgress, 1),
                String(s.poCount),
                fmt(s.totalValue),
                fmt(s.paidAmount),
                fmt(s.unpaidAmount),
            ])
        );
    }

    return lines.join("\n");
}
