import PptxGenJS from "pptxgenjs";
import type { DashboardExportData } from "@/lib/utils/excel-export";

type PptxSource = "executive" | "pm" | "supplier";

type PptxInstance = InstanceType<typeof PptxGenJS>;
type PptxSlide = ReturnType<PptxInstance["addSlide"]>;
type PptxChartData = Parameters<PptxSlide["addChart"]>[1];
type PptxChartOpts = Parameters<PptxSlide["addChart"]>[2];
type PptxTableData = Parameters<PptxSlide["addTable"]>[0];
type PptxTableOpts = Parameters<PptxSlide["addTable"]>[1];
type PptxShapeType = Parameters<PptxSlide["addShape"]>[0];

export type PptxExportOptions = {
    source: PptxSource;
    audience?: string;
    reportType?: "summary" | "detailed";
    timeframeLabel: string;
    projectId?: string;
    supplierId?: string;
    sections?: string[];
    includeTables?: boolean;
    includeCharts?: boolean;
};

const THEME = {
    bg: "FFFFFF",
    surface: "F8FAFC",
    surface2: "F1F5F9",
    border: "E2E8F0",
    text: "0F172A",
    muted: "475569",
    muted2: "64748B",
    accent: "0E7490",
    accentSoft: "E6FFFA",
} as const;

const SLIDE = {
    w: 13.333,
    h: 7.5,
    padX: 0.6,
    headerH: 1.05,
    footerH: 0.35,
} as const;

function fmtNumber(value: unknown): string {
    const num = Number(value) || 0;
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num);
}

function fmtCurrency(value: unknown, currency = "USD"): string {
    const num = Number(value) || 0;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(num);
}

function fmtPercent(value: unknown): string {
    const num = Number(value) || 0;
    return `${num.toFixed(1)}%`;
}

function addChrome(slide: PptxSlide, slideNo: number, footerRight?: string) {
    // Left accent rail
    slide.addShape("rect" as PptxShapeType, {
        x: 0,
        y: 0,
        w: 0.12,
        h: SLIDE.h,
        fill: { color: THEME.accent },
        line: { color: THEME.accent },
    });

    // Header band
    slide.addShape("rect" as PptxShapeType, {
        x: 0,
        y: 0,
        w: SLIDE.w,
        h: SLIDE.headerH,
        fill: { color: THEME.surface },
        line: { color: THEME.surface },
    });

    // Footer (subtle)
    slide.addShape("rect" as PptxShapeType, {
        x: 0,
        y: SLIDE.h - SLIDE.footerH,
        w: SLIDE.w,
        h: SLIDE.footerH,
        fill: { color: THEME.bg },
        line: { color: THEME.bg },
    });
    slide.addText(`INFRADYN  •  Slide ${slideNo}`, {
        x: SLIDE.padX,
        y: SLIDE.h - SLIDE.footerH + 0.06,
        w: 6,
        h: 0.25,
        fontFace: "Calibri",
        fontSize: 10,
        color: "94A3B8",
    });
    if (footerRight) {
        slide.addText(footerRight, {
            x: 7.0,
            y: SLIDE.h - SLIDE.footerH + 0.06,
            w: 6.2,
            h: 0.25,
            fontFace: "Calibri",
            fontSize: 10,
            align: "right",
            color: "94A3B8",
        });
    }
}

function addHeader(slide: PptxSlide, title: string, subtitle?: string) {
    slide.addText(title, {
        x: SLIDE.padX,
        y: 0.24,
        w: 12.2,
        h: 0.5,
        fontFace: "Calibri",
        fontSize: 22,
        bold: true,
        color: THEME.text,
    });

    if (subtitle) {
        slide.addText(subtitle, {
            x: SLIDE.padX,
            y: 0.68,
            w: 12.2,
            h: 0.35,
            fontFace: "Calibri",
            fontSize: 12,
            color: THEME.muted,
        });
    }

    // Accent underline
    slide.addShape("rect" as PptxShapeType, {
        x: SLIDE.padX,
        y: SLIDE.headerH - 0.06,
        w: 2.25,
        h: 0.06,
        fill: { color: THEME.accent },
        line: { color: THEME.accent },
    });
}

