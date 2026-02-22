"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
    ChartBar,
    Rows,
    Faders,
    MagnifyingGlass,
    DownloadSimple,
    CaretLeft,
    CaretRight,
    X,
    FloppyDisk,
    Lightbulb,
} from "@phosphor-icons/react";
import { exportTabularData } from "@/lib/export-engine";

type RowData = Record<string, string | number | boolean | null | undefined>;

export type PODatasetKey =
    | "invoices"
    | "deliveries"
    | "boq"
    | "changeOrders"
    | "documents"
    | "quality"
    | "history"
    | "conflicts";

export interface PODetailWorkspaceProps {
    children: React.ReactNode;
    datasets: Record<PODatasetKey, RowData[]>;
    initialMode?: "analytics" | "table";
    initialDataset?: PODatasetKey;
    initialSearch?: string;
}

type ViewPreset = "default" | "finance" | "delivery" | "custom";

const DATASET_LABELS: Record<PODatasetKey, string> = {
    invoices: "Invoices",
    deliveries: "Deliveries",
    boq: "BOQ / Scope",
    changeOrders: "Change Orders",
    documents: "Documents",
    quality: "Quality",
    history: "History",
    conflicts: "Conflicts",
};

const DATASET_TO_TAB: Record<PODatasetKey, string> = {
    invoices: "financials",
    deliveries: "progress",
    boq: "boq",
    changeOrders: "change-orders",
    documents: "gallery",
    quality: "quality",
    history: "history",
    conflicts: "conflicts",
};

