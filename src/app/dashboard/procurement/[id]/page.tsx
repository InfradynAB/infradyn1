import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { cn } from "@/lib/utils";
import { getPurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowLeftIcon,
    DownloadSimpleIcon,
    FileTextIcon,
    ClockIcon,
    ChartLineUpIcon,
    ImagesIcon,
    WarningCircleIcon,
    BuildingsIcon,
    CalendarIcon,
    TruckIcon,
} from "@phosphor-icons/react/dist/ssr";
import { format } from "date-fns";
import { ImportBOQDialog } from "@/components/procurement/import-boq-dialog";
import { InternalProgressForm } from "@/components/procurement/internal-progress-form";
import { POGallery } from "@/components/procurement/po-gallery";
import { ConflictQueue } from "@/components/procurement/conflict-queue";
import { ConflictResolver } from "@/components/procurement/conflict-resolver";
import { TrustIndicator } from "@/components/shared/trust-indicator";
import { getDocumentsByParentId } from "@/lib/actions/documents";
import {
    extractS3KeyFromUrl,
    getDownloadPresignedUrl
} from "@/lib/services/s3";
// Phase 5 imports
import { InvoiceUploadSheet } from "@/components/procurement/invoice-upload-sheet";
import { ChangeOrderForm } from "@/components/procurement/change-order-form";
import { ChangeOrderSheet } from "@/components/procurement/change-order-sheet";
import { PaymentStatusBadge, COStatusBadge } from "@/components/procurement/payment-status-badge";
import { getPaymentSummary, getPendingInvoices } from "@/lib/actions/finance-engine";
import { getChangeOrdersForPO, getCOImpactSummary } from "@/lib/actions/change-order-engine";
// Phase 5 Revised - Client-Driven CO imports
import { ClientInstructionUpload } from "@/components/procurement/client-instruction-upload";
import { ClientInstructionList } from "@/components/procurement/client-instruction-list";
import {
    CurrencyDollar,
    Receipt,
    ArrowsClockwise,
    CheckCircle,
    Warning,
    ClockCounterClockwise,
} from "@phosphor-icons/react/dist/ssr";
import { COActions, InvoiceActions } from "@/components/procurement/finance-actions";
import { AuditLogTimeline } from "@/components/procurement/audit-log-timeline";
import { MilestoneInvoiceStatus } from "@/components/procurement/milestone-invoice-status";
// Phase 7: NCR/Quality imports
import { POQualityTab } from "@/components/procurement/po-quality-tab";
import { AlertTriangle } from "lucide-react";
import { PizzaTrackerProgress } from "@/components/ui/pizza-tracker-progress";
import { POTabsWrapper } from "@/components/procurement/po-tabs-wrapper";
import { SubmitPOButton } from "@/components/procurement/submit-po-button";
import { POCommandCenter } from "@/components/procurement/po-command-center";
import { POActionsModal } from "@/components/procurement/po-actions-modal";
import { PODetailWorkspace } from "@/components/procurement/po-detail-workspace";

// Status badge colors and icons - Infradyn Design System
const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
    DRAFT: { color: "bg-slate-700 text-white border-slate-800", icon: "🟡", label: "Draft" },
    SUBMITTED: { color: "bg-[#1E293B] text-white border-[#1E293B]", icon: "🔵", label: "Submitted" },
    ACTIVE: { color: "bg-emerald-600 text-white border-emerald-700", icon: "🟢", label: "Approved" },
    COMPLETED: { color: "bg-slate-500 text-white border-slate-600", icon: "⚪", label: "Closed" },
    CANCELLED: { color: "bg-red-600 text-white border-red-700", icon: "🔴", label: "Cancelled" },
};

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("font-medium", mono && "font-mono")}>{value}</p>
        </div>
    );
}