function addKpiTile(slide: PptxSlide, x: number, y: number, label: string, value: string) {
    // Card
    slide.addShape("roundRect" as PptxShapeType, {
        x,
        y,
        w: 6.05,
        h: 1.1,
        fill: { color: THEME.surface },
        line: { color: THEME.border },
    });

    // Accent bar
    slide.addShape("roundRect" as PptxShapeType, {
        x: x + 0.06,
        y: y + 0.08,
        w: 0.08,
        h: 0.94,
        fill: { color: THEME.accent },
        line: { color: THEME.accent },
    });

    slide.addText(label, {
        x: x + 0.25,
        y: y + 0.15,
        w: 5.55,
        h: 0.3,
        fontFace: "Calibri",
        fontSize: 12,
        color: THEME.muted2,
    });

    slide.addText(value, {
        x: x + 0.25,
        y: y + 0.45,
        w: 5.55,
        h: 0.55,
        fontFace: "Calibri",
        fontSize: 22,
        bold: true,
        color: THEME.text,
    });
}

function sectionLabel(id: string): string {
    const map: Record<string, string> = {
        financial: "Financial",
        portfolio: "Portfolio Progress",
        performance: "Performance",
        deliveries: "Deliveries",
        materials: "Materials",
        quality: "Quality",
        suppliers: "Suppliers",
        logistics: "Logistics",
        milestones: "Milestones",
        compliance: "Compliance",
        charts: "Charts",
    };

    return map[id] ?? id;
}

function buildAgendaLines(sections: string[]): string[] {
    const ordered = sections
        .filter((s) => s !== "charts")
        .concat(sections.includes("charts") ? ["charts"] : []);
    return ordered.map((s, i) => `${i + 1}. ${sectionLabel(s)}`);
}

function buildStyledTable(
    header: string[],
    rows: string[][],
): PptxTableData {
    const headerRow = header.map((text) => ({
        text,
        options: {
            bold: true,
            color: THEME.text,
            fill: { color: THEME.surface2 },
        },
    }));

    const body = rows.map((row, i) =>
        row.map((text) => ({
            text,
            options: {
                color: THEME.text,
                fill: { color: i % 2 === 0 ? THEME.bg : THEME.surface },
            },
        })),
    );

    return [headerRow, ...body] as unknown as PptxTableData;
}

function addPanel(slide: PptxSlide, x: number, y: number, w: number, h: number, title: string) {
    slide.addShape("roundRect" as PptxShapeType, {
        x,
        y,
        w,
        h,
        fill: { color: THEME.bg },
        line: { color: THEME.border, pt: 1 },
    });

    slide.addShape("rect" as PptxShapeType, {
        x,
        y,
        w,
        h: 0.36,
        fill: { color: THEME.surface2 },
        line: { color: THEME.surface2 },
    });

    slide.addText(title, {
        x: x + 0.18,
        y: y + 0.07,
        w: w - 0.36,
        h: 0.25,
        fontFace: "Calibri",
        fontSize: 12,
        bold: true,
        color: THEME.text,
    });
}

function safeIso(date: Date): string {
    try {
        return date.toISOString().slice(0, 10);
    } catch {
        return "";
    }
}

function hasAnyNonZero(values: number[]): boolean {
    return values.some((v) => Number.isFinite(v) && Math.abs(v) > 1e-9);
}

function looksLikePercent01(maxValue: number): boolean {
    // If series values are 0..1-ish, treat as normalized percent and scale.
    return Number.isFinite(maxValue) && maxValue > 0 && maxValue <= 1.5;
}

function formatCategoryLabel(raw: string): string {
    // Common formats we emit: YYYY-MM, YYYY-MM-DD
    const m1 = raw.match(/^(\d{4})-(\d{2})$/);
    if (m1) {
        const year = m1[1].slice(2);
        const monthNum = Number(m1[2]);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mon = monthNames[Math.min(12, Math.max(1, monthNum)) - 1] ?? m1[2];
        return `${mon} '${year}`;
    }

    const m2 = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) {
        return `${m2[2]}/${m2[3]}`;
    }

    return raw.length > 12 ? `${raw.slice(0, 10)}…` : raw;
}