export function PODetailWorkspace({
    children,
    datasets,
    initialMode = "analytics",
    initialDataset = "invoices",
    initialSearch = "",
}: PODetailWorkspaceProps) {
    const [mode, setMode] = useState<"analytics" | "table">(initialMode);
    const [activeDataset, setActiveDataset] = useState<PODatasetKey>(initialDataset);
    const [search, setSearch] = useState(initialSearch);
    const [showViewExplanation, setShowViewExplanation] = useState(false);

    const datasetRows = useMemo(() => datasets[activeDataset] || [], [datasets, activeDataset]);

    const allColumns = useMemo(() => {
        const keySet = new Set<string>();
        for (const row of datasetRows) {
            Object.keys(row).forEach((key) => keySet.add(key));
        }
        return Array.from(keySet);
    }, [datasetRows]);

    const [selectedPreset, setSelectedPreset] = useState<Partial<Record<PODatasetKey, ViewPreset>>>({});
    const [manualColumns, setManualColumns] = useState<Partial<Record<PODatasetKey, string[]>>>({});
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [customViews, setCustomViews] = useState<Partial<Record<PODatasetKey, string[]>>>(() => {
        if (typeof window === "undefined") return {};
        try {
            const raw = window.localStorage.getItem("po-detail-custom-views-v1");
            if (!raw) return {};
            return JSON.parse(raw) as Partial<Record<PODatasetKey, string[]>>;
        } catch {
            return {};
        }
    });

    const currentPreset = selectedPreset[activeDataset] || "default";

    const datasetVisibleCols = useMemo(() => {
        if (currentPreset === "custom") {
            return manualColumns[activeDataset] || customViews[activeDataset] || allColumns;
        }
        return getPresetColumns(allColumns, currentPreset);
    }, [activeDataset, allColumns, currentPreset, manualColumns, customViews]);

    const filteredRows = useMemo(() => {
        if (!search.trim()) return datasetRows;
        const query = search.toLowerCase();
        return datasetRows.filter((row) =>
            Object.values(row)
                .map((value) => String(value ?? "").toLowerCase())
                .some((value) => value.includes(query))
        );
    }, [datasetRows, search]);

    const viewExplanation = useMemo(() => {
        const presetText = currentPreset === "custom" ? "custom" : `${currentPreset} preset`;
        const queryText = search.trim() ? ` with search term "${search.trim()}"` : " without search filtering";
        return `You are viewing ${DATASET_LABELS[activeDataset]} in table mode using ${presetText}${queryText}. ${filteredRows.length.toLocaleString()} row(s) match across ${datasetVisibleCols.length} visible column(s).`;
    }, [activeDataset, currentPreset, search, filteredRows.length, datasetVisibleCols.length]);

    const toggleColumn = (column: string, checked: boolean) => {
        const current = datasetVisibleCols;
        const next = checked
            ? Array.from(new Set([...current, column]))
            : current.filter((col) => col !== column);

        setSelectedPreset((prev) => ({ ...prev, [activeDataset]: "custom" }));
        setManualColumns((prev) => ({ ...prev, [activeDataset]: next }));
    };

    const showAllColumns = () => {
        setSelectedPreset((prev) => ({ ...prev, [activeDataset]: "custom" }));
        setManualColumns((prev) => ({ ...prev, [activeDataset]: allColumns }));
    };

    const hideAllColumns = () => {
        setSelectedPreset((prev) => ({ ...prev, [activeDataset]: "custom" }));
        setManualColumns((prev) => ({ ...prev, [activeDataset]: [] }));
    };

    const applyPreset = (preset: ViewPreset) => {
        setSelectedPreset((prev) => ({ ...prev, [activeDataset]: preset }));
        if (preset === "custom" && !manualColumns[activeDataset] && customViews[activeDataset]) {
            setManualColumns((prev) => ({ ...prev, [activeDataset]: customViews[activeDataset] }));
        }
    };

    const saveCustomView = () => {
        const nextCustomViews = {
            ...customViews,
            [activeDataset]: datasetVisibleCols,
        };
        setCustomViews(nextCustomViews);
        setSelectedPreset((prev) => ({ ...prev, [activeDataset]: "custom" }));
        setManualColumns((prev) => ({ ...prev, [activeDataset]: datasetVisibleCols }));
        try {
            window.localStorage.setItem("po-detail-custom-views-v1", JSON.stringify(nextCustomViews));
        } catch {
        }
    };

    const moveColumn = (column: string, direction: "left" | "right") => {
        const current = [...datasetVisibleCols];
        const index = current.indexOf(column);
        if (index < 0) return;

        const targetIndex = direction === "left" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= current.length) return;

        [current[index], current[targetIndex]] = [current[targetIndex], current[index]];
        setSelectedPreset((prev) => ({ ...prev, [activeDataset]: "custom" }));
        setManualColumns((prev) => ({ ...prev, [activeDataset]: current }));
    };

    const reorderColumns = (fromColumn: string, toColumn: string) => {
        const current = [...datasetVisibleCols];
        const fromIndex = current.indexOf(fromColumn);
        const toIndex = current.indexOf(toColumn);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

        current.splice(fromIndex, 1);
        current.splice(toIndex, 0, fromColumn);
        setSelectedPreset((prev) => ({ ...prev, [activeDataset]: "custom" }));
        setManualColumns((prev) => ({ ...prev, [activeDataset]: current }));
    };

    const handleExport = async (format: "csv" | "excel" | "pdf") => {
        await exportTabularData({
            fileName: `po-${activeDataset}-view`,
            title: `${DATASET_LABELS[activeDataset]} Export`,
            format,
            columns: datasetVisibleCols.map((column) => ({ key: column, label: prettyLabel(column) })),
            rows: filteredRows,
        });
    };

    return (
        <div className="space-y-4">
            <Card className="border-border/70">
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base">PO Workspace View</CardTitle>
                            <CardDescription>
                                Switch between analytics dashboards and manipulatable table mode.
                            </CardDescription>
                        </div>
                        <div className="inline-flex items-center rounded-xl border border-border/60 bg-muted/30 p-1">
                            <button
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                                    mode === "analytics"
                                        ? "bg-[#0E7490] text-white"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => setMode("analytics")}
                            >
                                <ChartBar className="h-3.5 w-3.5" weight="duotone" />
                                Analytics
                            </button>
                            <button
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                                    mode === "table"
                                        ? "bg-[#0E7490] text-white"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => setMode("table")}
                            >
                                <Rows className="h-3.5 w-3.5" weight="duotone" />
                                Table
                            </button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {mode === "analytics" ? (
                children
            ) : (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {(Object.keys(DATASET_LABELS) as PODatasetKey[]).map((key) => (
                                    <Button
                                        key={key}
                                        variant={activeDataset === key ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "rounded-lg",
                                            activeDataset === key && "bg-[#0E7490] text-white hover:bg-[#0E7490]/90"
                                        )}
                                        onClick={() => {
                                            setActiveDataset(key);
                                            setSearch("");
                                        }}
                                    >
                                        {DATASET_LABELS[key]}
                                        <Badge variant="secondary" className="ml-2 text-[10px]">
                                            {(datasets[key] || []).length}
                                        </Badge>
                                    </Button>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/20 p-1">
                                    {(["default", "finance", "delivery", "custom"] as ViewPreset[]).map((preset) => (
                                        <button
                                            key={preset}
                                            onClick={() => applyPreset(preset)}
                                            className={cn(
                                                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                                currentPreset === preset
                                                    ? "bg-[#0E7490] text-white"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {prettyLabel(preset)}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative min-w-60 flex-1">
                                    <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={`Search ${DATASET_LABELS[activeDataset]}...`}
                                        className="h-9 pl-8"
                                    />
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-9 rounded-lg">
                                            <Faders className="mr-1.5 h-3.5 w-3.5" weight="duotone" />
                                            Columns
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64">
                                        <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {allColumns.map((column) => (
                                            <DropdownMenuCheckboxItem
                                                key={column}
                                                checked={datasetVisibleCols.includes(column)}
                                                onCheckedChange={(checked) => toggleColumn(column, Boolean(checked))}
                                            >
                                                {prettyLabel(column)}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <div className="flex items-center gap-1 px-2 pb-2">
                                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={showAllColumns}>Show all</Button>
                                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={hideAllColumns}>Hide all</Button>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={saveCustomView}>
                                    <FloppyDisk className="mr-1.5 h-3.5 w-3.5" weight="duotone" />
                                    Save Custom
                                </Button>

                                <Button asChild variant="outline" size="sm" className="h-9 rounded-lg">
                                    <Link href={`?tab=${DATASET_TO_TAB[activeDataset]}&view=analytics`}>
                                        Open Section
                                    </Link>
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-9 rounded-lg">
                                            <DownloadSimple className="mr-1.5 h-3.5 w-3.5" weight="duotone" />
                                            Export view
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                        <DropdownMenuLabel>Export format</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => void handleExport("pdf")}>PDF</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => void handleExport("excel")}>Excel (.xlsx)</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => void handleExport("csv")}>CSV</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-lg"
                                    onClick={() => setShowViewExplanation((prev) => !prev)}
                                >
                                    <Lightbulb className="mr-1.5 h-3.5 w-3.5" weight="duotone" />
                                    Explain View
                                </Button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                                {datasetVisibleCols.map((column, index) => (
                                    <div
                                        key={column}
                                        className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/20 px-2 py-1"
                                        draggable
                                        onDragStart={() => setDraggedColumn(column)}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={() => {
                                            if (draggedColumn) reorderColumns(draggedColumn, column);
                                            setDraggedColumn(null);
                                        }}
                                        onDragEnd={() => setDraggedColumn(null)}
                                    >
                                        <span className="text-[11px] font-medium">{prettyLabel(column)}</span>
                                        <button
                                            type="button"
                                            onClick={() => moveColumn(column, "left")}
                                            disabled={index === 0}
                                            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                                            aria-label={`Move ${column} left`}
                                        >
                                            <CaretLeft className="h-3 w-3" weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveColumn(column, "right")}
                                            disabled={index === datasetVisibleCols.length - 1}
                                            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                                            aria-label={`Move ${column} right`}
                                        >
                                            <CaretRight className="h-3 w-3" weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleColumn(column, false)}
                                            className="rounded p-0.5 text-muted-foreground hover:text-red-600"
                                            aria-label={`Hide ${column}`}
                                        >
                                            <X className="h-3 w-3" weight="bold" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-3">
                                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dataset</p>
                                    <p className="text-sm font-semibold">{DATASET_LABELS[activeDataset]}</p>
                                </div>
                                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rows (Filtered)</p>
                                    <p className="text-sm font-semibold font-mono">{filteredRows.length.toLocaleString()}</p>
                                </div>
                                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Columns Visible</p>
                                    <p className="text-sm font-semibold font-mono">{datasetVisibleCols.length}</p>
                                </div>
                            </div>

                            {showViewExplanation && (
                                <div className="rounded-lg border border-[#0E7490]/25 bg-[#0E7490]/5 px-3 py-2 text-sm text-muted-foreground">
                                    {viewExplanation}
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent>
                        {datasetVisibleCols.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                                No columns selected. Use Columns menu to add fields.
                            </div>
                        ) : (
                            <div className="rounded-lg border border-border/70 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            {datasetVisibleCols.map((col) => (
                                                <TableHead
                                                    key={col}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        setDraggedColumn(col);
                                                        e.dataTransfer.effectAllowed = "move";
                                                        e.dataTransfer.setData("text/plain", col);
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = "move";
                                                        if (col !== draggedColumn) setDragOverColumn(col);
                                                    }}
                                                    onDragLeave={() => setDragOverColumn(null)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (draggedColumn && draggedColumn !== col) {
                                                            reorderColumns(draggedColumn, col);
                                                        }
                                                        setDraggedColumn(null);
                                                        setDragOverColumn(null);
                                                    }}
                                                    onDragEnd={() => {
                                                        setDraggedColumn(null);
                                                        setDragOverColumn(null);
                                                    }}
                                                    className={cn(
                                                        "whitespace-nowrap text-xs font-semibold uppercase tracking-wide select-none transition-colors",
                                                        "cursor-grab active:cursor-grabbing",
                                                        draggedColumn === col && "opacity-40 bg-muted/60",
                                                        dragOverColumn === col && draggedColumn !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]"
                                                    )}
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="10" height="10" viewBox="0 0 256 256"
                                                            className="shrink-0 text-muted-foreground/50"
                                                            fill="currentColor"
                                                            aria-hidden="true"
                                                        >
                                                            <path d="M104,60a12,12,0,1,1-12-12A12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"/>
                                                        </svg>
                                                        {prettyLabel(col)}
                                                    </span>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRows.slice(0, 500).map((row, index) => (
                                            <TableRow key={`${activeDataset}-${index}`}>
                                                {datasetVisibleCols.map((col) => (
                                                    <TableCell key={`${activeDataset}-${index}-${col}`} className="text-xs whitespace-nowrap">
                                                        {formatValue(row[col])}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                        {filteredRows.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={datasetVisibleCols.length} className="py-8 text-center text-sm text-muted-foreground">
                                                    No rows found for this dataset.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function getPresetColumns(allColumns: string[], preset: Exclude<ViewPreset, "custom">): string[] {
    if (preset === "default") return allColumns;

    const financeRegex = /(amount|paid|pending|overdue|retained|cost|price|currency|total|value|payment|invoice|delta)/i;
    const deliveryRegex = /(milestone|progress|status|delivery|date|reported|deviation|critical|sla|forecast)/i;

    if (preset === "finance") {
        const financeColumns = allColumns.filter((column) => financeRegex.test(column));
        return financeColumns.length ? financeColumns : allColumns;
    }

    const deliveryColumns = allColumns.filter((column) => deliveryRegex.test(column));
    return deliveryColumns.length ? deliveryColumns : allColumns;
}

function prettyLabel(value: string) {
    return value
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
}
