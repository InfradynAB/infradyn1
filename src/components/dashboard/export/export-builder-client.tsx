"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Download, ArrowLeft, FileCsv, FileXls, FilePdf, FileDoc, ChartBar, Table, CheckSquare, UsersThree } from "@phosphor-icons/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { exportTabularData } from "@/lib/export-engine";
import type { ExportChartImage } from "@/lib/export-engine";
import type { DashboardExportData } from "@/lib/utils/excel-export";

type ExportFormat = "xlsx" | "csv" | "json" | "pdf" | "docx" | "pptx";
type DashboardSource = "executive" | "pm" | "supplier";
type Audience = "executives" | "clients" | "workmates" | "investors";

interface ExportBuilderClientProps {
    userRole: string;
}

type ExportModule = {
    id: string;
    label: string;
    description: string;
    defaultSelected?: boolean;
};

const MODULES_BY_SOURCE: Record<DashboardSource, ExportModule[]> = {
    executive: [
        { id: "financial", label: "Financial", description: "Committed, paid, unpaid, retention", defaultSelected: true },
        { id: "portfolio", label: "Portfolio Progress", description: "Physical and financial progress", defaultSelected: true },
        { id: "quality", label: "Quality", description: "NCR trends and exposure", defaultSelected: true },
        { id: "suppliers", label: "Suppliers", description: "Supplier health and exposure", defaultSelected: true },
        { id: "logistics", label: "Logistics", description: "Shipment and on-time delivery", defaultSelected: true },
        { id: "milestones", label: "Milestones", description: "Milestone table and status", defaultSelected: true },
        { id: "charts", label: "Charts", description: "S-curve and CO chart data", defaultSelected: true },
    ],
    pm: [
        { id: "financial", label: "Financial", description: "Budget, spend, payment posture", defaultSelected: true },
        { id: "deliveries", label: "Deliveries", description: "Delivery performance and risk", defaultSelected: true },
        { id: "materials", label: "Materials", description: "Progress and supply status", defaultSelected: true },
        { id: "quality", label: "Quality", description: "NCR and quality risk", defaultSelected: true },
        { id: "suppliers", label: "Suppliers", description: "Supplier execution stats", defaultSelected: true },
        { id: "milestones", label: "Milestones", description: "Milestone completion and forecast", defaultSelected: true },
        { id: "charts", label: "Charts", description: "S-curve and trend visuals", defaultSelected: true },
    ],
    supplier: [
        { id: "financial", label: "Financial", description: "PO values, invoices, cashflow", defaultSelected: true },
        { id: "performance", label: "Performance", description: "Response, reliability, progress", defaultSelected: true },
        { id: "deliveries", label: "Deliveries", description: "Shipment and on-time performance", defaultSelected: true },
        { id: "quality", label: "Quality & NCR", description: "NCR and quality indicators", defaultSelected: true },
        { id: "milestones", label: "Milestones", description: "Milestone statuses and dates", defaultSelected: true },
        { id: "compliance", label: "Compliance", description: "Compliance and quality score", defaultSelected: true },
        { id: "charts", label: "Charts", description: "S-curve and chart-ready points", defaultSelected: true },
    ],
};

const SUPPORTED_EXPORT_SOURCES: DashboardSource[] = ["executive", "pm", "supplier"];

type SupplierOption = { id: string; name: string };

function fmtNumber(value: unknown): string {
    const num = Number(value) || 0;
    return new Intl.NumberFormat("en-US").format(num);
}

