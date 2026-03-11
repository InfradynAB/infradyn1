"use client";

import { useState, useCallback } from "react";
import type {
    DisciplineSummaryRow,
    MaterialClassRow,
    MaterialClassDetailRow,
} from "@/lib/actions/delivery-analytics";
import { getDisciplineLabel } from "@/lib/constants/material-categories";
import { StatusBadge } from "./status-badge";
import { DeliveryBatchTimeline } from "./delivery-batch-timeline";
import { AlertTriangle, ChevronRight, Package } from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function progressPercent(delivered: number, required: number): number {
    if (required === 0) return 100;
    return Math.min(100, Math.round((delivered / required) * 100));
}

function ProgressBar({ value, status }: { value: number; status: string }) {
    const colour =
        status === "LATE"
            ? "bg-red-500"
            : status === "AT_RISK"
                ? "bg-amber-400"
                : "bg-emerald-500";

    return (
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted/60">
            <div
                className={`h-full rounded-full transition-all ${colour}`}
                style={{ width: `${value}%` }}
            />
        </div>
    );
}

async function fetchLevel2(
    projectId: string,
    discipline: string,
): Promise<MaterialClassRow[]> {
    const res = await fetch(
        `/api/dashboard/delivery-categories?projectId=${projectId}&discipline=${encodeURIComponent(discipline)}`,
    );
    const json = await res.json();
    return json.success ? json.data : [];
}

