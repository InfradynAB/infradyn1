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
} from "@phosphor-icons/react/dist/ssr";
import { format } from "date-fns";
import { UploadVersionDialog } from "@/components/procurement/upload-version-dialog";
import { ImportBOQDialog } from "@/components/procurement/import-boq-dialog";

// Status badge colors
const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    ACTIVE: "bg-green-100 text-green-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-red-100 text-red-700",
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PODetailPage({ params }: PageProps) {
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
    const latestVersion = po.versions?.[0];

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
                    {latestVersion?.fileUrl && (
                        <Button variant="outline" asChild>
                            <a
                                href={latestVersion.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <DownloadSimpleIcon className="mr-2 h-4 w-4" />
                                Download PDF
                            </a>
                        </Button>
                    )}
                    <UploadVersionDialog
                        purchaseOrderId={po.id}
                        organizationId={po.organizationId}
                        projectId={po.projectId}
                        nextVersionNumber={(latestVersion?.versionNumber || 0) + 1}
                    />
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
                            {Number(po.totalValue).toLocaleString()}
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
                                    {Number(po.totalValue).toLocaleString()}
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
                                                        item.quantity
                                                    ).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {Number(
                                                        item.unitPrice
                                                    ).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {Number(
                                                        item.totalPrice
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
                                {po.versions?.map((version: any) => (
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
                                            {version.fileUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <a
                                                        href={version.fileUrl}
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
        </div >
    );
}
