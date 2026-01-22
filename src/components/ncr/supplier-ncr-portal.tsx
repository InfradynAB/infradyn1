"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Upload,
    Send,
    FileText,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface NCRData {
    id: string;
    ncrNumber: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    issueType: string;
    createdAt: string;
    purchaseOrder?: { poNumber: string } | null;
    affectedBoqItem?: { description: string } | null;
    comments: Array<{
        id: string;
        content: string | null;
        authorRole: string | null;
        createdAt: string;
    }>;
}

interface SupplierNCRPortalProps {
    token: string;
}

const SEVERITY_CONFIG = {
    CRITICAL: { color: "bg-red-500", icon: AlertTriangle, label: "Critical" },
    MAJOR: { color: "bg-orange-500", icon: AlertCircle, label: "Major" },
    MINOR: { color: "bg-yellow-500", icon: Clock, label: "Minor" },
};

const STATUS_LABELS: Record<string, string> = {
    OPEN: "Awaiting Your Response",
    SUPPLIER_RESPONDED: "Response Received",
    REINSPECTION: "Under Re-inspection",
    REVIEW: "Under Review",
    REMEDIATION: "Remediation in Progress",
    CLOSED: "Resolved",
};

export function SupplierNCRPortal({ token }: SupplierNCRPortalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ncrData, setNcrData] = useState<NCRData | null>(null);
    const [response, setResponse] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        fetchNCR();
    }, [token]);

    const fetchNCR = async () => {
        try {
            const res = await fetch(`/api/ncr/reply?token=${token}`);
            const result = await res.json();

            if (result.success) {
                setNcrData(result.data);
            } else {
                setError(result.error || "Invalid or expired link");
            }
        } catch {
            setError("Failed to load NCR details");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitResponse = async () => {
        if (!response.trim()) {
            toast.error("Please enter a response");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/ncr/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    content: response,
                }),
            });

            const result = await res.json();
            if (result.success) {
                toast.success("Response submitted successfully");
                setSubmitted(true);
                // Refresh NCR data to show new comment
                fetchNCR();
            } else {
                toast.error(result.error || "Failed to submit response");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Link Error</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <p className="text-sm text-muted-foreground mt-4">
                            Please contact your buyer for a new link.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!ncrData) {
        return null;
    }

    const severityConfig = SEVERITY_CONFIG[ncrData.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.MINOR;
    const SeverityIcon = severityConfig.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center text-white space-y-2">
                    <h1 className="text-2xl font-bold">Non-Conformance Report</h1>
                    <p className="text-slate-400">Response Portal</p>
                </div>

                {/* NCR Details Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    {ncrData.ncrNumber}
                                </CardTitle>
                                <p className="text-muted-foreground mt-1">
                                    PO: {ncrData.purchaseOrder?.poNumber || "N/A"}
                                </p>
                            </div>
                            <Badge className={`${severityConfig.color} text-white`}>
                                <SeverityIcon className="h-3 w-3 mr-1" />
                                {severityConfig.label}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Status */}
                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">Status:</span>
                            <span>{STATUS_LABELS[ncrData.status] || ncrData.status}</span>
                        </div>

                        {/* Issue Details */}
                        <div className="space-y-2">
                            <h3 className="font-semibold">{ncrData.title}</h3>
                            {ncrData.description && (
                                <p className="text-muted-foreground">{ncrData.description}</p>
                            )}
                        </div>

                        {/* Affected Item */}
                        {ncrData.affectedBoqItem && (
                            <div className="text-sm">
                                <span className="text-muted-foreground">Affected Item: </span>
                                <span>{ncrData.affectedBoqItem.description}</span>
                            </div>
                        )}

                        {/* Issue Type */}
                        <div className="text-sm">
                            <span className="text-muted-foreground">Issue Type: </span>
                            <span className="capitalize">{ncrData.issueType.replace(/_/g, " ").toLowerCase()}</span>
                        </div>

                        {/* Date */}
                        <div className="text-sm text-muted-foreground">
                            Reported: {format(new Date(ncrData.createdAt), "MMMM d, yyyy")}
                        </div>
                    </CardContent>
                </Card>

                {/* Previous Comments */}
                {ncrData.comments.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Discussion</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {ncrData.comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                        {comment.authorRole?.[0] || "?"}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-medium">{comment.authorRole}</span>
                                            <span className="text-muted-foreground">
                                                {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                            </span>
                                        </div>
                                        <p className="text-sm mt-1">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Response Form */}
                {ncrData.status !== "CLOSED" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Your Response</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {submitted ? (
                                <div className="text-center py-6">
                                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                    <h3 className="font-semibold text-lg">Response Submitted</h3>
                                    <p className="text-muted-foreground mt-1">
                                        Thank you for your response. The buyer has been notified.
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => {
                                            setSubmitted(false);
                                            setResponse("");
                                        }}
                                    >
                                        Add Another Response
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="response">
                                            Describe your corrective action or response
                                        </Label>
                                        <Textarea
                                            id="response"
                                            placeholder="Enter your response to this NCR..."
                                            value={response}
                                            onChange={(e) => setResponse(e.target.value)}
                                            rows={5}
                                        />
                                    </div>

                                    {/* File Upload (placeholder) */}
                                    <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
                                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            Upload repair certificate or photos (coming soon)
                                        </p>
                                    </div>

                                    <Button
                                        className="w-full"
                                        onClick={handleSubmitResponse}
                                        disabled={submitting || !response.trim()}
                                    >
                                        {submitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Send className="h-4 w-4 mr-2" />
                                        )}
                                        Submit Response
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Closed NCR Message */}
                {ncrData.status === "CLOSED" && (
                    <Card>
                        <CardContent className="py-6 text-center">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                            <h3 className="font-semibold text-lg">NCR Resolved</h3>
                            <p className="text-muted-foreground mt-1">
                                This non-conformance has been closed.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Footer */}
                <div className="text-center text-slate-500 text-sm">
                    <p>This is a secure portal. Your responses are recorded.</p>
                </div>
            </div>
        </div>
    );
}