async function fetchLevel3(
    projectId: string,
    discipline: string,
    materialClass: string,
): Promise<MaterialClassDetailRow[]> {
    const res = await fetch(
        `/api/dashboard/delivery-categories?projectId=${projectId}&discipline=${encodeURIComponent(discipline)}&materialClass=${encodeURIComponent(materialClass)}`,
    );
    const json = await res.json();
    return json.success ? json.data : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// L3 INLINE TIMELINE ROW
// ─────────────────────────────────────────────────────────────────────────────

interface L3RowProps {
    projectId: string;
    discipline: string;
    disciplineLabel: string;
    materialClass: string;
    colSpan: number;
    l3Cache: Record<string, MaterialClassDetailRow[]>;
    loadingKeys: Set<string>;
    onFetch: (key: string, rows: MaterialClassDetailRow[]) => void;
    onLoadStart: (key: string) => void;
    onLoadEnd: (key: string) => void;
}

function L3InlineRow({
    projectId,
    discipline,
    disciplineLabel,
    materialClass,
    colSpan,
    l3Cache,
    loadingKeys,
    onFetch,
    onLoadStart,
    onLoadEnd,
}: L3RowProps) {
    const key = `${discipline}::${materialClass}`;
    const rows = l3Cache[key];
    const isLoading = loadingKeys.has(key);

    if (isLoading) {
        return (
            <tr>
                <td colSpan={colSpan} className="px-8 py-4">
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-8 animate-pulse rounded-md bg-muted/40" />
                        ))}
                    </div>
                </td>
            </tr>
        );
    }

    if (!rows) return null;

    return (
        <tr>
            <td colSpan={colSpan} className="px-8 py-4 border-l-2 border-primary/30 bg-muted/10">
                <DeliveryBatchTimeline
                    rows={rows}
                    materialClass={materialClass}
                    disciplineLabel={disciplineLabel}
                />
            </td>
        </tr>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 MATERIAL CLASS SUB-TABLE
// ─────────────────────────────────────────────────────────────────────────────

interface L2SectionProps {
    projectId: string;
    discipline: string;
    disciplineLabel: string;
    rows: MaterialClassRow[];
    colSpan: number;
    expandedMaterialClass: string | null;
    l3Cache: Record<string, MaterialClassDetailRow[]>;
    loadingKeys: Set<string>;
    onMaterialClassClick: (materialClass: string) => void;
    onL3Fetch: (key: string, rows: MaterialClassDetailRow[]) => void;
    onLoadStart: (key: string) => void;
    onLoadEnd: (key: string) => void;
}

function L2Section({
    projectId,
    discipline,
    disciplineLabel,
    rows,
    colSpan,
    expandedMaterialClass,
    l3Cache,
    loadingKeys,
    onMaterialClassClick,
    onL3Fetch,
    onLoadStart,
    onLoadEnd,
}: L2SectionProps) {
    if (rows.length === 0) {
        return (
            <tr>
                <td colSpan={colSpan} className="px-8 py-6 text-center text-sm text-muted-foreground">
                    No material classes found for {disciplineLabel}.
                </td>
            </tr>
        );
    }

    return (
        <>
            {rows.map((row) => {
                const isExpanded = expandedMaterialClass === row.materialClass;
                const l3Key = `${discipline}::${row.materialClass}`;
                const isLoadingL3 = loadingKeys.has(l3Key);

                return (
                    <>
                        <tr
                            key={`mc-${row.materialClass}`}
                            className="group cursor-pointer border-t border-border/30 bg-muted/5 transition-colors hover:bg-muted/30"
                            onClick={() => onMaterialClassClick(row.materialClass)}
                        >
                            {/* Indent + name */}
                            <td className="py-2.5 pr-4 pl-10">
                                <div className="flex items-center gap-2">
                                    <ChevronRight
                                        className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-foreground">
                                            {row.materialClass}
                                        </div>
                                        {row.purchaseOrders && row.purchaseOrders.length > 0 && (
                                            <div className="mt-0.5 flex flex-wrap gap-2 text-xs">
                                                {row.purchaseOrders.slice(0, 3).map((po) => (
                                                    <Link
                                                        key={po.id}
                                                        href={`/dashboard/procurement/${po.id}/edit?step=boq`}
                                                        className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {po.poNumber}
                                                    </Link>
                                                ))}
                                                {row.purchaseOrders.length > 3 && (
                                                    <span className="text-muted-foreground">
                                                        +{row.purchaseOrders.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>

                            {/* Status */}
                            <td className="py-2.5 pr-4">
                                <StatusBadge status={row.status} lateDays={row.lateDays} compact />
                            </td>

                            {/* Delivered / Required */}
                            <td className="py-2.5 pr-4 tabular-nums text-xs text-zinc-300">
                                {row.deliveredQty.toLocaleString()} / {row.requiredQty.toLocaleString()}
                            </td>

                            {/* Schedule impact */}
                            <td className="py-2.5 pr-4 tabular-nums text-xs text-zinc-300">
                                {row.status === "LATE" && row.lateDays > 0
                                    ? `+${row.lateDays}d`
                                    : row.status === "AT_RISK"
                                        ? "Buffer"
                                        : "—"}
                            </td>

                            {/* Trend */}
                            <td className="py-2.5 pr-4 text-xs text-zinc-400">
                                {row.trend === "IMPROVING"
                                    ? "Improving"
                                    : row.trend === "DETERIORATING"
                                        ? "Deteriorating"
                                        : row.trend === "STABLE"
                                            ? "Stable"
                                            : "—"}
                            </td>

                            {/* Progress — empty cell to align with L1 */}
                            <td className="py-2.5 pr-4" />

                            {/* Item count */}
                            <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                                {row.itemCount}
                            </td>

                            {/* Value at risk — empty cell */}
                            <td className="py-2.5 pr-4 text-right tabular-nums text-xs text-foreground">
                                —
                            </td>

                            {/* Loading / chevron */}
                            <td className="py-2.5 pl-2 text-muted-foreground">
                                {isLoadingL3 ? (
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                                ) : (
                                    <ChevronRight
                                        className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                    />
                                )}
                            </td>
                        </tr>

                        {/* L3 inline expansion */}
                        {isExpanded && (
                            <L3InlineRow
                                key={`l3-${row.materialClass}`}
                                projectId={projectId}
                                discipline={discipline}
                                disciplineLabel={disciplineLabel}
                                materialClass={row.materialClass}
                                colSpan={colSpan}
                                l3Cache={l3Cache}
                                loadingKeys={loadingKeys}
                                onFetch={onL3Fetch}
                                onLoadStart={onLoadStart}
                                onLoadEnd={onLoadEnd}
                            />
                        )}
                    </>
                );
            })}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TABLE
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    rows: DisciplineSummaryRow[];
    projectId: string;
}

const COL_SPAN = 9;

export function DisciplineSummaryTable({ rows, projectId }: Props) {
    const [expandedDiscipline, setExpandedDiscipline] = useState<string | null>(null);
    const [expandedMaterialClass, setExpandedMaterialClass] = useState<string | null>(null);
    const [l2Cache, setL2Cache] = useState<Record<string, MaterialClassRow[]>>({});
    const [l3Cache, setL3Cache] = useState<Record<string, MaterialClassDetailRow[]>>({});
    const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

    const addLoadingKey = useCallback((key: string) => {
        setLoadingKeys((prev) => new Set(prev).add(key));
    }, []);

    const removeLoadingKey = useCallback((key: string) => {
        setLoadingKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    }, []);

    const handleDisciplineClick = useCallback(
        async (discipline: string) => {
            if (expandedDiscipline === discipline) {
                setExpandedDiscipline(null);
                setExpandedMaterialClass(null);
                return;
            }

            setExpandedDiscipline(discipline);
            setExpandedMaterialClass(null);

            if (l2Cache[discipline]) return;

            addLoadingKey(discipline);
            try {
                const data = await fetchLevel2(projectId, discipline);
                setL2Cache((prev) => ({ ...prev, [discipline]: data }));
            } finally {
                removeLoadingKey(discipline);
            }
        },
        [expandedDiscipline, l2Cache, projectId, addLoadingKey, removeLoadingKey],
    );

    const handleMaterialClassClick = useCallback(
        async (materialClass: string) => {
            if (!expandedDiscipline) return;

            if (expandedMaterialClass === materialClass) {
                setExpandedMaterialClass(null);
                return;
            }

            setExpandedMaterialClass(materialClass);

            const key = `${expandedDiscipline}::${materialClass}`;
            if (l3Cache[key]) return;

            addLoadingKey(key);
            try {
                const data = await fetchLevel3(projectId, expandedDiscipline, materialClass);
                setL3Cache((prev) => ({ ...prev, [key]: data }));
            } finally {
                removeLoadingKey(key);
            }
        },
        [expandedDiscipline, expandedMaterialClass, l3Cache, projectId, addLoadingKey, removeLoadingKey],
    );

    const handleL3Fetch = useCallback(
        (key: string, data: MaterialClassDetailRow[]) => {
            setL3Cache((prev) => ({ ...prev, [key]: data }));
        },
        [],
    );

    const hasAnyItems = rows.some((r) => r.itemCount > 0 || r.uncategorisedCount > 0);
    if (!hasAnyItems) {
        return (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Package className="h-8 w-8 opacity-40" />
                <p className="text-sm">No categorised BOQ items found in this project.</p>
                <p className="text-xs opacity-60">
                    Assign a discipline to BOQ items when creating or editing a PO.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="pb-3 pr-4">Discipline</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Delivered / Required</th>
                        <th className="pb-3 pr-4">Schedule Impact</th>
                        <th className="pb-3 pr-4">Trend</th>
                        <th className="pb-3 pr-4">Progress</th>
                        <th className="pb-3 pr-4">Items</th>
                        <th className="pb-3 pr-4 text-right">Value at Risk</th>
                        <th className="pb-3" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                    {rows.map((row) => {
                        const pct = progressPercent(row.deliveredQty, row.requiredQty);
                        const isUncategorised = row.discipline === "UNCATEGORISED";
                        const isExpanded = expandedDiscipline === row.discipline;
                        const isLoadingL2 = loadingKeys.has(row.discipline);
                        const disciplineLabel = getDisciplineLabel(row.discipline);

                        return (
                            <>
                                <tr
                                    key={row.discipline}
                                    className="group cursor-pointer transition-colors hover:bg-muted/40"
                                    onClick={() => handleDisciplineClick(row.discipline)}
                                >
                                    {/* Discipline name */}
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <ChevronRight
                                                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                            />
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    {row.disciplineLabel}
                                                </div>
                                                {isUncategorised && (
                                                    <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        {row.uncategorisedCount} item
                                                        {row.uncategorisedCount !== 1 ? "s" : ""} need
                                                        classification
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Status badge */}
                                    <td className="py-3 pr-4">
                                        <StatusBadge
                                            status={row.status}
                                            lateDays={row.lateDays}
                                            compact
                                        />
                                    </td>

                                    {/* Delivered / Required */}
                                    <td className="py-3 pr-4 tabular-nums text-zinc-300">
                                        {row.deliveredQty.toLocaleString()} /{" "}
                                        {row.requiredQty.toLocaleString()}
                                    </td>

                                    {/* Schedule impact */}
                                    <td className="py-3 pr-4 tabular-nums text-zinc-300">
                                        {row.status === "LATE" && row.lateDays > 0
                                            ? `+${row.lateDays}d`
                                            : row.status === "AT_RISK"
                                                ? "Buffer"
                                                : "—"}
                                    </td>

                                    {/* Trend */}
                                    <td className="py-3 pr-4 text-zinc-400">
                                        {row.trend === "IMPROVING"
                                            ? "Improving"
                                            : row.trend === "DETERIORATING"
                                                ? "Deteriorating"
                                                : row.trend === "STABLE"
                                                    ? "Stable"
                                                    : "—"}
                                    </td>

                                    {/* Progress bar */}
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <ProgressBar value={pct} status={row.status} />
                                            <span className="text-xs tabular-nums text-muted-foreground">
                                                {pct}%
                                            </span>
                                        </div>
                                    </td>

                                    {/* Item count */}
                                    <td className="py-3 pr-4 text-muted-foreground">{row.itemCount}</td>

                                    {/* Value at risk */}
                                    <td className="py-3 pr-4 text-right tabular-nums text-foreground">
                                        {row.valueAtRisk > 0
                                            ? `$${row.valueAtRisk.toLocaleString(undefined, {
                                                maximumFractionDigits: 0,
                                            })}`
                                            : "—"}
                                    </td>

                                    {/* Loading spinner / chevron */}
                                    <td className="py-3 pl-2 text-muted-foreground">
                                        {isLoadingL2 ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                                        ) : (
                                            <ChevronRight
                                                className={`h-4 w-4 transition-transform duration-200 group-hover:text-foreground ${isExpanded ? "rotate-90" : ""}`}
                                            />
                                        )}
                                    </td>
                                </tr>

                                {/* L2 expansion — loading skeleton */}
                                {isExpanded && isLoadingL2 && (
                                    <tr key={`l2-loading-${row.discipline}`}>
                                        <td colSpan={COL_SPAN} className="px-10 py-3">
                                            <div className="space-y-2">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="h-8 animate-pulse rounded-md bg-muted/40" />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {/* L2 expansion — material class sub-rows */}
                                {isExpanded && !isLoadingL2 && l2Cache[row.discipline] && (
                                    <L2Section
                                        key={`l2-${row.discipline}`}
                                        projectId={projectId}
                                        discipline={row.discipline}
                                        disciplineLabel={disciplineLabel}
                                        rows={l2Cache[row.discipline]}
                                        colSpan={COL_SPAN}
                                        expandedMaterialClass={expandedMaterialClass}
                                        l3Cache={l3Cache}
                                        loadingKeys={loadingKeys}
                                        onMaterialClassClick={handleMaterialClassClick}
                                        onL3Fetch={handleL3Fetch}
                                        onLoadStart={addLoadingKey}
                                        onLoadEnd={removeLoadingKey}
                                    />
                                )}
                            </>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