function QuickTabLink({ href, label, hint }: { href: string; label: string; hint: string }) {
    return (
        <Link
            href={href}
            className="flex items-center justify-between rounded-lg border border-[#0F6157]/25 bg-[#0F6157]/5 px-3 py-2.5 transition-colors hover:bg-[#0F6157]/10"
        >
            <span className="text-sm font-medium text-[#0F6157]">{label}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
        </Link>
    );
}

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PODetailPage({ params, searchParams }: PageProps) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const result = await getPurchaseOrder(id);

    if (!result.success || !result.data) {
        notFound();
    }

    const po = result.data;

    // Process all versions to include presigned URLs in parallel
    const versionsWithUrls = await Promise.all(
        (po.versions || []).map(async (v: any) => {
            let downloadUrl = v.fileUrl;
            if (v.fileUrl) {
                const key = extractS3KeyFromUrl(v.fileUrl);
                if (key) {
                    try {
                        downloadUrl = await getDownloadPresignedUrl(key);
                    } catch (e) {
                        console.error(`Failed to generate presigned URL for version ${v.versionNumber}:`, e);
                    }
                }
            }
            return { ...v, downloadUrl };
        })
    );

    const latestVersion = versionsWithUrls[0];
    const downloadUrl = latestVersion?.downloadUrl;

    // Fetch documents for this PO (polymorphic relation) and generate presigned URLs
    const docsResult = await getDocumentsByParentId(po.id, "PO");
    const poDocuments = await Promise.all(
        (docsResult.success ? docsResult.data : []).map(async (doc: any) => {
            let presignedUrl = doc.fileUrl;
            if (doc.fileUrl) {
                const key = extractS3KeyFromUrl(doc.fileUrl);
                if (key) {
                    try {
                        presignedUrl = await getDownloadPresignedUrl(key);
                    } catch (e) {
                        console.error(`Failed to generate presigned URL for ${doc.fileName}:`, e);
                    }
                }
            }
            return { ...doc, fileUrl: presignedUrl };
        })
    );

    // Phase 5: Fetch financial data
    const [paymentResult, invoicesResult, cosResult, coImpactResult] = await Promise.all([
        getPaymentSummary(undefined, po.id),
        getPendingInvoices(undefined, po.id),
        getChangeOrdersForPO(po.id),
        getCOImpactSummary(undefined, po.id),
    ]);

    const paymentSummary = paymentResult.data || { totalCommitted: 0, totalPaid: 0, totalPending: 0, totalOverdue: 0, totalRetained: 0 };
    const pendingInvoices = invoicesResult.data || [];
    const changeOrders = cosResult.data || [];
    const coImpact = coImpactResult.data || { totalCOs: 0, approvedCOs: 0, pendingCOs: 0, totalCostImpact: 0, totalScheduleImpact: 0, affectedMilestones: 0 };

    const tabFromQuery = Array.isArray(resolvedSearchParams.tab)
        ? resolvedSearchParams.tab[0]
        : resolvedSearchParams.tab;
    const viewFromQuery = Array.isArray(resolvedSearchParams.view)
        ? resolvedSearchParams.view[0]
        : resolvedSearchParams.view;
    const datasetFromQuery = Array.isArray(resolvedSearchParams.dataset)
        ? resolvedSearchParams.dataset[0]
        : resolvedSearchParams.dataset;
    const queryFromSearch = Array.isArray(resolvedSearchParams.q)
        ? resolvedSearchParams.q[0]
        : resolvedSearchParams.q;
    const allowedTabs = [
        "overview",
        "financials",
        "progress",
        "boq",
        "change-orders",
        "gallery",
        "quality",
        "history",
        "conflicts",
    ];
    const defaultTab = allowedTabs.includes(tabFromQuery || "") ? tabFromQuery : "overview";
    const defaultWorkspaceMode = viewFromQuery === "table" ? "table" : "analytics";
    const allowedDatasets = ["invoices", "deliveries", "boq", "changeOrders", "documents", "quality", "history", "conflicts"] as const;
    const defaultDataset = allowedDatasets.includes((datasetFromQuery || "") as (typeof allowedDatasets)[number])
        ? (datasetFromQuery as (typeof allowedDatasets)[number])
        : "invoices";
    const defaultSearch = queryFromSearch || "";

    const chartMilestones: Array<{ id: string; title: string; progress: number; amount: number }> = ((po as any).milestones || []).map((milestone: any) => ({
        id: milestone.id,
        title: milestone.title,
        progress: Number(milestone.progressRecords?.[0]?.percentComplete || 0),
        amount: Number(milestone.amount || (Number(po.totalValue) * Number(milestone.paymentPercentage || 0)) / 100),
    }));

    const chartBoqItems: Array<{ id: string; description: string; totalPrice: number }> = ((po as any).boqItems || []).map((item: any) => ({
        id: item.id,
        description: item.description || item.itemNumber || "Item",
        totalPrice: Number(item.totalPrice ?? (Number(item.quantity || 0) * Number(item.unitPrice || 0))),
    }));

    const invoiceRows = pendingInvoices.map((invoice: any) => ({
        invoiceNumber: invoice.invoiceNumber,
        milestone: invoice.milestone?.title || "No milestone",
        amount: Number(invoice.amount || 0),
        paidAmount: Number(invoice.paidAmount || 0),
        status: invoice.status,
        submittedAt: invoice.submittedAt ? format(new Date(invoice.submittedAt), "MMM d, yyyy") : "—",
    }));

    const deliveryRows = ((po as any).milestones || []).map((milestone: any) => ({
        milestone: milestone.title,
        status: milestone.status,
        progress: Number(milestone.progressRecords?.[0]?.percentComplete || 0),
        paymentPercentage: Number(milestone.paymentPercentage || 0),
        amount: Number(milestone.amount || (Number(po.totalValue) * Number(milestone.paymentPercentage || 0)) / 100),
    }));

    const boqRows = ((po as any).boqItems || []).map((item: any) => ({
        itemNumber: item.itemNumber || "—",
        description: item.description || "—",
        unit: item.unit || "—",
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.totalPrice || 0),
    }));

    const changeOrderRows = changeOrders.map((co: any) => ({
        changeNumber: co.changeNumber,
        type: co.changeOrderType,
        status: co.status,
        amountDelta: Number(co.amountDelta || 0),
        reason: co.reason || "—",
        createdAt: co.createdAt ? format(new Date(co.createdAt), "MMM d, yyyy") : "—",
    }));

    const documentRows = poDocuments.map((doc: any) => ({
        fileName: doc.fileName,
        type: doc.documentType || "PO",
        mimeType: doc.mimeType,
        uploadedAt: doc.createdAt ? format(new Date(doc.createdAt), "MMM d, yyyy") : "—",
        uploadedBy: doc.createdBy?.name || "—",
    }));

    const qualityRows = ((po as any).conflicts || []).map((conflict: any) => ({
        type: conflict.type,
        state: conflict.state,
        deviationPercent: Number(conflict.deviationPercent || 0),
        criticalPath: Boolean(conflict.isCriticalPath),
        escalationLevel: Number(conflict.escalationLevel || 0),
    }));

    const historyRows = (((po as any).milestones || []).flatMap((milestone: any) =>
        (milestone.progressRecords || []).map((progressRecord: any) => ({
            milestone: milestone.title,
            percentComplete: Number(progressRecord.percentComplete || 0),
            source: progressRecord.source || "—",
            trustLevel: progressRecord.trustLevel || "INTERNAL",
            reportedDate: progressRecord.reportedDate ? format(new Date(progressRecord.reportedDate), "MMM d, yyyy") : "—",
            forecast: Boolean(progressRecord.isForecast),
        }))
    )) as Array<Record<string, string | number | boolean | null>>;

    const conflictRows = ((po as any).conflicts || []).map((conflict: any) => ({
        type: conflict.type,
        state: conflict.state,
        description: conflict.description || "—",
        deviationPercent: Number(conflict.deviationPercent || 0),
        escalationLevel: Number(conflict.escalationLevel || 0),
        criticalPath: Boolean(conflict.isCriticalPath),
        createdAt: conflict.createdAt ? format(new Date(conflict.createdAt), "MMM d, yyyy") : "—",
    }));

    return (
        <div className="space-y-6">
            {/* Hero Header - Ticket Layout */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/procurement">
                            <ArrowLeftIcon className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="space-y-3">
                        {/* Total Value - Large & Bold */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Total Value</p>
                            <p className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                {po.currency} {Number(po.totalValue ?? 0).toLocaleString()}
                            </p>
                        </div>
                        
                        {/* PO Number + Status */}
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-semibold tracking-tight text-[#1E293B]">
                                {po.poNumber}
                            </h2>
                            <Badge
                                className={cn(
                                    "text-sm px-3 py-1 font-semibold shadow-sm",
                                    statusConfig[po.status]?.color || "bg-gray-100"
                                )}
                            >
                                <span className="mr-1.5">{statusConfig[po.status]?.icon || "⚪"}</span>
                                {statusConfig[po.status]?.label || po.status}
                            </Badge>
                        </div>

                        {/* Ticket-Style Icon Row */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <BuildingsIcon className="h-4 w-4" />
                                <span>{(po as any).project?.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <TruckIcon className="h-4 w-4" />
                                <span>{(po as any).supplier?.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CalendarIcon className="h-4 w-4" />
                                <span>{format(new Date(po.createdAt), "MMM d, yyyy")}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Submit PO Button - Only shows for DRAFT status */}
                    <SubmitPOButton poId={po.id} poNumber={po.poNumber} status={po.status} />
                    

                    {downloadUrl && (
                        <Button variant="outline" asChild>
                            <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <DownloadSimpleIcon className="mr-2 h-4 w-4" />
                                Download PO
                            </a>
                        </Button>
                    )}

                    <POActionsModal
                        poId={po.id}
                        poNumber={po.poNumber}
                        organizationId={po.organizationId}
                        projectId={po.projectId}
                        nextVersionNumber={(latestVersion?.versionNumber || 0) + 1}
                    />
                </div>
            </div>

            <PODetailWorkspace
                datasets={{
                    invoices: invoiceRows,
                    deliveries: deliveryRows,
                    boq: boqRows,
                    changeOrders: changeOrderRows,
                    documents: documentRows,
                    quality: qualityRows,
                    history: historyRows,
                    conflicts: conflictRows,
                }}
                initialMode={defaultWorkspaceMode}
                initialDataset={defaultDataset}
                initialSearch={defaultSearch}
            >
                <POCommandCenter
                    poId={po.id}
                    currency={po.currency}
                    totalValue={Number(po.totalValue ?? 0)}
                    totalPaid={paymentSummary.totalPaid}
                    totalPending={paymentSummary.totalPending}
                    totalOverdue={paymentSummary.totalOverdue}
                    totalRetained={paymentSummary.totalRetained}
                    pendingInvoicesCount={pendingInvoices.length}
                    milestones={chartMilestones}
                    boqItems={chartBoqItems}
                    pendingCOs={coImpact.pendingCOs}
                    totalCOs={coImpact.totalCOs}
                />

                {/* Tabs - Streamlined Navigation with "More" Dropdown */}
                <POTabsWrapper defaultTab={defaultTab}>

                {/* Overview Tab */}
                <TabsContent value="overview">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>PO Snapshot</CardTitle>
                                <CardDescription>At-a-glance details and ownership</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                                <InfoRow label="PO Number" value={po.poNumber} />
                                <InfoRow label="Status" value={po.status} />
                                <InfoRow label="Project" value={(po as any).project?.name || "—"} />
                                <InfoRow label="Supplier" value={(po as any).supplier?.name || "—"} />
                                <InfoRow label="Currency" value={po.currency} />
                                <InfoRow label="Total Value" value={`${po.currency} ${Number(po.totalValue ?? 0).toLocaleString()}`} mono />
                                <InfoRow label="Created" value={format(new Date(po.createdAt), "MMM d, yyyy 'at' h:mm a")} />
                                <InfoRow label="Last Version" value={latestVersion ? `v${latestVersion.versionNumber}` : "v1"} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Workstream Access</CardTitle>
                                <CardDescription>Open a specific PO stream in one click</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-2.5">
                                <QuickTabLink href={`/dashboard/procurement/${po.id}?tab=financials`} label="Invoices & Payments" hint={`${pendingInvoices.length} pending invoices`} />
                                <QuickTabLink href={`/dashboard/procurement/${po.id}?tab=progress`} label="Deliveries & Progress" hint={`${chartMilestones.filter((m) => m.progress >= 100).length}/${chartMilestones.length} milestones complete`} />
                                <QuickTabLink href={`/dashboard/procurement/${po.id}?tab=boq`} label="BOQ / Scope" hint={`${chartBoqItems.length} scope line items`} />
                                <QuickTabLink href={`/dashboard/procurement/${po.id}?tab=change-orders`} label="Change Orders" hint={`${coImpact.pendingCOs} pending of ${coImpact.totalCOs}`} />
                                <QuickTabLink href={`/dashboard/procurement/${po.id}?tab=gallery`} label="Documents" hint={`${poDocuments.length} files attached`} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Financials Tab - Phase 5 */}
                <TabsContent value="financials">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Left Column: Invoices */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Receipt className="h-5 w-5" />
                                                Invoices
                                            </CardTitle>
                                            <CardDescription>
                                                Review and approve invoices submitted by supplier
                                            </CardDescription>
                                        </div>
                                        {/* PM doesn't upload invoices - suppliers do */}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {pendingInvoices.length > 0 ? (
                                        <div className="space-y-3">
                                            {pendingInvoices.map((inv: any) => (
                                                <div
                                                    key={inv.id}
                                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                                            <Receipt className="h-5 w-5 text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{inv.invoiceNumber}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {inv.milestone?.title || "No milestone"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="font-mono font-medium">
                                                                {po.currency} {Number(inv.amount).toLocaleString()}
                                                            </p>
                                                            <PaymentStatusBadge status={inv.status} />
                                                        </div>
                                                        <InvoiceActions
                                                            invoiceId={inv.id}
                                                            invoiceNumber={inv.invoiceNumber}
                                                            amount={Number(inv.amount)}
                                                            paidAmount={Number(inv.paidAmount || 0)}
                                                            status={inv.status}
                                                            currency={po.currency}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                            <p>No invoices submitted yet</p>
                                            <p className="text-sm">Invoices will appear here when submitted by supplier</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Ready to Invoice Milestones */}
                            {(() => {
                                const milestones = (po as any).milestones || [];
                                const readyMilestones = milestones.filter((m: any) => {
                                    const progress = m.progressRecords?.[0]?.percentComplete || 0;
                                    const hasInvoice = pendingInvoices.some((inv: any) => inv.milestoneId === m.id);
                                    return Number(progress) >= 100 && !hasInvoice;
                                });

                                if (readyMilestones.length === 0) return null;

                                return (
                                    <Card className="border-emerald-200 bg-emerald-50/30">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                                                <CheckCircle className="h-5 w-5" />
                                                Ready to Invoice ({readyMilestones.length})
                                            </CardTitle>
                                            <CardDescription>
                                                Milestones at 100% completion without invoices
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {readyMilestones.map((m: any) => (
                                                <div
                                                    key={m.id}
                                                    className="flex items-center justify-between p-2 bg-white rounded border"
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm">{m.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {po.currency} {Number(m.amount || (Number(po.totalValue) * Number(m.paymentPercentage) / 100)).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <MilestoneInvoiceStatus
                                                        percentComplete={100}
                                                        hasInvoice={false}
                                                    />
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                );
                            })()}
                        </div>

                        {/* Right Column: Change Orders */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <ArrowsClockwise className="h-5 w-5" />
                                                Change Orders
                                            </CardTitle>
                                            <CardDescription>
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <ClientInstructionUpload
                                                projectId={(po as any).projectId}
                                            />
                                            <ChangeOrderSheet
                                                purchaseOrderId={po.id}
                                                currentPOValue={Number(po.totalValue)}
                                                milestones={(po as any).milestones?.map((m: any) => ({
                                                    id: m.id,
                                                    title: m.title,
                                                    status: m.status,
                                                })) || []}
                                                boqItems={(po as any).boqItems || []}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <ClientInstructionList
                                        projectId={(po as any).projectId}
                                        purchaseOrderId={po.id}
                                        currentPOValue={Number(po.totalValue)}
                                        milestones={(po as any).milestones || []}
                                        boqItems={(po as any).boqItems || []}
                                    />

                                    <div>
                                        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                                            <ArrowsClockwise size={16} className="text-muted-foreground" />
                                            Processed Change Orders
                                        </h3>
                                        {changeOrders.length > 0 ? (
                                            <div className="space-y-3">
                                                {changeOrders.map((co: any) => (
                                                    <div
                                                        key={co.id}
                                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${co.status === "APPROVED" ? "bg-green-100" :
                                                                co.status === "REJECTED" ? "bg-red-100" : "bg-blue-100"
                                                                }`}>
                                                                <ArrowsClockwise className={`h-5 w-5 ${co.status === "APPROVED" ? "text-green-600" :
                                                                    co.status === "REJECTED" ? "text-red-600" : "text-blue-600"
                                                                    }`} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium">{co.changeNumber}</p>
                                                                    {co.changeOrderType === "ADDITION" && (
                                                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                                                            Variation
                                                                        </Badge>
                                                                    )}
                                                                    {co.changeOrderType === "OMISSION" && (
                                                                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                                                                            De-Scope
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                                    {co.reason}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <p className={`font-mono font-medium ${Number(co.amountDelta) > 0 ? "text-amber-600" :
                                                                    Number(co.amountDelta) < 0 ? "text-green-600" : ""
                                                                    }`}>
                                                                    {Number(co.amountDelta) >= 0 ? "+" : ""}
                                                                    {po.currency} {Number(co.amountDelta).toLocaleString()}
                                                                </p>
                                                                <COStatusBadge status={co.status} />
                                                            </div>
                                                            <COActions
                                                                changeOrderId={co.id}
                                                                changeNumber={co.changeNumber}
                                                                status={co.status}
                                                                amountDelta={Number(co.amountDelta)}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <ArrowsClockwise className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                                <p>No change orders</p>
                                                <p className="text-sm">Submit a CO to request changes</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CO Impact Summary */}
                            {coImpact.totalCOs > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">CO Impact Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <p className="text-2xl font-bold text-green-600">{coImpact.approvedCOs}</p>
                                                <p className="text-xs text-muted-foreground">Approved</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-amber-600">{coImpact.pendingCOs}</p>
                                                <p className="text-xs text-muted-foreground">Pending</p>
                                            </div>
                                            <div>
                                                <p className={`text-2xl font-bold ${coImpact.totalCostImpact >= 0 ? "text-amber-600" : "text-green-600"}`}>
                                                    {coImpact.totalCostImpact >= 0 ? "+" : ""}{po.currency}{coImpact.totalCostImpact.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Cost Impact</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* Progress Tab - Phase 4 */}
                <TabsContent value="progress">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Internal Progress Form */}
                        <InternalProgressForm
                            purchaseOrderId={po.id}
                            poNumber={po.poNumber}
                            milestones={(po as any).milestones?.map((m: any) => ({
                                id: m.id,
                                title: m.title,
                                paymentPercentage: m.paymentPercentage,
                                currentProgress: m.progressRecords?.[0]?.percentComplete ? Number(m.progressRecords[0].percentComplete) : 0,
                            })) || []}
                            supplierName={(po as any).supplier?.name || "Supplier"}
                        />

                        {/* Progress History */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ChartLineUpIcon className="h-5 w-5" />
                                    Progress History
                                </CardTitle>
                                <CardDescription>Recent updates from supplier and internal teams</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {(po as any).milestones?.flatMap((m: any) =>
                                        m.progressRecords?.map((pr: any) => ({
                                            ...pr,
                                            milestoneTitle: m.title,
                                        })) || []
                                    ).slice(0, 20).map((record: any, index: number) => (
                                        <div key={record.id || index} className="flex items-center gap-4 p-3 rounded-lg border">
                                            <TrustIndicator level={record.trustLevel || "INTERNAL"} size="sm" showLabel={false} />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{record.milestoneTitle}: {record.percentComplete}%</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {record.source} • {format(new Date(record.reportedDate), "MMM d, yyyy")}
                                                </p>
                                            </div>
                                            {record.isForecast && (
                                                <Badge variant="secondary">⚠ Forecast</Badge>
                                            )}
                                        </div>
                                    )) || (
                                            <p className="text-center text-muted-foreground py-8">No progress records yet</p>
                                        )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Gallery Tab - Phase 4 */}
                <TabsContent value="gallery">
                    <Card>
                        <CardContent className="pt-6">
                            <POGallery
                                purchaseOrderId={po.id}
                                poNumber={po.poNumber}
                                media={poDocuments.map((doc: any) => ({
                                    id: doc.id,
                                    fileName: doc.fileName,
                                    fileUrl: doc.fileUrl,
                                    mimeType: doc.mimeType,
                                    documentType: doc.documentType,
                                    uploadedAt: new Date(doc.createdAt),
                                }))}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Conflicts Tab - Phase 4 */}
                <TabsContent value="conflicts">
                    <ConflictQueue
                        conflicts={(po as any).conflicts?.map((c: any) => ({
                            id: c.id,
                            type: c.type,
                            state: c.state,
                            deviationPercent: Number(c.deviationPercent),
                            description: c.description,
                            slaDeadline: c.slaDeadline ? new Date(c.slaDeadline) : undefined,
                            createdAt: new Date(c.createdAt),
                            escalationLevel: c.escalationLevel || 0,
                            isCriticalPath: c.isCriticalPath || false,
                            isFinancialMilestone: c.isFinancialMilestone || false,
                            purchaseOrder: {
                                id: po.id,
                                poNumber: po.poNumber,
                            },
                            milestone: c.milestone ? {
                                id: c.milestone.id,
                                title: c.milestone.title,
                            } : undefined,
                        })) || []}
                    />
                </TabsContent>

                {/* BOQ Tab */}
                <TabsContent value="boq">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Bill of Quantities</CardTitle>
                                    <CardDescription>
                                        Line items from uploaded BOQ
                                    </CardDescription>
                                </div>
                                <ImportBOQDialog purchaseOrderId={po.id} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {(po as any).boqItems?.length > 0 ? (
                                <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item #</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Unit</TableHead>
                                                <TableHead className="text-right">
                                                    Qty
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Unit Price
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Total
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(po as any).boqItems.map((item: any) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        {item.itemNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.description}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.unit}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {Number(
                                                            item.quantity ?? 0
                                                        ).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {Number(
                                                            item.unitPrice ?? 0
                                                        ).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {Number(
                                                            item.totalPrice ?? 0
                                                        ).toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileTextIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                    <p>No BOQ items yet.</p>
                                    <p className="text-sm">
                                        Upload an Excel file to import line
                                        items.
                                    </p>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Versions Tab */}
                <TabsContent value="versions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Version History</CardTitle>
                            <CardDescription>
                                All uploaded versions of this PO
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {versionsWithUrls.map((version: any) => (
                                    <div
                                        key={version.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <FileTextIcon className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    Version {version.versionNumber}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {version.changeDescription ||
                                                        "No description"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right text-sm text-muted-foreground">
                                                <ClockIcon className="h-4 w-4 inline mr-1" />
                                                {format(
                                                    new Date(version.createdAt),
                                                    "MMM d, yyyy"
                                                )}
                                            </div>
                                            {version.downloadUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <a
                                                        href={version.downloadUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <DownloadSimpleIcon className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Quality/NCR Tab */}
                <TabsContent value="quality">
                    <POQualityTab
                        purchaseOrderId={po.id}
                        organizationId={po.organizationId}
                        projectId={po.projectId}
                        supplierId={po.supplierId}
                    />
                </TabsContent>

                {/* Activity Log Tab */}
                <TabsContent value="history">
                    <AuditLogTimeline purchaseOrderId={po.id} />
                </TabsContent>
                </POTabsWrapper>
            </PODetailWorkspace>
            <ConflictResolver
                conflicts={(po as any).conflicts?.map((c: any) => ({
                    id: c.id,
                    milestoneId: c.milestoneId || "",
                    milestoneTitle: c.milestone?.title || "Unknown",
                    purchaseOrderId: po.id,
                    poNumber: po.poNumber,
                    type: c.type,
                    state: c.state,
                    deviationPercent: Number(c.deviationPercent),
                    description: c.description,
                    createdAt: new Date(c.createdAt),
                    isCriticalPath: c.isCriticalPath || false,
                    isFinancialMilestone: c.isFinancialMilestone || false,
                    escalationLevel: c.escalationLevel || 0,
                })) || []}
            />
        </div >
    );
}