function addEmptyChartState(slide: PptxSlide, message: string, coverage?: string[]) {
    // Matches chart area in our templates.
    slide.addShape("roundRect" as PptxShapeType, {
        x: 0.6,
        y: 1.35,
        w: 12.1,
        h: 5.7,
        fill: { color: THEME.surface },
        line: { color: THEME.border, pt: 1 },
    });

    slide.addText(message, {
        x: 0.6,
        y: 3.7,
        w: 12.1,
        h: 0.6,
        fontFace: "Calibri",
        fontSize: 16,
        bold: true,
        align: "center",
        color: THEME.muted,
    });

    slide.addText("Try a wider timeframe or confirm data exists for this scope.", {
        x: 0.6,
        y: 4.15,
        w: 12.1,
        h: 0.4,
        fontFace: "Calibri",
        fontSize: 12,
        align: "center",
        color: THEME.muted2,
    });

    if (coverage && coverage.length > 0) {
        slide.addShape("roundRect" as PptxShapeType, {
            x: 0.9,
            y: 5.25,
            w: 11.5,
            h: 1.45,
            fill: { color: THEME.bg },
            line: { color: THEME.border, pt: 1 },
        });

        slide.addText("Data Coverage", {
            x: 1.15,
            y: 5.35,
            w: 11.0,
            h: 0.3,
            fontFace: "Calibri",
            fontSize: 11,
            bold: true,
            color: THEME.text,
        });

        slide.addText(coverage.map((line) => `• ${line}`).join("\n"), {
            x: 1.15,
            y: 5.62,
            w: 11.0,
            h: 1.05,
            fontFace: "Calibri",
            fontSize: 10,
            color: THEME.muted,
            valign: "top",
            lineSpacingMultiple: 1.1,
        });
    }
}

function buildWeeklyConclusion(kpis: DashboardExportData["kpis"]): string[] {
    const onTime = Number(kpis.logistics.onTimeRate) || 0;
    const progress = Number(kpis.progress.physicalProgress) || 0;
    const openNcrs = Number(kpis.quality.openNCRs) || 0;
    const pendingAmount = Number(kpis.financial.totalPending) || 0;

    const lines: string[] = [];
    lines.push(`Progress: ${progress.toFixed(1)}% physical progress to date.`);
    lines.push(`Delivery: ${onTime.toFixed(1)}% on-time rate across tracked shipments.`);
    lines.push(`Quality: ${openNcrs} NCR(s) currently open.`);
    if (pendingAmount > 0) lines.push(`Payments: ${fmtCurrency(pendingAmount)} pending (unpaid approved) exposure.`);
    lines.push("Next week focus: close open quality items, unblock delayed deliveries, and confirm upcoming milestone dates.");
    return lines;
}

function normalizeSections(sections: string[] | undefined, source: PptxSource): string[] {
    if (sections && sections.length > 0) return sections;

    if (source === "executive") {
        return ["financial", "portfolio", "quality", "suppliers", "logistics", "milestones", "charts"];
    }

    if (source === "pm") {
        return ["financial", "deliveries", "materials", "quality", "suppliers", "milestones", "charts"];
    }

    return ["financial", "performance", "deliveries", "quality", "milestones", "compliance", "charts"];
}

