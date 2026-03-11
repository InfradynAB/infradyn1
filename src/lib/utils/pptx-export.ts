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
    organizationName?: string;
    exporterName?: string;
    projectId?: string;
    supplierId?: string;
    sections?: string[];
    includeTables?: boolean;
    includeCharts?: boolean;
    logoImage?: string;
    coverImage?: string;
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

function addLeafDecoration(
    slide: PptxSlide,
    placement: "bottom-left" | "top-right",
    scale = 1,
) {
    const leafColor = "1D4B43";

    if (placement === "top-right") {
        slide.addShape("chord" as PptxShapeType, {
            x: 12.0,
            y: -0.3,
            w: 1.5 * scale,
            h: 1.5 * scale,
            fill: { color: leafColor },
            line: { color: leafColor },
            rotate: 225,
        });
        slide.addShape("ellipse" as PptxShapeType, {
            x: 12.5,
            y: -0.8,
            w: 0.8 * scale,
            h: 1.2 * scale,
            fill: { color: leafColor },
            line: { color: leafColor },
            rotate: 195,
        });
        slide.addShape("ellipse" as PptxShapeType, {
            x: 12.8,
            y: -0.3,
            w: 1.2 * scale,
            h: 0.8 * scale,
            fill: { color: leafColor },
            line: { color: leafColor },
            rotate: 165,
        });
        slide.addShape("ellipse" as PptxShapeType, {
            x: 13.0,
            y: 0.2,
            w: 1.2 * scale,
            h: 0.8 * scale,
            fill: { color: leafColor },
            line: { color: leafColor },
            rotate: 225,
        });
        return;
    }

    slide.addShape("chord" as PptxShapeType, {
        x: -0.1,
        y: 6.2,
        w: 1.5 * scale,
        h: 1.5 * scale,
        fill: { color: leafColor },
        line: { color: leafColor },
        rotate: 45,
    });
    slide.addShape("ellipse" as PptxShapeType, {
        x: 0.3,
        y: 5.8,
        w: 0.8 * scale,
        h: 1.2 * scale,
        fill: { color: leafColor },
        line: { color: leafColor },
        rotate: 15,
    });
    slide.addShape("ellipse" as PptxShapeType, {
        x: 0.5,
        y: 6.2,
        w: 1.2 * scale,
        h: 0.8 * scale,
        fill: { color: leafColor },
        line: { color: leafColor },
        rotate: -15,
    });
    slide.addShape("ellipse" as PptxShapeType, {
        x: 0.7,
        y: 6.6,
        w: 1.2 * scale,
        h: 0.8 * scale,
        fill: { color: leafColor },
        line: { color: leafColor },
        rotate: 45,
    });
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

function normalizeOrgName(name?: string): string {
    const trimmed = (name || "").trim();
    return trimmed.length > 0 ? trimmed : "ORGANIZATION";
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
    const nextSlide = (footerRight?: string, isTitleSlide?: boolean) => {
        slideNo += 1;
        const slide = pptx.addSlide();
        slide.background = { color: THEME.bg };
        if (!isTitleSlide) {
            addChrome(slide, slideNo, footerRight);
        }
        return slide;
    };

    const sections = normalizeSections(options.sections, options.source);
    const includeTables = options.includeTables !== false;
    const includeCharts = options.includeCharts !== false;

    // ── Title slide ────────────────────────────────────────────────────────
    {
        const slide = nextSlide(options.timeframeLabel, true);
        slide.background = { color: "F3F4F6" };
        const organizationName = normalizeOrgName(options.organizationName);

        // Right side large cover image or placeholder
        if (options.coverImage) {
            slide.addImage({ x: 8.0, y: 0, w: 5.333, h: 7.5, path: options.coverImage, sizing: { type: "cover", w: 5.333, h: 7.5 } });
        } else {
            slide.addShape("rect" as PptxShapeType, {
                x: 8.0, y: 0, w: 5.333, h: 7.5,
                fill: { color: "E2E8F0" },
            });
            slide.addText("COVER IMAGE (5.33 x 7.5)", {
                x: 8.0, y: 3.5, w: 5.333, h: 0.5,
                fontFace: "Calibri", fontSize: 14, color: "94A3B8", align: "center"
            });
        }

        // Organization name — plain text, no background box
        slide.addText(organizationName, {
            x: 0.5,
            y: 0.5,
            w: 7.0,
            h: 0.55,
            fontFace: "Calibri",
            fontSize: 20,
            bold: true,
            color: THEME.accent,
            fit: "shrink",
        });

        const titleText = "Material\nTracking\nAnalytics";
        slide.addText(titleText, {
            x: 0.5,
            y: 2.5,
            w: 7.0,
            h: 3.0,
            fontFace: "Calibri",
            fontSize: 60,
            color: "25697B",
            valign: "top",
            lineSpacingMultiple: 0.9,
        });

        // Presenter info or subtitle
        const subtitleParts = [
            options.source.toUpperCase(),
            options.reportType?.toUpperCase() ?? "DETAILED",
            options.audience ? `Audience: ${options.audience}` : null,
            options.projectId ? `Project: ${options.projectId}` : null,
            options.timeframeLabel,
        ].filter(Boolean);

        const presenterName = (options.exporterName || "").trim() || "Unknown";
        const subText = `BY ${presenterName.toUpperCase()}\n\n${subtitleParts.join("  •  ")}`;

        slide.addText(subText, {
            x: 0.5,
            y: 5.6,
            w: 7.0,
            h: 1.0,
            fontFace: "Calibri",
            fontSize: 14,
            color: "333333",
            bold: true,
            valign: "top",
            lineSpacingMultiple: 1.5
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

        // Program Snapshot — visual-first executive layout
        {
            const slide = nextSlide(options.timeframeLabel);
            addHeader(slide, "Program Snapshot", options.timeframeLabel);

            const k = exportData.kpis;

            // ── Colour helpers ────────────────────────────────────────────
            const GREEN  = "16A34A";
            const AMBER  = "D97706";
            const RED    = "DC2626";
            const GREY   = "94A3B8";
            const TEAL   = THEME.accent; // "0E7490"

            function statusColor(value: number, goodThreshold: number, warnThreshold: number): string {
                if (value >= goodThreshold) return GREEN;
                if (value >= warnThreshold) return AMBER;
                return RED;
            }

            // ── Layout constants ──────────────────────────────────────────
            // 4 equal KPI columns across the full width
            const colW    = 2.95;
            const colGap  = 0.12;
            const colY    = 1.2;
            const colH    = 3.1;
            const cols    = [0.6, 0.6 + colW + colGap, 0.6 + (colW + colGap) * 2, 0.6 + (colW + colGap) * 3];

            // ── Derived values ─────────────────────────────────────────────
            const totalCommitted  = Math.max(Number(k.financial.totalCommitted || 0), 1);
            const totalPaid       = Number(k.financial.totalPaid || 0);
            const totalPending    = Number(k.financial.totalPending || 0);
            const paidPct         = Math.min(100, (totalPaid / totalCommitted) * 100);
            const pendingPct      = Math.min(100 - paidPct, (totalPending / totalCommitted) * 100);
            const remainingPct    = Math.max(0, 100 - paidPct - pendingPct);

            const onTimeRate      = Number(k.logistics.onTimeRate || 0);
            const delayedRate     = Math.max(0, 100 - onTimeRate);

            const totalNCRs       = Number(k.quality.totalNCRs || 0);
            const openNCRs        = Number(k.quality.openNCRs || 0);
            const criticalNCRs    = Number(k.quality.criticalNCRs || 0);
            const resolvedNCRs    = Math.max(0, totalNCRs - openNCRs);

            const milestonesTotal     = Math.max(Number(k.progress.milestonesTotal || 0), 1);
            const milestonesCompleted = Number(k.progress.milestonesCompleted || 0);
            const milestonesPct       = Math.min(100, (milestonesCompleted / milestonesTotal) * 100);

            // ── Helper: draw one visual KPI card ──────────────────────────
            function addVisualKpiCard(
                cx: number,
                cy: number,
                cw: number,
                ch: number,
                title: string,
                bigLabel: string,
                subLabel: string,
                accentColor: string,
                chartSegments: { value: number; color: string }[],
            ) {
                // Card background
                slide.addShape("roundRect" as PptxShapeType, {
                    x: cx, y: cy, w: cw, h: ch,
                    fill: { color: THEME.bg },
                    line: { color: THEME.border, pt: 1 },
                });

                // Top colour bar
                slide.addShape("rect" as PptxShapeType, {
                    x: cx, y: cy, w: cw, h: 0.07,
                    fill: { color: accentColor },
                    line: { color: accentColor },
                });

                // Title
                slide.addText(title.toUpperCase(), {
                    x: cx + 0.18, y: cy + 0.15, w: cw - 0.36, h: 0.3,
                    fontFace: "Calibri", fontSize: 9, bold: true,
                    color: THEME.muted2, charSpacing: 1,
                });

                // Donut chart — centred in card
                const chartSize = 1.55;
                const chartX = cx + (cw - chartSize) / 2;
                const chartY = cy + 0.5;
                const chartData: PptxChartData = [{
                    name: title,
                    labels: chartSegments.map((_, i) => String(i)),
                    values: chartSegments.map((s) => s.value),
                }];
                slide.addChart("doughnut" as Parameters<PptxSlide["addChart"]>[0], chartData, {
                    x: chartX, y: chartY, w: chartSize, h: chartSize,
                    dataLabelFontSize: 0,
                    showLegend: false,
                    showLabel: false,
                    showValue: false,
                    showPercent: false,
                    chartColors: chartSegments.map((s) => s.color),
                    holeSize: 65,
                } as PptxChartOpts);

                // Big value label centred inside donut hole
                slide.addText(bigLabel, {
                    x: chartX, y: chartY + chartSize * 0.3, w: chartSize, h: chartSize * 0.4,
                    fontFace: "Calibri", fontSize: bigLabel.length > 6 ? 13 : 16,
                    bold: true, align: "center", color: accentColor,
                });

                // Sub-label below the chart
                slide.addText(subLabel, {
                    x: cx + 0.1, y: cy + ch - 0.42, w: cw - 0.2, h: 0.35,
                    fontFace: "Calibri", fontSize: 10,
                    align: "center", color: THEME.muted,
                });
            }

            // ── KPI 1: Financial Exposure ─────────────────────────────────
            const finColor = statusColor(paidPct, 60, 30);
            addVisualKpiCard(
                cols[0], colY, colW, colH,
                "Financial",
                fmtCurrency(totalPaid),
                `${paidPct.toFixed(0)}% paid of ${fmtCurrency(totalCommitted)}`,
                finColor,
                [
                    { value: Math.max(paidPct, 0.1),    color: GREEN },
                    { value: Math.max(pendingPct, 0.1), color: AMBER },
                    { value: Math.max(remainingPct, 0.1), color: THEME.border },
                ],
            );

            // ── KPI 2: On-Time Delivery ───────────────────────────────────
            const otdColor = statusColor(onTimeRate, 80, 50);
            addVisualKpiCard(
                cols[1], colY, colW, colH,
                "On-Time Delivery",
                `${onTimeRate.toFixed(0)}%`,
                `${fmtNumber(k.logistics.totalShipments)} shipments · ${fmtNumber(k.logistics.delayedShipments)} delayed`,
                otdColor,
                [
                    { value: Math.max(onTimeRate, 0.1),  color: otdColor },
                    { value: Math.max(delayedRate, 0.1), color: THEME.border },
                ],
            );

            // ── KPI 3: Quality / NCRs ─────────────────────────────────────
            const ncrColor = openNCRs === 0 ? GREEN : criticalNCRs > 0 ? RED : AMBER;
            const ncrResolved = Math.max(resolvedNCRs, 0.1);
            addVisualKpiCard(
                cols[2], colY, colW, colH,
                "Quality",
                `${fmtNumber(openNCRs)} NCRs`,
                `${fmtNumber(criticalNCRs)} critical · ${fmtNumber(resolvedNCRs)} resolved`,
                ncrColor,
                totalNCRs === 0
                    ? [{ value: 1, color: GREEN }]
                    : [
                        { value: ncrResolved,                            color: GREEN },
                        { value: Math.max(openNCRs - criticalNCRs, 0.1), color: AMBER },
                        { value: Math.max(criticalNCRs, 0.1),            color: RED },
                      ],
            );

            // ── KPI 4: Milestone Progress ─────────────────────────────────
            const msColor = statusColor(milestonesPct, 70, 30);
            addVisualKpiCard(
                cols[3], colY, colW, colH,
                "Milestones",
                `${fmtNumber(milestonesCompleted)}/${fmtNumber(milestonesTotal)}`,
                `${milestonesPct.toFixed(0)}% complete`,
                msColor,
                [
                    { value: Math.max(milestonesPct, 0.1),       color: msColor },
                    { value: Math.max(100 - milestonesPct, 0.1), color: THEME.border },
                ],
            );

            // ── Milestone swim-lane tracker ───────────────────────────────
            const swimY       = colY + colH + 0.18;
            const swimH       = SLIDE.h - swimY - SLIDE.footerH - 0.15;
            const swimX       = 0.6;
            const swimW       = SLIDE.w - swimX - 0.6;

            // Section label
            slide.addText("MILESTONE TRACKER", {
                x: swimX, y: swimY, w: swimW, h: 0.22,
                fontFace: "Calibri", fontSize: 8, bold: true,
                color: THEME.muted2, charSpacing: 1,
            });

            const upcomingMilestones = [...(exportData.milestones || [])]
                .sort((a, b) => {
                    const da = a.expectedDate ? new Date(a.expectedDate).getTime() : Infinity;
                    const db = b.expectedDate ? new Date(b.expectedDate).getTime() : Infinity;
                    return da - db;
                })
                .slice(0, 5);

            const laneH        = upcomingMilestones.length > 0 ? Math.min((swimH - 0.25) / upcomingMilestones.length, 0.55) : 0.55;
            const barTrackX    = swimX + 3.2;
            const barTrackW    = swimW - 3.2 - 1.6;
            const statusColX   = barTrackX + barTrackW + 0.15;

            if (upcomingMilestones.length === 0) {
                slide.addText("No milestones in current scope", {
                    x: swimX, y: swimY + 0.3, w: swimW, h: 0.4,
                    fontFace: "Calibri", fontSize: 12,
                    align: "center", color: THEME.muted,
                });
            } else {
                upcomingMilestones.forEach((m, i) => {
                    const rowY   = swimY + 0.28 + i * laneH;
                    const pct    = Math.min(100, Math.max(0, Number(m.progressPercent ?? 0)));
                    const status = String(m.status ?? "PENDING").toUpperCase();

                    const barColor =
                        status === "COMPLETE"     ? GREEN :
                        status === "IN_PROGRESS"  ? TEAL  :
                        status === "OVERDUE"      ? RED   :
                        status === "AT_RISK"      ? AMBER :
                        GREY;

                    // Row background (alternating)
                    slide.addShape("rect" as PptxShapeType, {
                        x: swimX - 0.05, y: rowY - 0.04, w: swimW + 0.1, h: laneH - 0.06,
                        fill: { color: i % 2 === 0 ? THEME.bg : THEME.surface },
                        line: { color: THEME.border, pt: 0.5 },
                    });

                    // Milestone name
                    slide.addText(String(m.milestoneName ?? "—").slice(0, 30), {
                        x: swimX, y: rowY, w: 3.0, h: laneH - 0.12,
                        fontFace: "Calibri", fontSize: 10,
                        color: THEME.text, valign: "middle",
                    });

                    // Progress bar track (background)
                    slide.addShape("roundRect" as PptxShapeType, {
                        x: barTrackX, y: rowY + (laneH - 0.12) / 2 - 0.04,
                        w: barTrackW, h: 0.18,
                        fill: { color: THEME.surface2 },
                        line: { color: THEME.border, pt: 0.5 },
                    });

                    // Progress bar fill
                    if (pct > 0) {
                        slide.addShape("roundRect" as PptxShapeType, {
                            x: barTrackX, y: rowY + (laneH - 0.12) / 2 - 0.04,
                            w: Math.max(barTrackW * (pct / 100), 0.08), h: 0.18,
                            fill: { color: barColor },
                            line: { color: barColor },
                        });
                    }

                    // Pct label on bar
                    slide.addText(`${pct.toFixed(0)}%`, {
                        x: barTrackX + barTrackW + 0.07, y: rowY, w: 0.45, h: laneH - 0.12,
                        fontFace: "Calibri", fontSize: 9, bold: true,
                        color: barColor, valign: "middle",
                    });

                    // Status pill
                    slide.addShape("roundRect" as PptxShapeType, {
                        x: statusColX + 0.5, y: rowY + (laneH - 0.12) / 2 - 0.04,
                        w: 1.0, h: 0.18,
                        fill: { color: barColor + "22" }, // semi-transparent tint
                        line: { color: barColor, pt: 0.75 },
                    });
                    slide.addText(status.replace("_", " "), {
                        x: statusColX + 0.5, y: rowY + (laneH - 0.12) / 2 - 0.04,
                        w: 1.0, h: 0.18,
                        fontFace: "Calibri", fontSize: 7.5, bold: true,
                        align: "center", valign: "middle",
                        color: barColor,
                    });

                    // Due date
                    const dueStr = m.expectedDate
                        ? new Date(m.expectedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                        : "—";
                    slide.addText(dueStr, {
                        x: statusColX + 0.5, y: rowY + laneH * 0.55, w: 1.0, h: 0.22,
                        fontFace: "Calibri", fontSize: 7.5,
                        align: "center", color: THEME.muted,
                    });
                });
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

    // ── End slide ────────────────────────────────────────────────────────
    {
        const slide = nextSlide(undefined, true);
        slide.background = { color: THEME.surface2 }; // subtle off-white background

        // Top Half Cover Image / Background
        if (options.coverImage) {
            slide.addImage({ x: 0, y: 0, w: 13.333, h: 4.5, path: options.coverImage, sizing: { type: "cover", w: 13.333, h: 4.5 } });
        } else {
            slide.addShape("rect" as PptxShapeType, {
                x: 0, y: 0, w: 13.333, h: 4.5,
                fill: { color: "E2E8F0" },
            });
            slide.addText("COVER IMAGE (13.33 x 4.5)", {
                x: 0, y: 1.75, w: 13.333, h: 0.5,
                fontFace: "Calibri", fontSize: 16, color: "94A3B8", align: "center"
            });
        }

        // Floating Contact Card
        const cardX = 1.5;
        const cardY = 3.8;
        const cardW = 10.333;
        const cardH = 3.0;

        slide.addShape("rect" as PptxShapeType, {
            x: cardX,
            y: cardY,
            w: cardW,
            h: cardH,
            fill: { color: "FFFFFF" },
            line: { color: "E2E8F0", pt: 1 },
        });

        // Contact Headers
        slide.addText("Get in touch with us today!", {
            x: cardX + 0.4,
            y: cardY + 0.5,
            w: 8.0,
            h: 0.8,
            fontFace: "Georgia", // slightly serif-like to match the reference text style closely
            fontSize: 32,
            color: "1F3B4D",
        });
        if (options.logoImage) {
            slide.addImage({
                x: cardX + 7.95,
                y: cardY + 0.48,
                w: 2.0,
                h: 0.8,
                path: options.logoImage,
                sizing: { type: "contain", w: 2.0, h: 0.8 },
            });
        }

        // Horizontal Rule inside the card
        slide.addShape("rect" as PptxShapeType, {
            x: cardX + 0.4,
            y: cardY + 1.5,
            w: cardW - 0.8,
            h: 0.02,
            fill: { color: "E2E8F0" },
            line: { color: "E2E8F0" },
        });

        // Contact Info Labels
        slide.addText("EMAIL", {
            x: cardX + 0.4,
            y: cardY + 1.7,
            w: 4.0,
            h: 0.3,
            fontFace: "Calibri",
            fontSize: 10,
            bold: true,
            color: "64748B",
        });

        slide.addText("PHONE", {
            x: cardX + 6.0,
            y: cardY + 1.7,
            w: 4.0,
            h: 0.3,
            fontFace: "Calibri",
            fontSize: 10,
            bold: true,
            color: "64748B",
        });

        // Contact Info Values
        slide.addText("partners@infradyn.com", {
            x: cardX + 0.4,
            y: cardY + 2.0,
            w: 4.0,
            h: 0.5,
            fontFace: "Calibri",
            fontSize: 14,
            color: "334155",
        });

        slide.addText("+46 73 151 10 66", {
            x: cardX + 6.0,
            y: cardY + 2.0,
            w: 4.0,
            h: 0.5,
            fontFace: "Calibri",
            fontSize: 14,
            color: "334155",
        });

        // Keep leaf motif on last slide only (middle slides have no leaves).
        addLeafDecoration(slide, "top-right", 1.1);
    }

    const out = (await (pptx as unknown as { write: (props: unknown) => Promise<unknown> }).write({ outputType: "nodebuffer" })) as unknown;
    const buffer = Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
    return buffer;
}
