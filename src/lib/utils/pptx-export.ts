import PptxGenJS from "pptxgenjs";
import type { DashboardExportData } from "@/lib/utils/excel-export";

type PptxSource = "executive" | "pm" | "supplier";

type PptxInstance = InstanceType<typeof PptxGenJS>;
type PptxSlide = ReturnType<PptxInstance["addSlide"]>;
type PptxChartData = Parameters<PptxSlide["addChart"]>[1];
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
        activities: "Activities and Progress",
        cost_commitments: "Cost & Commitments Status",
        progress_analysis: "Project Progress Analysis",
        exec_summary: "Executive Summary Cost & Schedule",
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

function addSectionDivider(slide: PptxSlide, y: number, label: string) {
    const lineW = 4.5;
    const midX = SLIDE.w / 2;
    const dotX = midX - lineW / 2 - 0.18;
    const dotX2 = midX + lineW / 2 + 0.05;

    slide.addShape("line" as PptxShapeType, {
        x: midX - lineW / 2,
        y: y + 0.08,
        w: lineW,
        h: 0,
        line: { color: THEME.border, pt: 1 },
    });
    slide.addShape("ellipse" as PptxShapeType, {
        x: dotX,
        y: y + 0.03,
        w: 0.12,
        h: 0.12,
        fill: { color: THEME.accent },
        line: { color: THEME.accent },
    });
    slide.addShape("ellipse" as PptxShapeType, {
        x: dotX2,
        y: y + 0.03,
        w: 0.12,
        h: 0.12,
        fill: { color: THEME.accent },
        line: { color: THEME.accent },
    });
    slide.addText(label, {
        x: midX - 2.5,
        y: y - 0.06,
        w: 5.0,
        h: 0.28,
        fontFace: "Calibri",
        fontSize: 11,
        italic: true,
        align: "center",
        color: THEME.text,
    });
}

