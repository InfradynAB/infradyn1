import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    UploadSimpleIcon,
    FileTextIcon,
    ClockIcon,
    PencilSimpleIcon,
    TrashIcon,
    ChartLineUpIcon,
    ImagesIcon,
    WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { format } from "date-fns";
import { UploadVersionDialog } from "@/components/procurement/upload-version-dialog";
import { ImportBOQDialog } from "@/components/procurement/import-boq-dialog";
import { DeletePOButton } from "@/components/procurement/delete-po-button";
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
import { PaymentStatusBadge, COStatusBadge } from "@/components/procurement/payment-status-badge";
import { getPaymentSummary, getPendingInvoices } from "@/lib/actions/finance-engine";
import { getChangeOrdersForPO, getCOImpactSummary } from "@/lib/actions/change-order-engine";
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

// Status badge colors
const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    ACTIVE: "bg-green-100 text-green-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-red-100 text-red-700",
};

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/procurement">
                            <ArrowLeftIcon className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {po.poNumber}
                            </h1>
                            <Badge
                                variant="secondary"
                                className={statusColors[po.status] || ""}
                            >
                                {po.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            {(po as any).project?.name} • {(po as any).supplier?.name}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {downloadUrl && (
                        <Button variant="outline" asChild>
                            <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <DownloadSimpleIcon className="mr-2 h-4 w-4" />
                                Download PDF
                            </a>
                        </Button>
                    )}
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/procurement/${po.id}/edit`}>
                            <PencilSimpleIcon className="mr-2 h-4 w-4" />
                            Edit PO
                        </Link>
                    </Button>
                    <UploadVersionDialog
                        purchaseOrderId={po.id}
                        organizationId={po.organizationId}
                        projectId={po.projectId}
                        nextVersionNumber={(latestVersion?.versionNumber || 0) + 1}
                    />
                    <DeletePOButton poId={po.id} poNumber={po.poNumber} />
                </div>
            </div>

            {/* Summary Cards - Phase 5 Enhanced */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Value</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {po.currency}{" "}
                            {Number(po.totalValue ?? 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            Paid
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-green-600">
                            {po.currency} {paymentSummary.totalPaid.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {Number(po.totalValue) > 0
                                ? ((paymentSummary.totalPaid / Number(po.totalValue)) * 100).toFixed(0)
                                : 0}% of total
                        </p>
                    </CardContent>
                </Card>
                <Card className={paymentSummary.totalOverdue > 0 ? "border-red-300" : ""}>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Warning className="h-3 w-3 text-amber-500" />
                            Pending
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-amber-600">
                            {po.currency} {paymentSummary.totalPending.toLocaleString()}
                        </div>
                        {paymentSummary.totalOverdue > 0 && (
                            <p className="text-xs text-red-500">
                                ${paymentSummary.totalOverdue.toLocaleString()} overdue
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <ArrowsClockwise className="h-3 w-3" />
                            Change Orders
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {coImpact.totalCOs}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {coImpact.pendingCOs > 0
                                ? `${coImpact.pendingCOs} pending review`
                                : "All processed"}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Version</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            v{latestVersion?.versionNumber || 1}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {format(new Date(po.updatedAt), "MMM d")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex-wrap">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="financials" className="gap-1.5">
                        <Receipt className="h-4 w-4" />
                        Financials
                    </TabsTrigger>
                    <TabsTrigger value="progress" className="gap-1.5">
                        <ChartLineUpIcon className="h-4 w-4" />
                        Progress
                    </TabsTrigger>
                    <TabsTrigger value="gallery" className="gap-1.5">
                        <ImagesIcon className="h-4 w-4" />
                        Gallery
                    </TabsTrigger>
                    <TabsTrigger value="conflicts" className="gap-1.5">
                        <WarningCircleIcon className="h-4 w-4" />
                        Conflicts
                    </TabsTrigger>
                    <TabsTrigger value="boq">BOQ Items</TabsTrigger>
                    <TabsTrigger value="versions">Version History</TabsTrigger>
                    <TabsTrigger value="activity" className="gap-1.5">
                        <ClockCounterClockwise className="h-4 w-4" />
                        Activity Log
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Purchase Order Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    PO Number
                                </p>
                                <p className="font-medium">{po.poNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Status
                                </p>
                                <p className="font-medium">{po.status}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Project
                                </p>
                                <p className="font-medium">
                                    {(po as any).project?.name || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Supplier
                                </p>
                                <p className="font-medium">
                                    {(po as any).supplier?.name || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Currency
                                </p>
                                <p className="font-medium">{po.currency}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Total Value
                                </p>
                                <p className="font-medium font-mono">
                                    {Number(po.totalValue ?? 0).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Created
                                </p>
                                <p className="font-medium">
                                    {format(
                                        new Date(po.createdAt),
                                        "MMM d, yyyy 'at' h:mm a"
                                    )}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
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
                                                Request and track changes to this PO
                                            </CardDescription>
                                        </div>
                                        <ChangeOrderForm
                                            purchaseOrderId={po.id}
                                            currentPOValue={Number(po.totalValue)}
                                            milestones={(po as any).milestones?.map((m: any) => ({
                                                id: m.id,
                                                title: m.title,
                                                status: m.status,
                                            })) || []}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
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
                                                            <p className="font-medium">{co.changeNumber}</p>
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

                {/* Activity Log Tab */}
                <TabsContent value="activity">
                    <AuditLogTimeline purchaseOrderId={po.id} />
                </TabsContent>
            </Tabs >
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
