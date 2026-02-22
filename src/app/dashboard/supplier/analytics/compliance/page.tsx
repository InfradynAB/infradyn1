"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, FileText, CheckCircle, DotsSixVertical } from "@phosphor-icons/react";
import {
    SectionHeader, ViewToggle, StatusPill,
    mockDocuments, mockComplianceData,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";
import { ComplianceGauge } from "@/components/dashboard/supplier/charts/compliance-gauge";
import { DocumentGrid } from "@/components/dashboard/supplier/charts/document-grid";

function reorderCols(
    arr: string[], from: string, to: string, setter: (val: string[]) => void
) {
    const next = [...arr]; const fi = next.indexOf(from); const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return; next.splice(fi, 1); next.splice(ti, 0, from); setter(next);
}

export default function CompliancePage() {
    const complianceData = mockComplianceData();
    const documents = mockDocuments();
    const { searchQuery, statusFilter } = useAnalyticsFilters();
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
    const toggleView = useCallback((_s: string, mode: "chart" | "table") => setViewMode(mode), []);
    const [complCols, setComplCols] = useState(["docType", "docStatus", "uploaded", "expiry"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const filteredDocs = useMemo(() => {
        let items = documents;
        if (searchQuery) items = items.filter(d => d.type.toLowerCase().includes(searchQuery.toLowerCase()));
        if (statusFilter !== "all") {
            items = items.filter(d => d.status === statusFilter);
        }
        return items;
    }, [documents, searchQuery, statusFilter]);

    const validCount = documents.filter(d => d.status === "valid").length;
    const expiringCount = documents.filter(d => d.status === "expiring").length;
    const missingCount = documents.filter(d => d.status === "missing").length;
    const expiredCount = documents.filter(d => d.status === "expired").length;

    const COMPL_DEF: Record<string, { label: string; cell: (doc: (typeof filteredDocs)[number]) => ReactNode }> = {
        docType:   { label: "Document", cell: (doc) => <span className="font-medium flex items-center gap-2"><FileText weight="fill" className="h-4 w-4 text-muted-foreground" />{doc.type}</span> },
        docStatus: { label: "Status",   cell: (doc) => <StatusPill status={doc.status} /> },
        uploaded:  { label: "Uploaded", cell: (doc) => <span>{doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "\u2014"}</span> },
        expiry:    { label: "Expiry",   cell: (doc) => <span>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "\u2014"}</span> },
    };

    return (
        <div className="space-y-5">
            <SectionHeader
                icon={ShieldCheck}
                iconBg="bg-teal-100 dark:bg-teal-500/20"
                iconColor="text-teal-600 dark:text-teal-400"
                title="Compliance"
                subtitle={`${complianceData.overallScore}% compliant`}
                badge={complianceData.overallScore < 80 ? { label: "Action Needed", variant: "destructive" } : undefined}
                rightContent={<ViewToggle section="compliance" current={viewMode} onChange={toggleView} />}
            />

            {viewMode === "chart" ? (
                <div className="grid gap-5 lg:grid-cols-2">
                    {/* Gauge */}
                    <Card className="rounded-2xl border-border/60 bg-card p-5 flex flex-col items-center">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Overall Compliance Score</p>
                        <ComplianceGauge data={complianceData} />
                        <div className="flex items-center gap-4 mt-4 text-[10px] font-medium">
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle weight="fill" className="h-3 w-3" />{validCount} Valid</span>
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">{expiringCount} Expiring</span>
                            <span className="flex items-center gap-1 text-red-500">{missingCount + expiredCount} Missing/Expired</span>
                        </div>
                    </Card>

                    {/* Documents grid */}
                    <Card className="rounded-2xl border-border/60 bg-card p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">Required Documents</p>
                        <DocumentGrid documents={filteredDocs} />
                    </Card>
                </div>
            ) : (
                <Card className="rounded-2xl border-border/60 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                {complCols.map((col) => (
                                    <TableHead key={col} draggable
                                        onDragStart={() => setDragCol(col)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                        onDragEnd={() => { reorderCols(complCols, dragCol!, dragOverCol!, setComplCols); setDragCol(null); setDragOverCol(null); }}
                                        className={["cursor-grab active:cursor-grabbing select-none text-[10px] font-bold uppercase", dragCol === col ? "opacity-40 bg-muted/60" : "", dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
                                    >
                                        <span className="flex items-center gap-1"><DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{COMPL_DEF[col].label}</span>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDocs.map(doc => (
                                <TableRow key={doc.id} className="text-xs hover:bg-muted/20">
                                    {complCols.map((col) => (<TableCell key={col}>{COMPL_DEF[col].cell(doc)}</TableCell>))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