function fmtCurrency(value: unknown): string {
    const num = Number(value) || 0;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

function fmtPercent(value: unknown): string {
    const num = Number(value) || 0;
    return `${num.toFixed(1)}%`;
}

function buildTabularRows(
    source: DashboardSource,
    data: DashboardExportData,
    selectedModules: string[],
    includeTables: boolean,
    includeCharts: boolean
): Array<Record<string, string>> {
    const rows: Array<Record<string, string>> = [];
    const has = (section: string) => selectedModules.includes(section);

    if (has("financial")) {
        rows.push(
            { section: "Financial", item: "Total Committed", value: fmtCurrency(data.kpis.financial.totalCommitted), context: "Portfolio" },
            { section: "Financial", item: "Total Paid", value: fmtCurrency(data.kpis.financial.totalPaid), context: "Portfolio" },
            { section: "Financial", item: "Total Unpaid", value: fmtCurrency(data.kpis.financial.totalUnpaid), context: "Portfolio" },
            { section: "Financial", item: "Retention Held", value: fmtCurrency(data.kpis.financial.retentionHeld), context: "Portfolio" },
        );
    }

    if (has("portfolio") || has("performance")) {
        rows.push(
            { section: "Progress", item: "Physical Progress", value: fmtPercent(data.kpis.progress.physicalProgress), context: "Portfolio" },
            { section: "Progress", item: "Financial Progress", value: fmtPercent(data.kpis.progress.financialProgress), context: "Portfolio" },
            { section: "Progress", item: "Milestones Completed", value: `${fmtNumber(data.kpis.progress.milestonesCompleted)} / ${fmtNumber(data.kpis.progress.milestonesTotal)}`, context: "Portfolio" },
        );
    }

    if (has("quality")) {
        rows.push(
            { section: "Quality", item: "Total NCRs", value: fmtNumber(data.kpis.quality.totalNCRs), context: "Portfolio" },
            { section: "Quality", item: "Open NCRs", value: fmtNumber(data.kpis.quality.openNCRs), context: "Portfolio" },
            { section: "Quality", item: "Critical NCRs", value: fmtNumber(data.kpis.quality.criticalNCRs), context: "Portfolio" },
            { section: "Quality", item: "NCR Rate", value: fmtPercent(data.kpis.quality.ncrRate), context: "Portfolio" },
        );
    }

    if (has("suppliers") || has("performance")) {
        rows.push(
            { section: "Suppliers", item: "Total Suppliers", value: fmtNumber(data.kpis.suppliers.totalSuppliers), context: "Portfolio" },
            { section: "Suppliers", item: "Active Suppliers", value: fmtNumber(data.kpis.suppliers.activeSuppliers), context: "Portfolio" },
            { section: "Suppliers", item: "Average Delivery Score", value: fmtPercent(data.kpis.suppliers.avgDeliveryScore), context: "Portfolio" },
            { section: "Suppliers", item: "Average Quality Score", value: fmtPercent(data.kpis.suppliers.avgQualityScore), context: "Portfolio" },
        );
    }

    if (has("logistics") || has("deliveries")) {
        rows.push(
            { section: "Logistics", item: "Total Shipments", value: fmtNumber(data.kpis.logistics.totalShipments), context: "Portfolio" },
            { section: "Logistics", item: "Delivered On Time", value: fmtNumber(data.kpis.logistics.deliveredOnTime), context: "Portfolio" },
            { section: "Logistics", item: "On-Time Rate", value: fmtPercent(data.kpis.logistics.onTimeRate), context: "Portfolio" },
        );
    }

    if (includeTables && has("milestones")) {
        data.milestones.slice(0, 120).forEach((milestone) => {
            rows.push({
                section: "Milestones",
                item: `${milestone.poNumber} · ${milestone.milestoneName}`,
                value: `${milestone.progressPercent.toFixed(1)}%`,
                context: milestone.status,
            });
        });
    }

    if (includeTables && (has("suppliers") || has("performance"))) {
        data.supplierProgress.slice(0, 120).forEach((supplierRow) => {
            rows.push({
                section: "Supplier Progress",
                item: supplierRow.supplierName,
                value: `${supplierRow.physicalProgress.toFixed(1)}% physical / ${supplierRow.financialProgress.toFixed(1)}% financial`,
                context: `${fmtCurrency(supplierRow.totalValue)} total`,
            });
        });
    }

    if (source === "supplier" && has("compliance")) {
        rows.push({
            section: "Compliance",
            item: "Average Quality Score",
            value: fmtPercent(data.kpis.suppliers.avgQualityScore),
            context: "Quality posture",
        });
    }

    if (includeCharts && has("charts")) {
        data.sCurve.slice(0, 120).forEach((point) => {
            rows.push({
                section: "S-Curve",
                item: point.month,
                value: `Planned ${point.plannedCumulative.toFixed(1)}% | Actual ${point.actualCumulative.toFixed(1)}%`,
                context: "Trend",
            });
        });
        rows.push({
            section: "Change Orders",
            item: "Breakdown",
            value: `Scope ${fmtCurrency(data.coBreakdown.scope)}, Rate ${fmtCurrency(data.coBreakdown.rate)}, Quantity ${fmtCurrency(data.coBreakdown.quantity)}, Schedule ${fmtCurrency(data.coBreakdown.schedule)}`,
            context: fmtCurrency(data.coBreakdown.total),
        });
    }

    return rows;
}

function buildChartCards(data: DashboardExportData): Array<{ title: string; value: string; subtitle: string }> {
    const latest = data.sCurve[data.sCurve.length - 1];
    return [
        {
            title: "Financial Snapshot",
            value: `Committed ${fmtCurrency(data.kpis.financial.totalCommitted)} · Paid ${fmtCurrency(data.kpis.financial.totalPaid)}`,
            subtitle: `Unpaid ${fmtCurrency(data.kpis.financial.totalUnpaid)}`,
        },
        {
            title: "Delivery Performance",
            value: `On-Time ${fmtPercent(data.kpis.logistics.onTimeRate)} · Delivered ${fmtNumber(data.kpis.logistics.deliveredOnTime)}`,
            subtitle: `${fmtNumber(data.kpis.logistics.totalShipments)} total shipments`,
        },
        {
            title: "Quality Risk",
            value: `Open NCRs ${fmtNumber(data.kpis.quality.openNCRs)} · Critical ${fmtNumber(data.kpis.quality.criticalNCRs)}`,
            subtitle: `NCR rate ${fmtPercent(data.kpis.quality.ncrRate)}`,
        },
        {
            title: "S-Curve",
            value: latest
                ? `Planned ${latest.plannedCumulative.toFixed(1)}% · Actual ${latest.actualCumulative.toFixed(1)}%`
                : "No S-curve data",
            subtitle: latest?.month || "Current period",
        },
    ];
}

function renderCardSvg(title: string, value: string, subtitle: string): string {
    const esc = (text: string) => text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="280" viewBox="0 0 1200 280">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f766e" />
      <stop offset="100%" stop-color="#0f6157" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1200" height="280" fill="url(#bg)" rx="20" ry="20" />
  <text x="48" y="74" fill="#e7fffb" font-size="28" font-family="Segoe UI, Arial, sans-serif" font-weight="600">${esc(title)}</text>
  <text x="48" y="150" fill="#ffffff" font-size="44" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${esc(value)}</text>
  <text x="48" y="204" fill="#d5f4ef" font-size="24" font-family="Segoe UI, Arial, sans-serif">${esc(subtitle)}</text>
</svg>`;
}

async function svgToPngDataUrl(svgMarkup: string): Promise<string | null> {
    try {
        const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const image = new Image();

        const loaded = await new Promise<boolean>((resolve) => {
            image.onload = () => resolve(true);
            image.onerror = () => resolve(false);
            image.src = url;
        });

        if (!loaded) {
            URL.revokeObjectURL(url);
            return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 280;
        const context = canvas.getContext("2d");
        if (!context) {
            URL.revokeObjectURL(url);
            return null;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        return canvas.toDataURL("image/png");
    } catch {
        return null;
    }
}

async function buildChartImages(data: DashboardExportData): Promise<ExportChartImage[]> {
    const cards = buildChartCards(data);
    const images: ExportChartImage[] = [];

    for (const card of cards) {
        const svg = renderCardSvg(card.title, card.value, card.subtitle);
        const dataUrl = await svgToPngDataUrl(svg);
        if (dataUrl) {
            images.push({
                title: card.title,
                dataUrl,
            });
        }
    }

    return images;
}

export function ExportBuilderClient({ userRole }: ExportBuilderClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const requestedSource = (searchParams.get("source") || "executive") as DashboardSource;
    const initialProjectId = searchParams.get("projectId") || "";
    const initialTimeframe = searchParams.get("timeframe") || "all";
    const initialCustomFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom") as string) : undefined;
    const initialCustomTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo") as string) : undefined;

    const [source, setSource] = useState<DashboardSource>(requestedSource);
    const [audience, setAudience] = useState<Audience>("executives");
    const [format, setFormat] = useState<ExportFormat>("xlsx");
    const [reportType, setReportType] = useState<"summary" | "detailed">("detailed");
    const [timeframe, setTimeframe] = useState(initialTimeframe);
    const [customFrom, setCustomFrom] = useState<Date | undefined>(
        initialTimeframe === "custom" ? initialCustomFrom : undefined,
    );
    const [customTo, setCustomTo] = useState<Date | undefined>(
        initialTimeframe === "custom" ? initialCustomTo : undefined,
    );
    const [projectId, setProjectId] = useState(initialProjectId);
    const [includeTables, setIncludeTables] = useState(true);
    const [includeCharts, setIncludeCharts] = useState(true);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [supplierScope, setSupplierScope] = useState<"self" | "all" | "single">(userRole === "SUPPLIER" ? "self" : "all");
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (timeframe !== "custom") return;
        if (customFrom) return;
        const now = new Date();
        setCustomTo((prev) => prev ?? now);
        setCustomFrom(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    }, [customFrom, timeframe]);

    const unsupportedSource = !SUPPORTED_EXPORT_SOURCES.includes(source);
    const roleAllowedSources = useMemo(() => {
        if (userRole === "SUPPLIER") return ["supplier"] as DashboardSource[];
        if (userRole === "PM") return ["pm"] as DashboardSource[];
        return ["executive", "pm", "supplier"] as DashboardSource[];
    }, [userRole]);

    const sourceModules = useMemo(() => MODULES_BY_SOURCE[source], [source]);

    const previewRows = useMemo(
        () => sourceModules
            .filter((module) => selectedModules.includes(module.id))
            .map((module) => ({
                module: module.label,
                description: module.description,
            })),
        [sourceModules, selectedModules]
    );

    useEffect(() => {
        if (!roleAllowedSources.includes(source)) {
            setSource(roleAllowedSources[0]);
        }
    }, [roleAllowedSources, source]);

    useEffect(() => {
        const defaults = MODULES_BY_SOURCE[source]
            .filter((module) => module.defaultSelected)
            .map((module) => module.id);
        setSelectedModules(defaults.length > 0 ? defaults : MODULES_BY_SOURCE[source].map((module) => module.id));
    }, [source]);

    useEffect(() => {
        if (source !== "supplier") return;
        if (userRole === "SUPPLIER") return;

        let mounted = true;
        const loadSuppliers = async () => {
            try {
                const response = await fetch("/api/suppliers/list");
                if (!response.ok) return;
                const payload = await response.json() as {
                    success?: boolean;
                    data?: { suppliers?: Array<{ id: string; name: string }> };
                };
                if (!mounted || !payload.success) return;
                setSupplierOptions((payload.data?.suppliers || []).map((supplierRow) => ({
                    id: supplierRow.id,
                    name: supplierRow.name,
                })));
            } catch {
                setSupplierOptions([]);
            }
        };

        loadSuppliers();
        return () => {
            mounted = false;
        };
    }, [source, userRole]);

    const toggleSection = (sectionId: string, checked: boolean) => {
        setSelectedModules((prev) => {
            if (checked) return Array.from(new Set([...prev, sectionId]));
            return prev.filter((section) => section !== sectionId);
        });
    };

    const handleExport = async () => {
        if (selectedModules.length === 0) {
            toast.error("Select at least one module to export");
            return;
        }

        if (unsupportedSource) {
            toast.error("This data source export is not connected yet");
            return;
        }

        if (source === "supplier" && supplierScope === "single" && !selectedSupplierId) {
            toast.error("Choose a supplier to export");
            return;
        }

        setExporting(true);
        try {
            const params = new URLSearchParams();
            params.set("type", reportType);
            params.set("audience", audience);
            params.set("source", source);
            params.set("timeframe", timeframe);
            params.set("includeTables", String(includeTables));
            params.set("includeCharts", String(includeCharts));
            params.set("sections", selectedModules.join(","));

            if (timeframe === "custom") {
                if (!customFrom) {
                    toast.error("Select a start date for Custom timeframe");
                    return;
                }

                const effectiveTo = customTo ?? new Date();
                if (effectiveTo < customFrom) {
                    toast.error("Custom end date cannot be before start date");
                    return;
                }

                params.set("dateFrom", customFrom.toISOString());
                params.set("dateTo", effectiveTo.toISOString());
            }

            if (source === "supplier" && supplierScope === "single" && selectedSupplierId) {
                params.set("supplierId", selectedSupplierId);
            }

            if (projectId.trim()) {
                params.set("projectId", projectId.trim());
            }

            if (format === "pptx") {
                params.set("format", "pptx");
                const response = await fetch(`/api/dashboard/export?${params.toString()}`);
                if (!response.ok) throw new Error("Export failed");

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                const supplierSuffix = source === "supplier" && supplierScope === "single" && selectedSupplierId ? "-single" : "";
                anchor.download = `infradyn-${source}${supplierSuffix}-${audience}-${new Date().toISOString().slice(0, 10)}.pptx`;
                anchor.click();
                window.URL.revokeObjectURL(url);

                toast.success("PPTX export ready");
                return;
            }

            if (format === "json") {
                params.set("format", "json");
                const response = await fetch(`/api/dashboard/export?${params.toString()}`);
                if (!response.ok) throw new Error("Export failed");

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                const supplierSuffix = source === "supplier" && supplierScope === "single" && selectedSupplierId ? "-single" : "";
                anchor.download = `infradyn-${source}${supplierSuffix}-${audience}-${new Date().toISOString().slice(0, 10)}.json`;
                anchor.click();
                window.URL.revokeObjectURL(url);

                toast.success("Export ready");
                return;
            }

            params.set("format", "json");
            const response = await fetch(`/api/dashboard/export?${params.toString()}`);
            if (!response.ok) throw new Error("Export failed");
            const payload = await response.json() as { data?: DashboardExportData };
            if (!payload.data) throw new Error("No export data");

            const rows = buildTabularRows(source, payload.data, selectedModules, includeTables, includeCharts);
            if (rows.length === 0) {
                toast.error("No rows to export for the selected options");
                return;
            }

            const exportFormat = format === "xlsx" ? "excel" : format;
            const chartImages = includeCharts && (format === "pdf" || format === "docx")
                ? await buildChartImages(payload.data)
                : [];
            await exportTabularData({
                fileName: `infradyn-${source}-${audience}`,
                title: `${source.toUpperCase()} Export for ${audience}${source === "supplier" && supplierScope === "single" ? " (Single Supplier)" : ""}`,
                format: exportFormat,
                columns: [
                    { key: "section", label: "Section" },
                    { key: "item", label: "Item" },
                    { key: "value", label: "Value" },
                    { key: "context", label: "Context" },
                ],
                rows,
                chartImages,
            });

            toast.success("Export ready");
        } catch {
            toast.error("Export failed");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 pb-20">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Export Center</h1>
                    <p className="text-sm text-muted-foreground">Choose audience, sections, and format before downloading.</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Export Profile</CardTitle>
                    <CardDescription>Build one export package tailored to the person you want to present to.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="source">Data Source</Label>
                            <Select value={source} onValueChange={(value) => setSource(value as DashboardSource)}>
                                <SelectTrigger id="source"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {roleAllowedSources.includes("executive") && <SelectItem value="executive">Executive Dashboard</SelectItem>}
                                    {roleAllowedSources.includes("pm") && <SelectItem value="pm">Project Manager Dashboard</SelectItem>}
                                    {roleAllowedSources.includes("supplier") && <SelectItem value="supplier">Supplier Dashboard</SelectItem>}
                                </SelectContent>
                            </Select>
                            {unsupportedSource && <p className="text-xs text-muted-foreground">This source will be connected in the next phase.</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="audience">Audience</Label>
                            <Select value={audience} onValueChange={(value) => setAudience(value as Audience)}>
                                <SelectTrigger id="audience"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="executives">Executives</SelectItem>
                                    <SelectItem value="clients">Clients</SelectItem>
                                    <SelectItem value="workmates">Workmates</SelectItem>
                                    <SelectItem value="investors">Investors</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="format">Format</Label>
                            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
                                <SelectTrigger id="format"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                                    <SelectItem value="csv">CSV</SelectItem>
                                    <SelectItem value="json">JSON</SelectItem>
                                    <SelectItem value="pptx">PowerPoint (.pptx)</SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="docx">Word (.docx)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="reportType">Detail Level</Label>
                            <Select value={reportType} onValueChange={(value) => setReportType(value as "summary" | "detailed")}>
                                <SelectTrigger id="reportType"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="summary">Summary</SelectItem>
                                    <SelectItem value="detailed">Detailed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="timeframe">Timeframe</Label>
                            <Select value={timeframe} onValueChange={setTimeframe}>
                                <SelectTrigger id="timeframe"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="7d">Last 7 Days</SelectItem>
                                    <SelectItem value="30d">Last 30 Days</SelectItem>
                                    <SelectItem value="90d">Last 90 Days</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {timeframe === "custom" && (
                            <div className="space-y-2 lg:col-span-3">
                                <Label>Custom Dates</Label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <DatePicker
                                        value={customFrom}
                                        onChange={setCustomFrom}
                                        placeholder="From (yyyy/mm/dd)"
                                    />
                                    <DatePicker
                                        value={customTo}
                                        onChange={setCustomTo}
                                        placeholder="To (yyyy/mm/dd)"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">If To is blank, export runs until today.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="projectId">Project ID (optional)</Label>
                            <Input
                                id="projectId"
                                placeholder="All projects"
                                value={projectId}
                                onChange={(event) => setProjectId(event.target.value)}
                            />
                        </div>
                    </div>

                    {source === "supplier" && (
                        <div className="space-y-3 rounded-xl border p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <UsersThree className="h-4 w-4" />
                                Supplier Scope
                            </div>
                            {userRole === "SUPPLIER" ? (
                                <div className="text-sm text-muted-foreground">Supplier users export their own data only.</div>
                            ) : (
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="supplierScope">Scope</Label>
                                        <Select value={supplierScope} onValueChange={(value) => setSupplierScope(value as "all" | "single")}>
                                            <SelectTrigger id="supplierScope"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Suppliers</SelectItem>
                                                <SelectItem value="single">Single Supplier</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="supplierId">Supplier</Label>
                                        <Select
                                            value={selectedSupplierId || "__none__"}
                                            onValueChange={(value) => setSelectedSupplierId(value === "__none__" ? "" : value)}
                                            disabled={supplierScope !== "single"}
                                        >
                                            <SelectTrigger id="supplierId"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">Select supplier</SelectItem>
                                                {supplierOptions.map((supplierRow) => (
                                                    <SelectItem key={supplierRow.id} value={supplierRow.id}>{supplierRow.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Data Modules
                    </CardTitle>
                    <CardDescription>Choose exactly what should appear in this export for this source.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedModules(sourceModules.map((module) => module.id))}
                        >
                            Select All
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedModules([])}
                        >
                            Clear
                        </Button>
                        <Badge variant="secondary">{selectedModules.length} selected</Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {sourceModules.map((module) => {
                            const checked = selectedModules.includes(module.id);
                            return (
                                <div key={module.id} className="space-y-1 rounded-lg border p-3">
                                    <div className="flex items-center gap-2">
                                    <Checkbox
                                        id={`module-${module.id}`}
                                        checked={checked}
                                        onCheckedChange={(value) => toggleSection(module.id, Boolean(value))}
                                    />
                                        <Label htmlFor={`module-${module.id}`} className="cursor-pointer">{module.label}</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground pl-6">{module.description}</p>
                                </div>
                            );
                        })}
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium flex items-center gap-2"><Table className="h-4 w-4" />Include Tables</p>
                                <p className="text-xs text-muted-foreground">Include tabular datasets in the export.</p>
                            </div>
                            <Switch checked={includeTables} onCheckedChange={setIncludeTables} />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium flex items-center gap-2"><ChartBar className="h-4 w-4" />Include Charts</p>
                                <p className="text-xs text-muted-foreground">Include chart snapshots and visual summaries.</p>
                            </div>
                            <Switch checked={includeCharts} onCheckedChange={setIncludeCharts} />
                        </div>
                    </div>

                    <div className="rounded-xl border p-3">
                        <div className="text-sm font-medium mb-2">Export Preview</div>
                        <div className="grid gap-2 text-xs">
                            <div className="text-muted-foreground">{previewRows.length} module(s) selected for {source.toUpperCase()} export</div>
                            {previewRows.slice(0, 6).map((row) => (
                                <div key={row.module} className="flex items-center justify-between gap-4 rounded-md bg-muted/40 px-3 py-2">
                                    <span className="font-medium">{row.module}</span>
                                    <span className="text-muted-foreground text-right">{row.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Export Action</CardTitle>
                    <CardDescription>Run export with your selections.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {format === "xlsx" && <FileXls className="h-4 w-4" />}
                        {format === "csv" && <FileCsv className="h-4 w-4" />}
                        {format === "pdf" && <FilePdf className="h-4 w-4" />}
                        {format === "docx" && <FileDoc className="h-4 w-4" />}
                        {format === "json" && <Download className="h-4 w-4" />}
                        <span>{format.toUpperCase()} export for {audience}</span>
                    </div>
                    <Button onClick={handleExport} disabled={exporting || selectedModules.length === 0} className="gap-2">
                        <Download className="h-4 w-4" />
                        {exporting ? "Exporting..." : "Export Now"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
