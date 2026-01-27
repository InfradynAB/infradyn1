import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getNCRById } from "@/lib/actions/ncr-engine";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SeverityBadge, StatusBadge, SLAIndicator, NCRActions } from "@/components/ncr";
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
        <div className="space-y-4">
            {/* Back Button & Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/procurement/${ncr.purchaseOrderId}`}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to PO
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold">{ncr.ncrNumber}</h1>
                        <SeverityBadge severity={ncr.severity as any} />
                        <StatusBadge status={ncr.status as any} />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
                        <span>PO: {ncr.purchaseOrder?.poNumber || "N/A"}</span>
                        <span>·</span>
                        <span>Supplier: {ncr.supplier?.name || "N/A"}</span>
                    </div>
                    {/* Action Buttons */}
                    <NCRActions
                        ncrId={id}
                        ncrNumber={ncr.ncrNumber}
                        status={ncr.status}
                        requiresCreditNote={ncr.requiresCreditNote || false}
                        supplierEmail={ncr.supplier?.contactEmail || undefined}
                    />
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
                {/* Left Column - NCR Details & Metadata */}
                <div className="space-y-4">
                    {/* NCR Information */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{ncr.title}</CardTitle>
                            <CardDescription>
                                Issue Type: {ncr.issueType?.replace(/_/g, " ")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {ncr.description && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Description</p>
                                    <p className="text-sm">{ncr.description}</p>
                                </div>
                            )}

                            {ncr.affectedBoqItem && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Affected Item</p>
                                    <p className="text-sm">{ncr.affectedBoqItem.description}</p>
                                </div>
                            )}

                            {ncr.batchId && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Batch/Lot ID</p>
                                    <p className="text-sm font-mono">{ncr.batchId}</p>
                                </div>
                            )}

                            {/* SLA Status */}
                            {ncr.slaDueAt && ncr.status !== "CLOSED" && (
                                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                    <span className="text-xs font-medium">SLA:</span>
                                    <SLAIndicator slaDueAt={ncr.slaDueAt instanceof Date ? ncr.slaDueAt.toISOString() : ncr.slaDueAt} status={ncr.status as any} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Participants */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Participants</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            {ncr.reporter && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Reported by</p>
                                    <p className="font-medium text-sm">{ncr.reporter.name}</p>
                                </div>
                            )}
                            {ncr.assignee && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Assigned to</p>
                                    <p className="font-medium text-sm">{ncr.assignee.name}</p>
                                </div>
                            )}
                            {ncr.closer && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Closed by</p>
                                    <p className="font-medium text-sm">{ncr.closer.name}</p>
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
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Documents</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {ncr.sourceDocumentId && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Source</p>
                                        <Badge variant="outline" className="text-xs">Attached</Badge>
                                    </div>
                                )}
                                {ncr.proofOfFixDocId && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Proof of Fix</p>
                                        <Badge variant="outline" className="bg-green-50 text-xs">Verified</Badge>
                                    </div>
                                )}
                                {ncr.creditNoteDocId && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Credit Note</p>
                                        <Badge variant="outline" className="bg-blue-50 text-xs">Uploaded</Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Payment Shield */}
                    {ncr.requiresCreditNote && (
                        <Card className="border-amber-300 bg-amber-50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Payment Shield Active</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs">
                                <p className="text-muted-foreground">
                                    Credit note required before closure.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Comments Thread (takes 3 cols) */}
                <div className="lg:col-span-3">
                    <NCRCommentThread
                        ncrId={id}
                        canComment={true}
                        userRole={session.user.role || "USER"}
                        currentUserId={session.user.id}
                    />
                </div>
            </div>
        </div>
    );
}
