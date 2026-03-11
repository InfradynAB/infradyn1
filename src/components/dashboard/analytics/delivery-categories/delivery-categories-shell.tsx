"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { DisciplineSummaryRow } from "@/lib/actions/delivery-analytics";
import { DisciplineSummaryTable } from "./discipline-summary-table";

async function fetchLevel1(projectId: string): Promise<DisciplineSummaryRow[]> {
    const res = await fetch(`/api/dashboard/delivery-categories?projectId=${projectId}`);
    const json = await res.json();
    return json.success ? json.data : [];
}

export function DeliveryCategoriesShell() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId");
    const hasProject = Boolean(projectId);

    const [l1Data, setL1Data] = useState<DisciplineSummaryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setL1Data([]);
        setError(null);
        setLoading(false);
    }, [projectId]);

    const loadData = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchLevel1(projectId);
            setL1Data(data);
        } catch {
            setError("Failed to load delivery data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (!projectId) return;
        loadData();
    }, [loadData, projectId]);

    return (
        <div className="space-y-5">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-foreground">
                        Delivery by Category
                    </h3>
                    <p className="text-sm text-muted-foreground">All Disciplines</p>
                </div>

                <button
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40"
                    disabled={loading || !hasProject}
                    onClick={loadData}
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {!hasProject && (
                <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                    <p className="text-sm">No project selected.</p>
                    <p className="text-xs opacity-60">Select a project to view delivery analytics.</p>
                </div>
            )}

            {hasProject && error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {hasProject && loading && (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-10 animate-pulse rounded-md bg-muted/40"
                        />
                    ))}
                </div>
            )}

            {hasProject && !loading && !error && (
                <DisciplineSummaryTable
                    rows={l1Data}
                    projectId={projectId!}
                />
            )}
        </div>
    );
}
