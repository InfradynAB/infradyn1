import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import db from "@/db/drizzle";
import { ncr, ncrComment, purchaseOrder } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { findSupplierForUser } from "@/lib/actions/supplier-lookup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Clock, FileText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { SupplierNCRResponseForm } from "@/components/supplier/supplier-ncr-response-form";

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
    CRITICAL: { color: "bg-red-500 text-white", label: "Critical" },
    MAJOR: { color: "bg-orange-500 text-white", label: "Major" },
    MINOR: { color: "bg-yellow-500 text-black", label: "Minor" },
};

const STATUS_LABELS: Record<string, string> = {
    OPEN: "Awaiting Your Response",
    SUPPLIER_RESPONDED: "Response Received",
    REINSPECTION: "Under Re-inspection",
    REVIEW: "Under Review",
    REMEDIATION: "Remediation in Progress",
    CLOSED: "Resolved",
};

export default async function SupplierNCRResponsePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user || session.user.role !== "SUPPLIER") {
        redirect("/dashboard");
    }

    // Get supplier profile
    const { supplier: supplierData } = await findSupplierForUser(
        session.user.id,
        session.user.email,
        session.user.supplierId
    );

    if (!supplierData) {
        return <div className="p-20 text-center font-bold">Error: Supplier profile not found.</div>;
    }

    // Get NCR with supplier access check
    const ncrData = await db.query.ncr.findFirst({
        where: and(
            eq(ncr.id, id),
            eq(ncr.supplierId, supplierData.id)
        ),
        with: {
            purchaseOrder: true,
            affectedBoqItem: true,
        },
    });

    if (!ncrData) {
        notFound();
    }

    // Get comments (non-internal only for suppliers)
    const comments = await db.query.ncrComment.findMany({
        where: and(
            eq(ncrComment.ncrId, id),
            eq(ncrComment.isInternal, false)
        ),
        orderBy: [desc(ncrComment.createdAt)],
        with: {
            user: true,
        },
    });

    const severity = SEVERITY_CONFIG[ncrData.severity] || SEVERITY_CONFIG.MINOR;
    const isOverdue = ncrData.slaDueAt && new Date(ncrData.slaDueAt) < new Date();

    return (
        <div className="space-y-4">
            {/* Back Button & Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/supplier/pos/${ncrData.purchaseOrderId}`}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to PO
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">{ncrData.ncrNumber}</h1>
                        <Badge className={severity.color}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {severity.label}
                        </Badge>
                        {isOverdue && (
                            <Badge variant="destructive" className="animate-pulse">
                                OVERDUE
                            </Badge>
                        )}
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    PO: {ncrData.purchaseOrder?.poNumber || "N/A"}
                </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Left Column - NCR Details */}
                <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{ncrData.title}</CardTitle>
                        <CardDescription>
                            Reported on {format(new Date(ncrData.createdAt), "MMMM d, yyyy")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Status */}
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Status:</span>
                            <span className="text-sm">{STATUS_LABELS[ncrData.status] || ncrData.status}</span>
                        </div>

                        {/* Description */}
                        {ncrData.description && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Description</p>
                                <p className="text-sm">{ncrData.description}</p>
                            </div>
                        )}

                        {/* Issue Type */}
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Issue Type</p>
                            <p className="text-sm capitalize">{ncrData.issueType.replace(/_/g, " ").toLowerCase()}</p>
                        </div>

                        {/* Affected Item */}
                        {ncrData.affectedBoqItem && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Affected Item</p>
                                <p className="text-sm">{ncrData.affectedBoqItem.description}</p>
                            </div>
                        )}

                        {/* SLA Deadline */}
                        {ncrData.slaDueAt && ncrData.status !== "CLOSED" && (
                            <div className={`p-2 rounded-lg ${isOverdue ? "bg-red-50 border border-red-200" : "bg-orange-50 border border-orange-200"}`}>
                                <p className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-orange-600"}`}>
                                    {isOverdue
                                        ? `Response was due: ${format(new Date(ncrData.slaDueAt), "MMM d, yyyy h:mm a")}`
                                        : `Response due by: ${format(new Date(ncrData.slaDueAt), "MMM d, yyyy h:mm a")}`
                                    }
                                </p>
                            </div>
                        )}

                        {/* Closed Message */}
                        {ncrData.status === "CLOSED" && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-green-600 font-medium text-sm text-center">This NCR has been resolved.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right Column - Discussion */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Discussion Thread */}
                    <Card className="flex flex-col h-fit">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Discussion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {comments.length > 0 ? (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${comment.authorRole === "SUPPLIER" ? "bg-purple-500 text-white" : "bg-blue-500 text-white"
                                                }`}>
                                                {comment.authorRole?.[0] || "?"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-sm flex-wrap">
                                                    <span className="font-medium">{comment.user?.name || comment.authorRole}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {comment.authorRole}
                                                    </Badge>
                                                    <span className="text-muted-foreground text-xs">
                                                        {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                                    </span>
                                                </div>
                                                <p className="text-sm mt-1">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Response Form */}
                    {ncrData.status !== "CLOSED" && (
                        <SupplierNCRResponseForm ncrId={id} />
                    )}
                </div>
            </div>
        </div>
    );
}
