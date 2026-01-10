"use client";

/**
 * Invoice Approval Dialog
 * PM reviews and approves/rejects invoices submitted by suppliers
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
    CircleNotch,
    FileText,
    CheckCircle,
    XCircle,
    Warning,
    CurrencyDollar,
    Calendar,
    Hash,
    User,
    CaretDown,
    Eye,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InvoiceForApproval {
    id: string;
    invoiceNumber: string;
    amount: string;
    invoiceDate: Date | string;
    dueDate?: Date | string | null;
    status: string;
    validationStatus?: string;
    validationNotes?: string;
    confidenceScore?: string | null;
    documentId?: string | null;
    extractedData?: {
        invoiceNumber?: string;
        vendorName?: string;
        totalAmount?: number;
        currency?: string;
        confidence?: number;
    };
    milestone?: {
        id: string;
        title: string;
        paymentPercentage: string;
    } | null;
    supplier?: {
        name: string;
    };
    submittedAt?: Date | string;
}

interface InvoiceApprovalDialogProps {
    invoice: InvoiceForApproval;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    currency?: string;
}

export function InvoiceApprovalDialog({
    invoice,
    open,
    onOpenChange,
    onSuccess,
    currency = "USD",
}: InvoiceApprovalDialogProps) {
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);

    const handleApprove = async () => {
        setIsApproving(true);
        try {
            const response = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "approveInvoice",
                    invoiceId: invoice.id,
                }),
            });

            if (!response.ok) {
                throw new Error("Approval failed");
            }

            toast.success("Invoice approved!", {
                description: `Invoice ${invoice.invoiceNumber} has been approved.`,
            });

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Approve error:", error);
            toast.error("Failed to approve invoice");
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error("Please provide a reason for rejection");
            return;
        }

        setIsRejecting(true);
        try {
            const response = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "rejectInvoice",
                    invoiceId: invoice.id,
                    reason: rejectionReason,
                }),
            });

            if (!response.ok) {
                throw new Error("Rejection failed");
            }

            toast.success("Invoice rejected", {
                description: "The supplier will be notified.",
            });

            onOpenChange(false);
            setRejectionReason("");
            setShowRejectForm(false);
            onSuccess?.();
        } catch (error) {
            console.error("Reject error:", error);
            toast.error("Failed to reject invoice");
        } finally {
            setIsRejecting(false);
        }
    };

    const confidence = invoice.confidenceScore
        ? parseFloat(invoice.confidenceScore) * 100
        : invoice.extractedData?.confidence
            ? invoice.extractedData.confidence * 100
            : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText size={20} />
                        Review Invoice
                    </DialogTitle>
                    <DialogDescription>
                        Review and approve or reject this invoice submission.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Invoice Details */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium">Invoice Details</h4>
                            {confidence !== null && (
                                <Badge variant={confidence > 80 ? "default" : "secondary"}>
                                    {Math.round(confidence)}% AI confidence
                                </Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Hash size={16} className="text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Invoice Number</p>
                                    <p className="font-medium">{invoice.invoiceNumber}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <CurrencyDollar size={16} className="text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Amount</p>
                                    <p className="font-medium">
                                        {currency} {parseFloat(invoice.amount).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Invoice Date</p>
                                    <p className="font-medium">
                                        {format(new Date(invoice.invoiceDate), "MMM d, yyyy")}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <User size={16} className="text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Supplier</p>
                                    <p className="font-medium">{invoice.supplier?.name || "Unknown"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Milestone Link */}
                    {invoice.milestone && (
                        <div className="p-3 bg-primary/5 rounded-lg">
                            <p className="text-sm font-medium">Linked Milestone</p>
                            <p className="text-sm text-muted-foreground">
                                {invoice.milestone.title} ({invoice.milestone.paymentPercentage}%)
                            </p>
                        </div>
                    )}

                    {/* Validation Result */}
                    {invoice.validationStatus && invoice.validationStatus !== "PENDING" && (
                        <div className={cn(
                            "flex items-start gap-3 p-3 rounded-lg",
                            invoice.validationStatus === "PASSED" && "bg-green-500/10 text-green-600",
                            invoice.validationStatus === "MISMATCH" && "bg-amber-500/10 text-amber-600",
                            invoice.validationStatus === "FAILED" && "bg-red-500/10 text-red-600"
                        )}>
                            {invoice.validationStatus === "PASSED" && <CheckCircle size={20} weight="fill" />}
                            {invoice.validationStatus === "MISMATCH" && <Warning size={20} weight="fill" />}
                            {invoice.validationStatus === "FAILED" && <XCircle size={20} weight="fill" />}
                            <div>
                                <p className="text-sm font-medium">
                                    Validation: {invoice.validationStatus}
                                </p>
                                {invoice.validationNotes && (
                                    <p className="text-sm">{invoice.validationNotes}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* View Document */}
                    {invoice.documentId && (
                        <Button variant="outline" className="w-full" asChild>
                            <a href={`/api/documents/${invoice.documentId}/view`} target="_blank">
                                <Eye size={16} className="mr-2" />
                                View Invoice Document
                            </a>
                        </Button>
                    )}

                    {/* Rejection Form */}
                    {showRejectForm && (
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Reason for Rejection</label>
                            <Textarea
                                placeholder="Explain why this invoice is being rejected..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        {!showRejectForm ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="flex-1 text-destructive hover:bg-destructive/10"
                                    onClick={() => setShowRejectForm(true)}
                                >
                                    <XCircle size={16} className="mr-2" />
                                    Reject
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleApprove}
                                    disabled={isApproving}
                                >
                                    {isApproving && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                                    <CheckCircle size={16} className="mr-2" />
                                    Approve
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowRejectForm(false);
                                        setRejectionReason("");
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleReject}
                                    disabled={isRejecting || !rejectionReason.trim()}
                                >
                                    {isRejecting && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm Rejection
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