export async function generatePptxReport(
    exportData: DashboardExportData,
    options: PptxExportOptions,
): Promise<Buffer> {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";

    let slideNo = 0;
    const nextSlide = (footerRight?: string) => {
        slideNo += 1;
        const slide = pptx.addSlide();
        slide.background = { color: THEME.bg };
        addChrome(slide, slideNo, footerRight);
        return slide;
    };

    const sections = normalizeSections(options.sections, options.source);
    const includeTables = options.includeTables !== false;
    const includeCharts = options.includeCharts !== false;

    // ── Title slide ────────────────────────────────────────────────────────
    {
        const slide = nextSlide(options.timeframeLabel);

        // Soft background shapes
        slide.addShape("ellipse" as PptxShapeType, {
            x: 9.1,
            y: -0.8,
            w: 6.2,
            h: 6.2,
            fill: { color: THEME.accentSoft },
            line: { color: THEME.accentSoft },
        });
        slide.addShape("ellipse" as PptxShapeType, {
            x: 10.1,
            y: -0.2,
            w: 5.2,
            h: 5.2,
            fill: { color: "D1FAE5" },
            line: { color: "D1FAE5" },
        });

        slide.addText("Infradyn Analytics", {
            x: SLIDE.padX,
            y: 2.15,
            w: 12,
            h: 0.9,
            fontFace: "Calibri",
            fontSize: 44,
            bold: true,
            color: THEME.text,
        });

        const subtitleParts = [
            options.source.toUpperCase(),
            options.reportType?.toUpperCase() ?? "DETAILED",
            options.audience ? `Audience: ${options.audience}` : null,
            options.projectId ? `Project: ${options.projectId}` : null,
            options.timeframeLabel,
        ].filter(Boolean);

        slide.addText(subtitleParts.join("  •  "), {
            x: SLIDE.padX,
            y: 3.05,
            w: 12,
            h: 0.5,
            fontFace: "Calibri",
            fontSize: 14,
            color: THEME.muted,
        });

        slide.addShape("rect" as PptxShapeType, {
            x: SLIDE.padX,
            y: 3.82,
            w: 2.5,
            h: 0.12,
            fill: { color: THEME.accent },
            line: { color: THEME.accent },
        });
    }

    // ── Agenda slide ─────────────────────────────────────────────────────
    {
        const slide = nextSlide(options.timeframeLabel);
        addHeader(slide, "Agenda", options.timeframeLabel);

        const items = buildAgendaLines(sections);
        slide.addShape("roundRect" as PptxShapeType, {
            x: SLIDE.padX,
            y: 1.55,
            w: 12.1,
            h: 5.25,
            fill: { color: THEME.surface },
            line: { color: THEME.border },
        });

        slide.addText(items.join("\n"), {
            x: SLIDE.padX + 0.4,
            y: 1.85,
            w: 11.4,
            h: 4.8,
            fontFace: "Calibri",
            fontSize: 18,
            color: THEME.text,
            valign: "top",
            lineSpacingMultiple: 1.15,
        });
    }

    // ── KPI summary slide ─────────────────────────────────────────────────
    {
        const slide = nextSlide(options.timeframeLabel);
        addHeader(slide, "Key KPIs", options.timeframeLabel);

        const kpis = exportData.kpis;
        const currency = "USD";

        addKpiTile(slide, 0.6, 1.5, "Total Committed", fmtCurrency(kpis.financial.totalCommitted, currency));
        addKpiTile(slide, 6.85, 1.5, "Total Paid", fmtCurrency(kpis.financial.totalPaid, currency));

        addKpiTile(slide, 0.6, 2.75, "Total Unpaid", fmtCurrency(kpis.financial.totalUnpaid, currency));
        addKpiTile(slide, 6.85, 2.75, "Retention Held", fmtCurrency(kpis.financial.retentionHeld, currency));

        addKpiTile(slide, 0.6, 4.0, "Physical Progress", fmtPercent(kpis.progress.physicalProgress));
        addKpiTile(slide, 6.85, 4.0, "On-Time Delivery", fmtPercent(kpis.logistics.onTimeRate));
    }

    // ── Weekly Summary slide (dense dashboard-style) ─────────────────────
    {
        const slide = nextSlide(options.timeframeLabel);
        addHeader(slide, "Weekly Summary", options.timeframeLabel);

        // Meta strip
        slide.addShape("roundRect" as PptxShapeType, {
            x: SLIDE.padX,
            y: 1.15,
            w: 12.1,
            h: 0.55,
            fill: { color: THEME.surface },
            line: { color: THEME.border },
        });

        const scopeLabel = options.projectId ? `Scope: ${options.projectId}` : "Scope: All Projects";
        const generatedLabel = `Generated: ${safeIso(new Date())}`;
        slide.addText(scopeLabel, {
            x: SLIDE.padX + 0.25,
            y: 1.28,
            w: 8.2,
            h: 0.3,
            fontFace: "Calibri",
            fontSize: 12,
            bold: true,
            color: THEME.text,
        });
        slide.addText(generatedLabel, {
            x: SLIDE.padX + 8.6,
            y: 1.28,
            w: 3.25,
            h: 0.3,
            fontFace: "Calibri",
            fontSize: 11,
            align: "right",
            color: THEME.muted,
        });

        // Panel layout (2 columns)
        const leftX = SLIDE.padX;
        const rightX = SLIDE.padX + 6.25;
        const colW = 5.95;

        // Lookahead / Milestones
        addPanel(slide, leftX, 1.85, colW, 2.15, "Lookahead & Upcoming Milestones");
        const milestoneRows = (exportData.milestones || []).slice(0, 6).map((m) => [
            String(m.milestoneName ?? "—").slice(0, 38),
            String(m.expectedDate ?? "—"),
            String(m.status ?? "—"),
        ]);
        const lookaheadTable = buildStyledTable(
            ["Milestone", "Due", "Status"],
            milestoneRows.length ? milestoneRows : [["—", "—", "—"]],
        );
        slide.addTable(lookaheadTable, {
            x: leftX + 0.15,
            y: 2.28,
            w: colW - 0.3,
            h: 1.62,
            fontFace: "Calibri",
            fontSize: 9,
            border: { type: "solid", color: THEME.border, pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.28,
            colW: [3.8, 1.0, 1.0],
        });

        // Critical actions
        addPanel(slide, rightX, 1.85, colW, 2.15, "Critical Actions");
        const k = exportData.kpis;
        const actions = [
            k.logistics.delayedShipments > 0 ? `Follow up ${k.logistics.delayedShipments} delayed shipment(s)` : "No delayed shipments flagged",
            k.financial.totalPending > 0 ? `Review ${fmtCurrency(k.financial.totalPending)} pending invoice exposure` : "No pending invoice exposure flagged",
            k.quality.openNCRs > 0 ? `Close ${k.quality.openNCRs} open NCR(s)` : "No open NCRs flagged",
        ];
        slide.addText(actions.map((a) => `• ${a}`).join("\n"), {
            x: rightX + 0.25,
            y: 2.32,
            w: colW - 0.5,
            h: 1.6,
            fontFace: "Calibri",
            fontSize: 12,
            color: THEME.text,
            valign: "top",
            lineSpacingMultiple: 1.1,
        });

        // Progress panel (mini chart)
        addPanel(slide, leftX, 4.15, colW, 1.55, "Overall Progress");
        const last = exportData.sCurve[exportData.sCurve.length - 1];
        const progressLabels = ["Planned", "Actual"];
        const progressVals = [Number(last?.plannedCumulative ?? 0), Number(last?.actualCumulative ?? 0)];
        const progressChart = [{ name: "Progress", labels: progressLabels, values: progressVals }] satisfies PptxChartData;
        slide.addChart(pptx.ChartType.bar, progressChart, {
            x: leftX + 0.2,
            y: 4.55,
            w: colW - 0.4,
            h: 1.05,
            showLegend: false,
        });

        // Productivity vs Plan (proxy metrics)
        addPanel(slide, rightX, 4.15, colW, 1.55, "Performance vs Targets");
        const perfRows: string[][] = [
            ["On-time", "95%", fmtPercent(k.logistics.onTimeRate)],
            ["NCR Rate", "2.0%", fmtPercent(k.quality.ncrRate)],
            ["Fin Progress", "—", fmtPercent(k.progress.financialProgress)],
        ];
        const perfTable = buildStyledTable(["Metric", "Target", "Actual"], perfRows);
        slide.addTable(perfTable, {
            x: rightX + 0.15,
            y: 4.55,
            w: colW - 0.3,
            h: 1.05,
            fontFace: "Calibri",
            fontSize: 10,
            border: { type: "solid", color: THEME.border, pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.3,
            colW: [2.6, 1.5, 1.7],
        });

        // Quality + Logistics (bottom)
        addPanel(slide, leftX, 5.85, colW, 1.45, "Inspection & Quality");
        const qualityTable = buildStyledTable(
            ["KPI", "Value"],
            [
                ["Total NCRs", fmtNumber(k.quality.totalNCRs)],
                ["Open NCRs", fmtNumber(k.quality.openNCRs)],
                ["Critical NCRs", fmtNumber(k.quality.criticalNCRs)],
            ],
        );
        slide.addTable(qualityTable, {
            x: leftX + 0.15,
            y: 6.22,
            w: colW - 0.3,
            h: 0.95,
            fontFace: "Calibri",
            fontSize: 10,
            border: { type: "solid", color: THEME.border, pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.28,
            colW: [3.6, 2.0],
        });

        addPanel(slide, rightX, 5.85, colW, 1.45, "Material & Logistics Status");
        const logisticsTable = buildStyledTable(
            ["KPI", "Value"],
            [
                ["Total Shipments", fmtNumber(k.logistics.totalShipments)],
                ["In Transit", fmtNumber(k.logistics.inTransit)],
                ["Delayed", fmtNumber(k.logistics.delayedShipments)],
            ],
        );
        slide.addTable(logisticsTable, {
            x: rightX + 0.15,
            y: 6.22,
            w: colW - 0.3,
            h: 0.95,
            fontFace: "Calibri",
            fontSize: 10,
            border: { type: "solid", color: THEME.border, pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.28,
            colW: [3.6, 2.0],
        });

        // Conclusion overlay (subtle)
        slide.addShape("roundRect" as PptxShapeType, {
            x: SLIDE.padX,
            y: 7.05,
            w: 12.1,
            h: 0.0,
            fill: { color: THEME.bg },
            line: { color: THEME.bg },
        });

        // Add conclusion as speaker-notes style (keeps slide clean but available)
        slide.addNotes(buildWeeklyConclusion(k).join("\n"));
    }

    // ── Charts slide(s) ───────────────────────────────────────────────────
    if (includeCharts && sections.includes("charts")) {
        // S-curve
        {
            const slide = nextSlide(options.timeframeLabel);
            addHeader(slide, "S-Curve", options.timeframeLabel);

            const labels = exportData.sCurve.map((p) => formatCategoryLabel(p.month));
            const plannedRaw = exportData.sCurve.map((p) => Number(p.plannedCumulative ?? 0));
            const actualRaw = exportData.sCurve.map((p) => Number(p.actualCumulative ?? 0));

            const maxVal = Math.max(0, ...plannedRaw, ...actualRaw);
            const scaleToPct = looksLikePercent01(maxVal);
            const planned = scaleToPct ? plannedRaw.map((v) => v * 100) : plannedRaw;
            const actual = scaleToPct ? actualRaw.map((v) => v * 100) : actualRaw;

            if (!hasAnyNonZero(planned) && !hasAnyNonZero(actual)) {
                addEmptyChartState(slide, "No S-curve data for this timeframe", [
                    `S-curve points: ${exportData.sCurve.length}`,
                    `Milestones: ${(exportData.milestones || []).length}`,
                    `Shipments: ${fmtNumber(exportData.kpis.logistics.totalShipments)}`,
                ]);
            } else {
                const chartData = [
                    { name: "Planned", labels, values: planned },
                    { name: "Actual", labels, values: actual },
                ] satisfies PptxChartData;

                const chartOpts: PptxChartOpts = {
                    x: 0.6,
                    y: 1.35,
                    w: 12.1,
                    h: 5.7,
                    showLegend: true,
                    legendPos: "t",
                };

                slide.addChart(pptx.ChartType.line, chartData, chartOpts);
            }
        }

        // Change order breakdown
        {
            const slide = nextSlide(options.timeframeLabel);
            addHeader(slide, "Change Order Breakdown", options.timeframeLabel);

            const co = exportData.coBreakdown;
            const labels = ["Scope", "Rate", "Quantity", "Schedule"];
            const values = [co.scope, co.rate, co.quantity, co.schedule];

            const total = Number(co.total ?? 0);
            const hasData = total > 0 || hasAnyNonZero(values.map((v) => Number(v ?? 0)));
            if (!hasData) {
                addEmptyChartState(slide, "No approved change orders in this timeframe", [
                    `Approved CO total: ${fmtNumber(total)}`,
                    `Committed: ${fmtCurrency(exportData.kpis.financial.totalCommitted)}`,
                    `Unpaid: ${fmtCurrency(exportData.kpis.financial.totalUnpaid)}`,
                ]);

                // Keep the explanatory text on the right so the slide isn't empty.
                slide.addText("Total: 0", {
                    x: 7.0,
                    y: 2.2,
                    w: 5.7,
                    h: 0.5,
                    fontFace: "Calibri",
                    fontSize: 18,
                    bold: true,
                    color: THEME.text,
                });

                slide.addText(
                    "Breakdown of approved change order value by category.",
                    {
                        x: 7.0,
                        y: 2.75,
                        w: 5.7,
                        h: 1.0,
                        fontFace: "Calibri",
                        fontSize: 12,
                        color: THEME.muted,
                    },
                );
            } else {
                const chartData = [{ name: "CO", labels, values }] satisfies PptxChartData;

                const chartOpts: PptxChartOpts = {
                    x: 0.6,
                    y: 1.35,
                    w: 6.1,
                    h: 5.7,
                    showLegend: true,
                    legendPos: "r",
                    dataLabelPosition: "bestFit",
                };

                slide.addChart(pptx.ChartType.pie, chartData, chartOpts);

                slide.addText(`Total: ${fmtNumber(co.total)}`, {
                    x: 7.0,
                    y: 2.2,
                    w: 5.7,
                    h: 0.5,
                    fontFace: "Calibri",
                    fontSize: 18,
                    bold: true,
                    color: THEME.text,
                });

                slide.addText(
                    "Breakdown of approved change order value by category.",
                    {
                        x: 7.0,
                        y: 2.75,
                        w: 5.7,
                        h: 1.0,
                        fontFace: "Calibri",
                        fontSize: 12,
                        color: THEME.muted,
                    },
                );
            }
        }
    }

    // ── Tables ────────────────────────────────────────────────────────────
    if (includeTables && sections.includes("milestones")) {
        const slide = nextSlide(options.timeframeLabel);
        addHeader(slide, "Milestones", options.timeframeLabel);

        const header = ["PO", "Supplier", "Milestone", "Due", "%", "Status"];
        const rows = (exportData.milestones || []).slice(0, 14).map((m) => [
            String(m.poNumber ?? "—"),
            String(m.supplierName ?? "—"),
            String(m.milestoneName ?? "—"),
            String(m.expectedDate ?? "—"),
            `${Number(m.progressPercent ?? 0).toFixed(0)}%`,
            String(m.status ?? "—"),
        ]);

        const tableData = buildStyledTable(header, rows);

        const tableOpts: PptxTableOpts = {
            x: 0.6,
            y: 1.35,
            w: 12.1,
            h: 5.7,
            fontFace: "Calibri",
            fontSize: 10,
            border: { type: "solid", color: "E2E8F0", pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.33,
            colW: [1.1, 1.8, 5.0, 1.0, 0.6, 1.4],
        };

        slide.addTable(tableData, tableOpts);
    }

    if (includeTables && sections.includes("suppliers")) {
        const slide = nextSlide(options.timeframeLabel);
        addHeader(slide, "Supplier Progress", options.timeframeLabel);

        const header = ["Supplier", "Physical", "Financial", "POs", "Unpaid"];
        const rows = (exportData.supplierProgress || []).slice(0, 18).map((s) => [
            String(s.supplierName ?? "—"),
            `${Number(s.physicalProgress ?? 0).toFixed(1)}%`,
            `${Number(s.financialProgress ?? 0).toFixed(1)}%`,
            fmtNumber(s.poCount),
            fmtCurrency(s.unpaidAmount),
        ]);

        const tableData = buildStyledTable(header, rows);
        const tableOpts: PptxTableOpts = {
            x: 0.6,
            y: 1.35,
            w: 12.1,
            h: 5.7,
            fontFace: "Calibri",
            fontSize: 10,
            border: { type: "solid", color: "E2E8F0", pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.33,
            colW: [5.2, 1.5, 1.5, 1.0, 2.0],
        };

        slide.addTable(tableData, tableOpts);
    }

    const out = (await (pptx as unknown as { write: (props: unknown) => Promise<unknown> }).write({ outputType: "nodebuffer" })) as unknown;
    const buffer = Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
    return buffer;
}
