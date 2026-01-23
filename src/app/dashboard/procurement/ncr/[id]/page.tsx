import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getNCRById } from "@/lib/actions/ncr-engine";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SeverityBadge, StatusBadge, SLAIndicator } from "@/components/ncr";
import { NCRCommentThread } from "@/components/ncr";
import { format } from "date-fns";

export default async function NCRDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect("/sign-in");
    }

    const result = await getNCRById(id, true); // Include internal comments for staff

    if (!result.success || !result.data) {
        notFound();
    }

    const ncr = result.data;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Back Button */}
            <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/procurement/${ncr.purchaseOrderId}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to PO
                </Link>
            </Button>

            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold">{ncr.ncrNumber}</h1>
                    <SeverityBadge severity={ncr.severity as any} />
                    <StatusBadge status={ncr.status as any} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>PO: {ncr.purchaseOrder?.poNumber || "N/A"}</span>
                    <span>·</span>
                    <span>Supplier: {ncr.supplier?.name || "N/A"}</span>
                    <span>·</span>
                    <span>Reported: {format(new Date(ncr.createdAt), "MMM d, yyyy")}</span>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column - NCR Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* NCR Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{ncr.title}</CardTitle>
                            <CardDescription>
                                Issue Type: {ncr.issueType?.replace(/_/g, " ")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {ncr.description && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                                    <p>{ncr.description}</p>
                                </div>
                            )}

                            {ncr.affectedBoqItem && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Affected Item</p>
                                    <p>{ncr.affectedBoqItem.description}</p>
                                </div>
                            )}

                            {ncr.batchId && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Batch/Lot ID</p>
                                    <p className="font-mono">{ncr.batchId}</p>
                                </div>
                            )}

                            {/* SLA Status */}
                            {ncr.slaDueAt && ncr.status !== "CLOSED" && (
                                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm font-medium">SLA Status:</span>
                                    <SLAIndicator slaDueAt={ncr.slaDueAt} status={ncr.status as any} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Comments Thread */}
                    <NCRCommentThread
                        ncrId={id}
                        canComment={true}
                        userRole={session.user.role || "USER"}
                    />
                </div>

                {/* Right Column - Metadata */}
                <div className="space-y-6">
                    {/* Participants */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Participants</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {ncr.reporter && (
                                <div>
                                    <p className="text-muted-foreground">Reported by</p>
                                    <p className="font-medium">{ncr.reporter.name}</p>
                                </div>
                            )}
                            {ncr.assignee && (
                                <div>
                                    <p className="text-muted-foreground">Assigned to</p>
                                    <p className="font-medium">{ncr.assignee.name}</p>
                                </div>
                            )}
                            {ncr.closer && (
                                <div>
                                    <p className="text-muted-foreground">Closed by</p>
                                    <p className="font-medium">{ncr.closer.name}</p>
                                    {ncr.closedAt && (
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(ncr.closedAt), "MMM d, yyyy")}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Documents */}
                    {(ncr.sourceDocumentId || ncr.proofOfFixDocId || ncr.creditNoteDocId) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Documents</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {ncr.sourceDocumentId && (
                                    <div>
                                        <p className="text-muted-foreground">Source Document</p>
                                        <Badge variant="outline">Attached</Badge>
                                    </div>
                                )}
                                {ncr.proofOfFixDocId && (
                                    <div>
                                        <p className="text-muted-foreground">Proof of Fix</p>
                                        <Badge variant="outline" className="bg-green-50">Verified</Badge>
                                    </div>
                                )}
                                {ncr.creditNoteDocId && (
                                    <div>
                                        <p className="text-muted-foreground">Credit Note</p>
                                        <Badge variant="outline" className="bg-blue-50">Uploaded</Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Payment Shield */}
                    {ncr.requiresCreditNote && (
                        <Card className="border-amber-300 bg-amber-50">
                            <CardHeader>
                                <CardTitle className="text-base">Payment Shield Active</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm">
                                <p className="text-muted-foreground">
                                    This item was already paid. Credit note required before closure.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
