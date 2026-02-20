"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, RefreshCw } from "lucide-react";
import type {
    DisciplineSummaryRow,
    MaterialClassRow,
    MaterialClassDetailRow,
} from "@/lib/actions/delivery-analytics";
import { getDisciplineLabel } from "@/lib/constants/material-categories";
import { DisciplineSummaryTable } from "./discipline-summary-table";
import { MaterialClassTable } from "./material-class-table";
import { DeliveryBatchTimeline } from "./delivery-batch-timeline";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Level = 1 | 2 | 3;

interface DrillState {
    level: Level;
    discipline: string | null;
    materialClass: string | null;
}

// No prop needed — projectId is read from the URL query string,
// matching the pattern used by all other analytics panels.

// ─────────────────────────────────────────────────────────────────────────────
// BREADCRUMB
// ─────────────────────────────────────────────────────────────────────────────

interface BreadcrumbProps {
    drill: DrillState;
    onNavigate: (level: Level) => void;
}

function Breadcrumb({ drill, onNavigate }: BreadcrumbProps) {
    return (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <button
                className="transition-colors hover:text-foreground"
                onClick={() => onNavigate(1)}
            >
                All Disciplines
            </button>

            {drill.discipline && (
                <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <button
                        className={`transition-colors hover:text-foreground ${drill.level === 2 ? "text-foreground" : ""
                            }`}
                        onClick={() => onNavigate(2)}
                    >
                        {getDisciplineLabel(drill.discipline)}
                    </button>
                </>
            )}

            {drill.materialClass && (
                <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-foreground">{drill.materialClass}</span>
                </>
            )}
        </nav>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function fetchLevel1(projectId: string): Promise<DisciplineSummaryRow[]> {
    const res = await fetch(`/api/dashboard/delivery-categories?projectId=${projectId}`);
    const json = await res.json();
    return json.success ? json.data : [];
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
// MAIN SHELL
// ─────────────────────────────────────────────────────────────────────────────

export function DeliveryCategoriesShell() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId");
    const [drill, setDrill] = useState<DrillState>({
        level: 1,
        discipline: null,
        materialClass: null,
    });

    const [l1Data, setL1Data] = useState<DisciplineSummaryRow[]>([]);
    const [l2Data, setL2Data] = useState<MaterialClassRow[]>([]);
    const [l3Data, setL3Data] = useState<MaterialClassDetailRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Load data whenever drill state changes ──
    const loadData = useCallback(async () => {
        if (!projectId) return;          // narrowed: string from here
        const pid: string = projectId;
        setLoading(true);
        setError(null);
        try {
            if (drill.level === 1) {
                const data = await fetchLevel1(pid);
                setL1Data(data);
            } else if (drill.level === 2 && drill.discipline) {
                const data = await fetchLevel2(pid, drill.discipline);
                setL2Data(data);
            } else if (drill.level === 3 && drill.discipline && drill.materialClass) {
                const data = await fetchLevel3(
                    pid,
                    drill.discipline,
                    drill.materialClass,
                );
                setL3Data(data);
            }
        } catch (e) {
            setError("Failed to load delivery data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [drill, projectId]);

    useEffect(() => {
        if (!projectId) return;
        loadData();
    }, [loadData, projectId]);

    // ── Empty state if no project selected ──
    if (!projectId) {
        return (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <p className="text-sm">No project selected.</p>
                <p className="text-xs opacity-60">Select a project to view delivery analytics.</p>
            </div>
        );
    }

    // ── Navigation handlers ──
    const handleDisciplineClick = useCallback((discipline: string) => {
        setDrill({ level: 2, discipline, materialClass: null });
    }, []);

    const handleMaterialClassClick = useCallback(
        (materialClass: string) => {
            setDrill((prev) => ({ ...prev, level: 3, materialClass }));
        },
        [],
    );

    const handleBreadcrumbNav = useCallback((level: Level) => {
        setDrill((prev) => {
            if (level === 1) return { level: 1, discipline: null, materialClass: null };
            if (level === 2) return { ...prev, level: 2, materialClass: null };
            return prev;
        });
    }, []);

    // ── Render ──
    const disciplineLabel = getDisciplineLabel(drill.discipline);

    return (
        <div className="space-y-5">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-foreground">
                        Delivery by Category
                    </h3>
                    <Breadcrumb drill={drill} onNavigate={handleBreadcrumbNav} />
                </div>

                <button
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40"
                    disabled={loading}
                    onClick={loadData}
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Error state */}
            {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-10 animate-pulse rounded-md bg-muted/40"
                        />
                    ))}
                </div>
            )}

            {/* Content */}
            {!loading && !error && (
                <>
                    {drill.level === 1 && (
                        <DisciplineSummaryTable
                            rows={l1Data}
                            onDisciplineClick={handleDisciplineClick}
                        />
                    )}

                    {drill.level === 2 && drill.discipline && (
                        <MaterialClassTable
                            rows={l2Data}
                            disciplineLabel={disciplineLabel}
                            onMaterialClassClick={handleMaterialClassClick}
                        />
                    )}

                    {drill.level === 3 &&
                        drill.discipline &&
                        drill.materialClass && (
                            <DeliveryBatchTimeline
                                rows={l3Data}
                                materialClass={drill.materialClass}
                                disciplineLabel={disciplineLabel}
                            />
                        )}
                </>
            )}
        </div>
    );
}
