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

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
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
                        <CardDescription>Current Version</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            v{latestVersion?.versionNumber || 1}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Last Updated</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {format(new Date(po.updatedAt), "MMM d, yyyy")}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
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