function buildExecutiveSummaryBullets(kpis: DashboardExportData["kpis"]): string[] {
    const f = kpis.financial;
    const p = kpis.progress;
    const q = kpis.quality;
    const l = kpis.logistics;

    const bullets: string[] = [];

    const physPct = Number(p.physicalProgress || 0).toFixed(1);
    const finPct = Number(p.financialProgress || 0).toFixed(1);
    bullets.push(`Physical progress is at ${physPct}% vs financial progress at ${finPct}%.`);

    const committed = Number(f.totalCommitted || 0);
    const paid = Number(f.totalPaid || 0);
    const coImpact = Number(f.changeOrderImpact || 0);
    const paidPct = committed > 0 ? ((paid / committed) * 100).toFixed(1) : "0.0";
    bullets.push(`${fmtCurrency(paid)} paid of ${fmtCurrency(committed)} committed (${paidPct}%).${coImpact !== 0 ? ` CO impact: ${coImpact > 0 ? "+" : ""}${fmtCurrency(coImpact)}.` : ""}`);

    const delayed = Number(p.delayedCount || 0);
    const atRisk = Number(p.atRiskCount || 0);
    const onTrack = Number(p.onTrackCount || 0);
    bullets.push(`Milestones: ${onTrack} on track, ${atRisk} at risk, ${delayed} delayed.`);

    if (Number(q.openNCRs || 0) > 0) {
        bullets.push(`${q.openNCRs} open NCR(s) — ${q.criticalNCRs} critical. On-time delivery: ${Number(l.onTimeRate || 0).toFixed(1)}%.`);
    } else {
        bullets.push(`No open NCRs. On-time delivery: ${Number(l.onTimeRate || 0).toFixed(1)}%.`);
    }

    return bullets;
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
        return ["financial", "cost_commitments", "exec_summary", "portfolio", "quality", "suppliers", "logistics", "milestones", "activities", "charts"];
    }

    if (source === "pm") {
        return ["financial", "cost_commitments", "progress_analysis", "deliveries", "materials", "quality", "suppliers", "milestones", "activities", "charts"];
    }

    return ["financial", "performance", "progress_analysis", "deliveries", "quality", "milestones", "activities", "compliance", "charts"];
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

    // ── Activities and Progress slide ──────────────────────────────────────
    if (sections.includes("activities")) {
        const slide = nextSlide(options.timeframeLabel);
        const k = exportData.kpis;
        const delayedCount = Number(k.progress.delayedCount ?? 0);
        const atRiskCount = Number(k.progress.atRiskCount ?? 0);
        const statusColor = delayedCount > 0 ? "DC2626" : atRiskCount > 0 ? "D97706" : "16A34A";
        const statusLabel = delayedCount > 0 ? "Behind" : atRiskCount > 0 ? "Risk" : "On track";

        addHeader(slide, "Activities and Progress", options.timeframeLabel);

        // Status indicator (top right)
        slide.addText("Status:", {
            x: 11.2,
            y: 0.24,
            w: 0.6,
            h: 0.35,
            fontFace: "Calibri",
            fontSize: 11,
            color: THEME.muted2,
        });
        slide.addShape("rect" as PptxShapeType, {
            x: 11.9,
            y: 0.22,
            w: 1.2,
            h: 0.4,
            fill: { color: statusColor },
            line: { color: statusColor },
        });
        slide.addText(statusLabel, {
            x: 11.95,
            y: 0.28,
            w: 1.1,
            h: 0.3,
            fontFace: "Calibri",
            fontSize: 10,
            bold: true,
            align: "center",
            color: "FFFFFF",
        });

        const leftX = SLIDE.padX;
        const rightX = SLIDE.padX + 6.5;
        const colW = 6.0;
        const panelH = 2.4;

        // Left: Progress/Achievements
        addPanel(slide, leftX, 1.35, colW, panelH, "Progress / Achievements");
        const completedMilestones = (exportData.milestones || [])
            .filter((m) => m.status === "COMPLETE" || Number(m.progressPercent ?? 0) >= 100)
            .slice(0, 5);
        const progressRows = completedMilestones.length > 0
            ? completedMilestones.map((m) => [
                String(m.poNumber ?? "—").slice(0, 10),
                String(m.supplierName ?? "—").slice(0, 14),
                String(m.milestoneName ?? "—").slice(0, 20),
                fmtCurrency(m.amount ?? 0),
                String(m.status ?? "—"),
            ])
            : [["No completed milestones in scope", "—", "—", "—", "—"]];
        const progressTable = buildStyledTable(
            ["Project", "Vendor", "Items", "Unit", "Status"],
            progressRows
        );
        slide.addTable(progressTable, {
            x: leftX + 0.15,
            y: 1.88,
            w: colW - 0.3,
            h: panelH - 0.6,
            fontFace: "Calibri",
            fontSize: 8,
            border: { type: "solid", color: THEME.border, pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.24,
            colW: [1.0, 1.4, 2.0, 1.0, 0.9],
        });

        // Left: Key issues/risks
        const issuesY = 3.95;
        addPanel(slide, leftX, issuesY, colW, panelH, "Key issues / potential risks and mitigation actions");
        const conflicts = exportData.conflicts ?? [];
        const openNCRs = exportData.openNCRs ?? [];
        const issuesRows = [...conflicts.slice(0, 3), ...openNCRs.slice(0, 2)].map((item) => {
            const isConflict = "type" in item;
            const issue = isConflict
                ? `${(item as { type: string }).type.replace(/_/g, " ")}: ${((item as { description: string | null }).description ?? "").slice(0, 50)}`
                : (item as { title: string }).title.slice(0, 50);
            const mitigation = isConflict ? "Under review" : "Pending resolution";
            const owner = isConflict ? (item as { assignedTo: string | null }).assignedTo ?? "—" : "—";
            const due = isConflict
                ? (item as { slaDeadline: string | null }).slaDeadline ?? "—"
                : (item as { slaDueAt: string | null }).slaDueAt ?? "—";
            const status = isConflict ? (item as { state: string }).state : (item as { status: string }).status;
            return [issue, mitigation, owner, due, status];
        });
        const issuesTableData = issuesRows.length > 0
            ? buildStyledTable(["Key issue / potential risk", "Mitigation action", "Owner", "Due date", "Status"], issuesRows)
            : buildStyledTable(
                ["Key issue / potential risk", "Mitigation action", "Owner", "Due date", "Status"],
                [["No open issues or risks", "—", "—", "—", "—"]]
            );
        slide.addTable(issuesTableData, {
            x: leftX + 0.15,
            y: issuesY + 0.48,
            w: colW - 0.3,
            h: panelH - 0.6,
            fontFace: "Calibri",
            fontSize: 7,
            border: { type: "solid", color: THEME.border, pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.22,
            colW: [2.2, 1.5, 0.8, 0.9, 0.8],
        });

        // Right: Plan deviations
        addPanel(slide, rightX, 1.35, colW, panelH, "Plan deviations - Activities behind the plan/schedule");
        const now = new Date();
        const fourWeeksFromNow = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
        const delayedMilestones = (exportData.milestones || [])
            .filter((m) => {
                const status = String(m.status ?? "").toUpperCase();
                return (status === "DELAYED" || status === "AT_RISK") && m.expectedDate;
            })
            .slice(0, 3);
        const deviationRows = delayedMilestones.length > 0
            ? delayedMilestones.map((m) => [
                String(m.milestoneName ?? "—").slice(0, 45),
                m.expectedDate ?? "—",
                m.expectedDate ?? "—",
                "Yes",
                "Coordinate with supplier",
                String(m.supplierName ?? "—").slice(0, 10),
                m.expectedDate ?? "—",
            ])
            : [["No activities behind schedule", "—", "—", "—", "—", "—", "—"]];
        const deviationTable = buildStyledTable(
            ["Activity behind schedule", "Plan date", "Forecast date", "Impact?", "Mitigating action", "Who", "When"],
            deviationRows
        );
        slide.addTable(deviationTable, {
            x: rightX + 0.15,
            y: 1.88,
            w: colW - 0.3,
            h: panelH - 0.6,
            fontFace: "Calibri",
            fontSize: 7,
            border: { type: "solid", color: THEME.border, pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.22,
            colW: [2.2, 0.9, 0.9, 0.5, 1.2, 0.8, 0.7],
        });

        // Right: 4 weeks look ahead
        addPanel(slide, rightX, issuesY, colW, panelH, "4 weeks look ahead - main activities");
        const lookAheadMilestones = (exportData.milestones || [])
            .filter((m) => {
                if (!m.expectedDate) return false;
                const d = new Date(m.expectedDate);
                return d >= now && d <= fourWeeksFromNow;
            })
            .sort((a, b) => new Date(a.expectedDate!).getTime() - new Date(b.expectedDate!).getTime())
            .slice(0, 5);
        const lookAheadRows = lookAheadMilestones.length > 0
            ? lookAheadMilestones.map((m) => [
                String(m.milestoneName ?? "—").slice(0, 28),
                fmtCurrency(m.amount ?? 0),
                fmtCurrency(m.amount ?? 0),
                m.expectedDate ?? "—",
                String(m.status ?? "—"),
            ])
            : [["No activities in next 4 weeks", "—", "—", "—", "—"]];
        const lookAheadTable = buildStyledTable(
            ["Area | Activity", "Unit", "Total", "Date", "Status"],
            lookAheadRows
        );
        slide.addTable(lookAheadTable, {
            x: rightX + 0.15,
            y: issuesY + 0.48,
            w: colW - 0.3,
            h: panelH - 0.6,
            fontFace: "Calibri",
            fontSize: 8,
            border: { type: "solid", color: THEME.border, pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.24,
            colW: [2.6, 1.0, 1.0, 0.9, 0.8],
        });

        // Legend (bottom)
        const legendY = SLIDE.h - SLIDE.footerH - 0.55;
        slide.addShape("rect" as PptxShapeType, {
            x: 9.2,
            y: legendY,
            w: 0.25,
            h: 0.2,
            fill: { color: "16A34A" },
            line: { color: "16A34A" },
        });
        slide.addText("On track / no issue", {
            x: 9.5,
            y: legendY,
            w: 1.5,
            h: 0.2,
            fontFace: "Calibri",
            fontSize: 8,
            color: THEME.text,
        });
        slide.addShape("rect" as PptxShapeType, {
            x: 11.1,
            y: legendY,
            w: 0.25,
            h: 0.2,
            fill: { color: "D97706" },
            line: { color: "D97706" },
        });
        slide.addText("Risk / Concern", {
            x: 11.4,
            y: legendY,
            w: 1.2,
            h: 0.2,
            fontFace: "Calibri",
            fontSize: 8,
            color: THEME.text,
        });
        slide.addShape("rect" as PptxShapeType, {
            x: 12.7,
            y: legendY,
            w: 0.25,
            h: 0.2,
            fill: { color: "DC2626" },
            line: { color: "DC2626" },
        });
        slide.addText("Behind / Major concern", {
            x: 13.0,
            y: legendY,
            w: 1.2,
            h: 0.2,
            fontFace: "Calibri",
            fontSize: 8,
            color: THEME.text,
        });
    }

    // ── Slide A: Cost & Commitments Status ───────────────────────────────
    if (sections.includes("cost_commitments")) {
        const slide = nextSlide(options.timeframeLabel);
        addHeader(slide, "Cost & Commitments Status", options.timeframeLabel);

        const f = exportData.kpis.financial;
        const totalCommitted = Number(f.totalCommitted || 0);
        const coImpact = Number(f.changeOrderImpact || 0);
        const prevCommitted = totalCommitted - coImpact;
        const ftc = Number(f.forecastToComplete || 0);
        const totalPending = Number(f.totalPending || 0);

        const coBreakdown = exportData.coBreakdown ?? { scope: 0, rate: 0, quantity: 0, schedule: 0 };

        const contentY = SLIDE.headerH + 0.15;
        const contentH = SLIDE.h - SLIDE.headerH - SLIDE.footerH - 0.2;
        const colW = (SLIDE.w - SLIDE.padX * 2 - 0.3) / 2;
        const leftX = SLIDE.padX;
        const rightX = SLIDE.padX + colW + 0.3;
        const chartH = contentH * 0.55;
        const panelH = contentH - chartH - 0.2;
        const panelY = contentY + chartH + 0.2;

        // Left: Commitment Summary bar chart
        addPanel(slide, leftX, contentY, colW, chartH, "Commitment Summary");
        const commitmentChartData: PptxChartData = [
            {
                name: "Value",
                labels: ["Prev Committed", "CO Impact", "Committed", "FTC", "Pending"],
                values: [prevCommitted, coImpact, totalCommitted, ftc, totalPending],
            },
        ];
        slide.addChart("bar" as Parameters<PptxSlide["addChart"]>[0], commitmentChartData, {
            x: leftX + 0.1,
            y: contentY + 0.38,
            w: colW - 0.2,
            h: chartH - 0.48,
            barDir: "col",
            chartColors: ["0E7490", "0E7490", "0E7490", "64748B", "94A3B8"],
            showLegend: false,
            showValue: true,
            dataLabelFontSize: 7,
            valAxisLabelFormatCode: "$#,##0",
            catAxisLabelFontSize: 8,
        });

        // Right: CO Categorization grouped bar
        addPanel(slide, rightX, contentY, colW, chartH, "CO Categorization (Control Budget vs Overrun)");
        const catLabels = ["Scope", "Rate", "Quantity", "Schedule"];
        const catValues = [
            Number(coBreakdown.scope || 0),
            Number(coBreakdown.rate || 0),
            Number(coBreakdown.quantity || 0),
            Number(coBreakdown.schedule || 0),
        ];
        const catOverrun = catValues.map((v) => (v < 0 ? Math.abs(v) : 0));
        const catBudget = catValues.map((v) => (v >= 0 ? v : 0));
        const catChartData: PptxChartData = [
            { name: "Control Budget", labels: catLabels, values: catBudget },
            { name: "Overrun", labels: catLabels, values: catOverrun },
        ];
        slide.addChart("bar" as Parameters<PptxSlide["addChart"]>[0], catChartData, {
            x: rightX + 0.1,
            y: contentY + 0.38,
            w: colW - 0.2,
            h: chartH - 0.48,
            barDir: "col",
            barGrouping: "clustered",
            chartColors: ["0E7490", "DC2626"],
            showLegend: true,
            legendPos: "b",
            legendFontSize: 8,
            showValue: true,
            dataLabelFontSize: 7,
            valAxisLabelFormatCode: "$#,##0",
            catAxisLabelFontSize: 8,
        });

        // Bottom-left: Main New Commitments text panel
        addPanel(slide, leftX, panelY, colW, panelH, "Main New Commitments");
        const commitBullets = [
            `• Total committed: ${fmtCurrency(totalCommitted)}`,
            `• Change order impact: ${coImpact >= 0 ? "+" : ""}${fmtCurrency(coImpact)}`,
            `• Forecast to complete: ${fmtCurrency(ftc)}`,
            `• Pending (unpaid approved): ${fmtCurrency(totalPending)}`,
        ];
        slide.addText(commitBullets.join("\n"), {
            x: leftX + 0.18,
            y: panelY + 0.38,
            w: colW - 0.36,
            h: panelH - 0.5,
            fontFace: "Calibri",
            fontSize: 9,
            color: THEME.text,
            valign: "top",
        });

        // Bottom-right: Deviations & Mitigations text panel
        addPanel(slide, rightX, panelY, colW, panelH, "Deviations & Mitigations");
        const deviationItems = [
            ...(exportData.conflicts ?? []).slice(0, 2).map(
                (c) => `• [Conflict] ${c.description ?? c.type}${c.supplierName ? ` — ${c.supplierName}` : ""}`,
            ),
            ...(exportData.openNCRs ?? []).slice(0, 2).map(
                (n) => `• [NCR-${n.ncrNumber}] ${n.title} (${n.severity})${n.supplierName ? ` — ${n.supplierName}` : ""}`,
            ),
        ].slice(0, 4);
        const deviationText = deviationItems.length > 0 ? deviationItems.join("\n") : "No active conflicts or open NCRs.";
        slide.addText(deviationText, {
            x: rightX + 0.18,
            y: panelY + 0.38,
            w: colW - 0.36,
            h: panelH - 0.5,
            fontFace: "Calibri",
            fontSize: 9,
            color: THEME.text,
            valign: "top",
        });
    }

    // ── Slide B: Project Progress Analysis Summary ────────────────────────
    if (sections.includes("progress_analysis") || sections.includes("portfolio")) {
        const slide = nextSlide(options.timeframeLabel);
        addHeader(slide, "Project Progress Analysis Summary", options.timeframeLabel);

        const contentY = SLIDE.headerH + 0.15;
        const contentH = SLIDE.h - SLIDE.headerH - SLIDE.footerH - 0.2;
        const colW = (SLIDE.w - SLIDE.padX * 2 - 0.3) / 2;
        const leftX = SLIDE.padX;
        const rightX = SLIDE.padX + colW + 0.3;
        const topH = contentH * 0.52;
        const botH = contentH - topH - 0.2;
        const botY = contentY + topH + 0.2;

        // Top-left: Cumulative Progress monthly bar chart
        addPanel(slide, leftX, contentY, colW, topH, "Cumulative Progress (%)");
        const sCurve = exportData.sCurve ?? [];
        const maxPlan = sCurve.reduce((m, p) => Math.max(m, Number(p.plannedCumulative || 0)), 1);
        const planPct = sCurve.map((p) => Math.min(100, (Number(p.plannedCumulative || 0) / maxPlan) * 100));
        const actualPct = sCurve.map((p) => Math.min(100, (Number(p.actualCumulative || 0) / maxPlan) * 100));
        const monthLabels = sCurve.map((p) => p.month);
        const progressChartData: PptxChartData = [
            { name: "Plan (%)", labels: monthLabels.length > 0 ? monthLabels : ["No data"], values: planPct.length > 0 ? planPct : [0] },
            { name: "Actuals (%)", labels: monthLabels.length > 0 ? monthLabels : ["No data"], values: actualPct.length > 0 ? actualPct : [0] },
        ];
        slide.addChart("bar" as Parameters<PptxSlide["addChart"]>[0], progressChartData, {
            x: leftX + 0.1,
            y: contentY + 0.38,
            w: colW - 0.2,
            h: topH - 0.48,
            barDir: "col",
            barGrouping: "clustered",
            chartColors: ["64748B", "0E7490"],
            showLegend: true,
            legendPos: "b",
            legendFontSize: 8,
            showValue: false,
            valAxisLabelFormatCode: "0%",
            catAxisLabelFontSize: 7,
        });

        // Top-right: Milestones achieved text panel
        addPanel(slide, rightX, contentY, colW, topH, "Milestones Achieved");
        const completedMilestones = (exportData.milestones ?? []).filter(
            (m) => m.status === "COMPLETE" || Number(m.progressPercent) >= 100,
        );
        const milestoneAchievedText = completedMilestones.length > 0
            ? completedMilestones.slice(0, 8).map((m) => `• ${m.milestoneName}${m.supplierName ? ` (${m.supplierName})` : ""}`).join("\n")
            : "No completed milestones in this period.";
        slide.addText(milestoneAchievedText, {
            x: rightX + 0.18,
            y: contentY + 0.38,
            w: colW - 0.36,
            h: topH - 0.5,
            fontFace: "Calibri",
            fontSize: 9,
            color: THEME.text,
            valign: "top",
        });

        addSectionDivider(slide, botY - 0.15, "Discipline Breakdown");

        // Bottom-left: Progress by Discipline (supplier) grouped bar
        addPanel(slide, leftX, botY, colW, botH, "Cumulative Project Progress by Discipline (%)");
        const supplierProgress = (exportData.supplierProgress ?? []).slice(0, 5);
        const discLabels = supplierProgress.map((s) => s.supplierName ?? "Unknown");
        const discPlan = supplierProgress.map(() => 100);
        const discActual = supplierProgress.map((s) => Math.min(100, Number(s.physicalProgress || 0)));
        const discChartData: PptxChartData = [
            { name: "Plan (%)", labels: discLabels.length > 0 ? discLabels : ["No data"], values: discPlan.length > 0 ? discPlan : [0] },
            { name: "Actuals (%)", labels: discLabels.length > 0 ? discLabels : ["No data"], values: discActual.length > 0 ? discActual : [0] },
        ];
        slide.addChart("bar" as Parameters<PptxSlide["addChart"]>[0], discChartData, {
            x: leftX + 0.1,
            y: botY + 0.38,
            w: colW - 0.2,
            h: botH - 0.48,
            barDir: "col",
            barGrouping: "clustered",
            chartColors: ["64748B", "0E7490"],
            showLegend: true,
            legendPos: "b",
            legendFontSize: 8,
            showValue: true,
            dataLabelFontSize: 7,
            valAxisLabelFormatCode: "0%",
            catAxisLabelFontSize: 8,
        });

        // Bottom-right: Deviations and Mitigations text panel
        addPanel(slide, rightX, botY, colW, botH, "Deviations and Mitigations");
        const delayedMilestones = (exportData.milestones ?? []).filter(
            (m) => m.status === "DELAYED" || m.status === "AT_RISK",
        );
        const deviationMilestoneText = delayedMilestones.length > 0
            ? delayedMilestones.slice(0, 6).map(
                (m) => `• ${m.milestoneName}: ${m.status}${m.supplierName ? ` — Coordinate with ${m.supplierName}` : ""}`,
            ).join("\n")
            : "No delayed or at-risk milestones.";
        slide.addText(deviationMilestoneText, {
            x: rightX + 0.18,
            y: botY + 0.38,
            w: colW - 0.36,
            h: botH - 0.5,
            fontFace: "Calibri",
            fontSize: 9,
            color: THEME.text,
            valign: "top",
        });
    }

    // ── Slide C: Executive Summary Cost & Schedule ────────────────────────
    if (sections.includes("exec_summary") || (sections.includes("financial") && (options.source === "executive" || options.audience === "executives" || options.audience === "clients"))) {
        const slide = nextSlide(options.timeframeLabel);
        addHeader(slide, "Executive Summary — Cost & Schedule", options.timeframeLabel);

        const f = exportData.kpis.financial;
        const p = exportData.kpis.progress;
        const totalCommitted = Number(f.totalCommitted || 0);
        const coImpact = Number(f.changeOrderImpact || 0);
        const ftc = Number(f.forecastToComplete || 0);
        const totalPending = Number(f.totalPending || 0);
        const totalPaid = Number(f.totalPaid || 0);
        const physPct = Number(p.physicalProgress || 0);
        const finPct = Number(p.financialProgress || 0);

        const contentY = SLIDE.headerH + 0.15;
        const contentH = SLIDE.h - SLIDE.headerH - SLIDE.footerH - 0.2;
        const leftW = (SLIDE.w - SLIDE.padX * 2) * 0.45;
        const rightW = (SLIDE.w - SLIDE.padX * 2) * 0.52;
        const leftX = SLIDE.padX;
        const rightX = SLIDE.padX + leftW + 0.15;
        const topH = contentH * 0.52;
        const botH = contentH - topH - 0.2;
        const botY = contentY + topH + 0.2;

        // Left: Cost Summary stacked bar (waterfall-style)
        addPanel(slide, leftX, contentY, leftW, contentH, "Cost Summary");
        const currentForecast = totalCommitted + coImpact;
        const potentialForecast = ftc + totalPending;
        const costLabels = ["Control Budget", "Prev Forecast", "Curr Forecast", "FTC", "Potential"];
        const vowd = [totalPaid, totalPaid, totalPaid, totalPaid, totalPaid];
        const etc = [
            Math.max(0, totalCommitted - totalPaid),
            Math.max(0, totalCommitted - totalPaid),
            Math.max(0, currentForecast - totalPaid),
            Math.max(0, ftc - totalPaid),
            Math.max(0, potentialForecast - totalPaid),
        ];
        const costChartData: PptxChartData = [
            { name: "VOWD (Paid)", labels: costLabels, values: vowd },
            { name: "ETC (Remaining)", labels: costLabels, values: etc },
        ];
        slide.addChart("bar" as Parameters<PptxSlide["addChart"]>[0], costChartData, {
            x: leftX + 0.1,
            y: contentY + 0.38,
            w: leftW - 0.2,
            h: contentH - 0.48,
            barDir: "col",
            barGrouping: "stacked",
            chartColors: ["0E7490", "94A3B8"],
            showLegend: true,
            legendPos: "b",
            legendFontSize: 8,
            showValue: false,
            valAxisLabelFormatCode: "$#,##0",
            catAxisLabelFontSize: 8,
        });

        // Top-right: Executive Summary narrative bullets
        addPanel(slide, rightX, contentY, rightW, topH, "Executive Summary");
        const execBullets = buildExecutiveSummaryBullets(exportData.kpis);
        slide.addText(execBullets.map((b) => `• ${b}`).join("\n"), {
            x: rightX + 0.18,
            y: contentY + 0.38,
            w: rightW - 0.36,
            h: topH - 0.5,
            fontFace: "Calibri",
            fontSize: 9.5,
            color: THEME.text,
            valign: "top",
        });

        // Bottom-right: Main KPIs table
        addPanel(slide, rightX, botY, rightW, botH, "Main KPIs");
        const spi = finPct > 0 ? Math.min(9.99, physPct / finPct) : 0;
        const earnedValue = physPct > 0 ? (physPct / 100) * totalCommitted : 0;
        const cpi = earnedValue > 0 ? Math.min(9.99, totalPaid / earnedValue) : 0;
        const kpiTableData = buildStyledTable(
            ["KPI", "Value", "Index"],
            [
                ["Plan Value (Committed)", fmtCurrency(totalCommitted), "—"],
                ["EV (Earned Value)", fmtCurrency(earnedValue), `SPI: ${spi.toFixed(2)}`],
                ["VOWD (Paid)", fmtCurrency(totalPaid), `CPI: ${cpi.toFixed(2)}`],
                ["FTC (Forecast to Complete)", fmtCurrency(ftc), "—"],
            ],
        );
        slide.addTable(kpiTableData, {
            x: rightX + 0.1,
            y: botY + 0.38,
            w: rightW - 0.2,
            h: botH - 0.48,
            fontFace: "Calibri",
            fontSize: 9,
            border: { type: "solid", color: THEME.border, pt: 1 },
            fill: { color: THEME.bg },
            color: THEME.text,
            rowH: 0.28,
        });
    }

    // ── Charts slide(s) ───────────────────────────────────────────────────
    if (includeCharts && sections.includes("charts")) {
        // Program Snapshot
        {
            const slide = nextSlide(options.timeframeLabel);
            addHeader(slide, "Program Snapshot", options.timeframeLabel);

            const k = exportData.kpis;
            const pendingExposure = Number(k.financial.totalPending || 0) + Number(k.financial.totalUnpaid || 0);

            addKpiTile(slide, 0.6, 1.25, "Financial Exposure", fmtCurrency(pendingExposure));
            addKpiTile(slide, 6.85, 1.25, "On-Time Delivery", fmtPercent(k.logistics.onTimeRate));
            addKpiTile(slide, 0.6, 2.45, "Open NCRs", fmtNumber(k.quality.openNCRs));
            addKpiTile(slide, 6.85, 2.45, "Milestones Complete", `${fmtNumber(k.progress.milestonesCompleted)} / ${fmtNumber(k.progress.milestonesTotal)}`);

            addPanel(slide, 0.6, 3.75, 6.1, 1.45, "Finance & Deliverables");
            const leftSummary = [
                `• Committed: ${fmtCurrency(k.financial.totalCommitted)}`,
                `• Paid: ${fmtCurrency(k.financial.totalPaid)} | Pending: ${fmtCurrency(k.financial.totalPending)}`,
                `• Shipments: ${fmtNumber(k.logistics.totalShipments)} total, ${fmtNumber(k.logistics.delayedShipments)} delayed`,
            ];
            slide.addText(leftSummary.join("\n"), {
                x: 0.82,
                y: 4.15,
                w: 5.7,
                h: 0.9,
                fontFace: "Calibri",
                fontSize: 11,
                color: THEME.text,
                valign: "top",
                lineSpacingMultiple: 1.1,
            });

            addPanel(slide, 6.85, 3.75, 6.1, 1.45, "Quality & Milestones");
            const rightSummary = [
                `• NCRs: ${fmtNumber(k.quality.totalNCRs)} total, ${fmtNumber(k.quality.criticalNCRs)} critical`,
                `• NCR Rate: ${fmtPercent(k.quality.ncrRate)} | Financial impact: ${fmtCurrency(k.quality.ncrFinancialImpact)}`,
                `• Progress: ${fmtPercent(k.progress.physicalProgress)} physical, ${fmtPercent(k.progress.financialProgress)} financial`,
            ];
            slide.addText(rightSummary.join("\n"), {
                x: 7.07,
                y: 4.15,
                w: 5.7,
                h: 0.9,
                fontFace: "Calibri",
                fontSize: 11,
                color: THEME.text,
                valign: "top",
                lineSpacingMultiple: 1.1,
            });

            addPanel(slide, 0.6, 5.35, 12.35, 1.7, "Upcoming Milestones");
            const milestoneRows = [...(exportData.milestones || [])]
                .filter((m) => m.expectedDate)
                .sort((a, b) => new Date(a.expectedDate!).getTime() - new Date(b.expectedDate!).getTime())
                .slice(0, 4)
                .map((m) => [
                    String(m.milestoneName ?? "—").slice(0, 36),
                    String(m.expectedDate ?? "—"),
                    `${Number(m.progressPercent ?? 0).toFixed(0)}%`,
                    String(m.status ?? "—"),
                ]);

            const tableData = buildStyledTable(
                ["Milestone", "Due", "Progress", "Status"],
                milestoneRows.length ? milestoneRows : [["No upcoming milestones in current scope", "—", "—", "—"]],
            );
            slide.addTable(tableData, {
                x: 0.82,
                y: 5.78,
                w: 11.9,
                h: 1.15,
                fontFace: "Calibri",
                fontSize: 8,
                border: { type: "solid", color: THEME.border, pt: 1 },
                fill: { color: THEME.bg },
                color: THEME.text,
                rowH: 0.2,
                colW: [6.2, 1.8, 1.2, 2.2],
            });
        }
    }

    // ── Financial Gantt — Payment & Milestone Timeline ────────────────────
    if (sections.includes("financial") || sections.includes("milestones") || sections.includes("charts")) {
        const slide = nextSlide(options.timeframeLabel);
        addHeader(slide, "Payment & Milestone Timeline", options.timeframeLabel);

        const k = exportData.kpis;
        const f = k.financial;

        // ── Colour palette ────────────────────────────────────────────────
        const C_GREEN  = "16A34A";
        const C_TEAL   = THEME.accent;
        const C_AMBER  = "D97706";
        const C_RED    = "DC2626";
        const C_GREY   = "94A3B8";
        const C_SLATE  = "334155";

        // ── Layout ────────────────────────────────────────────────────────
        const GANTT_X     = 3.0;   // where bars start (left edge of time axis)
        const GANTT_W     = 9.5;   // total width of time axis area
        const GANTT_TOP   = 1.2;   // y where first row starts
        const ROW_H       = 0.42;  // height of each Gantt row
        const ROW_GAP     = 0.07;  // gap between rows
        const BAR_H       = 0.22;  // actual bar height within a row
        const LABEL_W     = 2.8;   // width of the row label column
        const FOOTER_Y    = SLIDE.h - SLIDE.footerH - 1.05; // where summary boxes start

        // ── Collect & sort milestones ─────────────────────────────────────
        const milestones = [...(exportData.milestones || [])]
            .filter((m) => m.expectedDate)
            .sort((a, b) => new Date(a.expectedDate!).getTime() - new Date(b.expectedDate!).getTime())
            .slice(0, 9); // max 9 rows to fit the slide

        const now = new Date();

        // Determine time axis range
        const allDates = milestones
            .map((m) => new Date(m.expectedDate!).getTime())
            .filter(Number.isFinite);

        const axisStart = allDates.length
            ? new Date(Math.min(...allDates, now.getTime()))
            : now;
        const axisEnd = allDates.length
            ? new Date(Math.max(...allDates))
            : new Date(now.getFullYear(), now.getMonth() + 6, 1);

        // Pad axis slightly
        axisStart.setMonth(axisStart.getMonth() - 1);
        axisEnd.setMonth(axisEnd.getMonth() + 1);

        const axisMs   = axisEnd.getTime() - axisStart.getTime();
        const dateToX  = (d: Date) => GANTT_X + Math.max(0, Math.min(1, (d.getTime() - axisStart.getTime()) / axisMs)) * GANTT_W;
        const nowX     = dateToX(now);

        // ── Month grid lines & labels ─────────────────────────────────────
        const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const gridStart = new Date(axisStart.getFullYear(), axisStart.getMonth(), 1);
        const gridEnd   = new Date(axisEnd.getFullYear(), axisEnd.getMonth() + 1, 1);
        const gridRows  = milestones.length;
        const barsBottom = GANTT_TOP + gridRows * (ROW_H + ROW_GAP) + 0.06;

        for (let d = new Date(gridStart); d <= gridEnd; d.setMonth(d.getMonth() + 1)) {
            const gx = dateToX(new Date(d));
            if (gx < GANTT_X || gx > GANTT_X + GANTT_W + 0.01) continue;

            // Vertical grid line
            slide.addShape("line" as PptxShapeType, {
                x: gx, y: GANTT_TOP - 0.18,
                w: 0, h: barsBottom - GANTT_TOP + 0.18,
                line: { color: THEME.border, pt: 0.5, dashType: "dash" },
            });

            // Month label
            const label = d.getMonth() === 0
                ? `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`
                : MONTH_NAMES[d.getMonth()];
            slide.addText(label, {
                x: gx + 0.04, y: GANTT_TOP - 0.22, w: 0.7, h: 0.2,
                fontFace: "Calibri", fontSize: 7.5,
                color: THEME.muted2,
            });
        }

        // ── TODAY marker ─────────────────────────────────────────────────
        if (nowX >= GANTT_X && nowX <= GANTT_X + GANTT_W) {
            slide.addShape("line" as PptxShapeType, {
                x: nowX, y: GANTT_TOP - 0.18,
                w: 0, h: barsBottom - GANTT_TOP + 0.18,
                line: { color: C_RED, pt: 1.5, dashType: "sysDot" },
            });
            slide.addText("TODAY", {
                x: nowX - 0.25, y: GANTT_TOP - 0.38, w: 0.6, h: 0.18,
                fontFace: "Calibri", fontSize: 7, bold: true,
                align: "center", color: C_RED,
            });
        }

        // ── Gantt rows ────────────────────────────────────────────────────
        if (milestones.length === 0) {
            slide.addText("No milestone data available for this timeframe.", {
                x: GANTT_X, y: GANTT_TOP + 0.5, w: GANTT_W, h: 0.4,
                fontFace: "Calibri", fontSize: 13,
                align: "center", color: THEME.muted,
            });
        } else {
            milestones.forEach((m, i) => {
                const rowY   = GANTT_TOP + i * (ROW_H + ROW_GAP);
                const barY   = rowY + (ROW_H - BAR_H) / 2;
                const dueDate = new Date(m.expectedDate!);
                const status  = String(m.status ?? "PENDING").toUpperCase();
                const pct     = Math.min(100, Math.max(0, Number(m.progressPercent ?? 0)));
                const amount  = Number(m.amount ?? 0);

                // Bar colour by status
                const barColor =
                    status === "COMPLETE" || status === "PAID"  ? C_GREEN :
                    status === "IN_PROGRESS"                    ? C_TEAL  :
                    dueDate < now && status !== "COMPLETE"      ? C_RED   :
                    status === "AT_RISK"                        ? C_AMBER :
                    C_GREY;

                // Row zebra background
                if (i % 2 === 1) {
                    slide.addShape("rect" as PptxShapeType, {
                        x: 0.3, y: rowY - 0.02,
                        w: SLIDE.w - 0.6, h: ROW_H + 0.04,
                        fill: { color: THEME.surface },
                        line: { color: THEME.surface },
                    });
                }

                // Row label (milestone name, truncated)
                const labelText = String(m.milestoneName ?? "—").slice(0, 28);
                slide.addText(labelText, {
                    x: 0.35, y: rowY + (ROW_H - 0.22) / 2,
                    w: LABEL_W - 0.4, h: 0.22,
                    fontFace: "Calibri", fontSize: 9.5,
                    color: THEME.text, valign: "middle",
                });

                // Supplier name sub-label
                if (m.supplierName) {
                    slide.addText(String(m.supplierName).slice(0, 22), {
                        x: 0.35, y: rowY + ROW_H * 0.52,
                        w: LABEL_W - 0.4, h: 0.16,
                        fontFace: "Calibri", fontSize: 7.5,
                        color: THEME.muted2,
                    });
                }

                // Bar track (full width background)
                slide.addShape("roundRect" as PptxShapeType, {
                    x: GANTT_X, y: barY,
                    w: GANTT_W, h: BAR_H,
                    fill: { color: THEME.surface2 },
                    line: { color: THEME.border, pt: 0.5 },
                });

                // Bar fill up to due date
                const barEndX = dateToX(dueDate);
                const barFillW = Math.max(0.08, barEndX - GANTT_X);
                slide.addShape("roundRect" as PptxShapeType, {
                    x: GANTT_X, y: barY,
                    w: Math.min(barFillW, GANTT_W), h: BAR_H,
                    fill: { color: barColor },
                    line: { color: barColor },
                });

                // Progress overlay (darker fill showing actual % done)
                if (pct > 0 && pct < 100) {
                    slide.addShape("roundRect" as PptxShapeType, {
                        x: GANTT_X, y: barY,
                        w: Math.min(barFillW * (pct / 100), GANTT_W), h: BAR_H,
                        fill: { color: C_SLATE },
                        line: { color: C_SLATE },
                    });
                }

                // Due date marker diamond
                if (barEndX >= GANTT_X && barEndX <= GANTT_X + GANTT_W) {
                    slide.addShape("diamond" as PptxShapeType, {
                        x: barEndX - 0.06, y: barY - 0.04,
                        w: 0.12, h: BAR_H + 0.08,
                        fill: { color: barColor },
                        line: { color: "FFFFFF", pt: 1 },
                    });
                }

                // Amount label (right of bar area)
                const amtStr = amount > 0
                    ? fmtCurrency(amount)
                    : "";
                if (amtStr) {
                    slide.addText(amtStr, {
                        x: GANTT_X + GANTT_W + 0.1, y: rowY + (ROW_H - 0.2) / 2,
                        w: 1.4, h: 0.2,
                        fontFace: "Calibri", fontSize: 9, bold: true,
                        color: barColor, valign: "middle",
                    });
                }

                // Status pill
                slide.addShape("roundRect" as PptxShapeType, {
                    x: GANTT_X + GANTT_W + 0.1, y: rowY + ROW_H * 0.52,
                    w: 1.0, h: 0.16,
                    fill: { color: barColor + "22" },
                    line: { color: barColor, pt: 0.5 },
                });
                slide.addText(status.replace(/_/g, " "), {
                    x: GANTT_X + GANTT_W + 0.1, y: rowY + ROW_H * 0.52,
                    w: 1.0, h: 0.16,
                    fontFace: "Calibri", fontSize: 6.5, bold: true,
                    align: "center", valign: "middle",
                    color: barColor,
                });
            });
        }

        // ── Divider line above summary ────────────────────────────────────
        slide.addShape("line" as PptxShapeType, {
            x: 0.3, y: FOOTER_Y - 0.1,
            w: SLIDE.w - 0.6, h: 0,
            line: { color: THEME.border, pt: 1 },
        });

        // ── Summary boxes (3 KPIs at the bottom) ─────────────────────────
        const boxW = 3.6;
        const boxH = 0.75;
        const boxY = FOOTER_Y + 0.05;
        const boxes = [
            { label: "Total Committed",  value: fmtCurrency(f.totalCommitted),   color: C_TEAL  },
            { label: "Total Paid",        value: fmtCurrency(f.totalPaid),         color: C_GREEN },
            { label: "Outstanding",       value: fmtCurrency(f.totalUnpaid + f.totalPending), color: C_AMBER },
        ];

        boxes.forEach((box, i) => {
            const bx = 0.6 + i * (boxW + 0.3);

            slide.addShape("roundRect" as PptxShapeType, {
                x: bx, y: boxY, w: boxW, h: boxH,
                fill: { color: THEME.surface },
                line: { color: THEME.border, pt: 1 },
            });
            // Left accent bar
            slide.addShape("rect" as PptxShapeType, {
                x: bx, y: boxY, w: 0.06, h: boxH,
                fill: { color: box.color },
                line: { color: box.color },
            });
            slide.addText(box.label, {
                x: bx + 0.16, y: boxY + 0.1, w: boxW - 0.22, h: 0.2,
                fontFace: "Calibri", fontSize: 9,
                color: THEME.muted2,
            });
            slide.addText(box.value, {
                x: bx + 0.16, y: boxY + 0.3, w: boxW - 0.22, h: 0.35,
                fontFace: "Calibri", fontSize: 16, bold: true,
                color: THEME.text,
            });
        });

        // Additional box: CO Impact (far right if space)
        if (f.changeOrderImpact !== 0) {
            const bx = 0.6 + 3 * (boxW + 0.3);
            slide.addShape("roundRect" as PptxShapeType, {
                x: bx, y: boxY, w: boxW, h: boxH,
                fill: { color: THEME.surface },
                line: { color: THEME.border, pt: 1 },
            });
            slide.addShape("rect" as PptxShapeType, {
                x: bx, y: boxY, w: 0.06, h: boxH,
                fill: { color: f.changeOrderImpact > 0 ? C_RED : C_GREEN },
                line: { color: f.changeOrderImpact > 0 ? C_RED : C_GREEN },
            });
            slide.addText("CO Impact", {
                x: bx + 0.16, y: boxY + 0.1, w: boxW - 0.22, h: 0.2,
                fontFace: "Calibri", fontSize: 9,
                color: THEME.muted2,
            });
            slide.addText(`${f.changeOrderImpact > 0 ? "+" : ""}${fmtCurrency(f.changeOrderImpact)}`, {
                x: bx + 0.16, y: boxY + 0.3, w: boxW - 0.22, h: 0.35,
                fontFace: "Calibri", fontSize: 16, bold: true,
                color: f.changeOrderImpact > 0 ? C_RED : C_GREEN,
            });
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
