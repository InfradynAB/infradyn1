"use client";

import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, FileText, CheckCircle } from "@phosphor-icons/react";
import {
    SectionHeader, ViewToggle, StatusPill,
    mockDocuments, mockComplianceData,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";
import { ComplianceGauge } from "@/components/dashboard/supplier/charts/compliance-gauge";
import { DocumentGrid } from "@/components/dashboard/supplier/charts/document-grid";

export default function CompliancePage() {
    const complianceData = mockComplianceData();
    const documents = mockDocuments();
    const { searchQuery, statusFilter } = useAnalyticsFilters();
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
    const toggleView = useCallback((_s: string, mode: "chart" | "table") => setViewMode(mode), []);

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
                                <TableHead className="text-[10px] font-bold uppercase">Document</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Uploaded</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Expiry</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDocs.map(doc => (
                                <TableRow key={doc.id} className="text-xs hover:bg-muted/20">
                                    <TableCell className="font-medium flex items-center gap-2"><FileText weight="fill" className="h-4 w-4 text-muted-foreground" />{doc.type}</TableCell>
                                    <TableCell><StatusPill status={doc.status} /></TableCell>
                                    <TableCell>{doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</TableCell>
                                    <TableCell>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
