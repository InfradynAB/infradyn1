"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, CircleNotch, DotsThree, CurrencyDollar } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

interface COActionsProps {
    changeOrderId: string;
    changeNumber: string;
    status: string;
    amountDelta: number;
}

export function COActions({ changeOrderId, changeNumber, status, amountDelta }: COActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const router = useRouter();

    const isPending = status === "SUBMITTED" || status === "UNDER_REVIEW";

    async function handleApprove() {
        setIsLoading(true);
        try {
            const response = await fetch("/api/change-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "approve",
                    changeOrderId,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Change Order Approved", {
                    description: `${changeNumber} approved. PO value updated.`,
                });
                router.refresh();
            } else {
                toast.error("Failed to approve", { description: result.error });
            }
        } catch (error) {
            toast.error("Error approving change order");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleReject() {
        if (!rejectReason.trim()) {
            toast.error("Please provide a rejection reason");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/change-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "reject",
                    changeOrderId,
                    rejectionReason: rejectReason,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Change Order Rejected", {
                    description: `${changeNumber} has been rejected.`,
                });
                setRejectOpen(false);
                setRejectReason("");
                router.refresh();
            } else {
                toast.error("Failed to reject", { description: result.error });
            }
        } catch (error) {
            toast.error("Error rejecting change order");
        } finally {
            setIsLoading(false);
        }
    }

    if (!isPending) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            <Button
                size="sm"
                variant="outline"
                className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={handleApprove}
                disabled={isLoading}
            >
                {isLoading ? (
                    <CircleNotch className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                    </>
                )}
            </Button>

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogTrigger asChild>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={isLoading}
                    >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Change Order</DialogTitle>
                        <DialogDescription>
                            Rejecting {changeNumber} ({amountDelta >= 0 ? "+" : ""}{amountDelta.toLocaleString()})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Rejection Reason *</Label>
                            <Textarea
                                id="reason"
                                placeholder="Explain why this change order is being rejected..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={isLoading || !rejectReason.trim()}
                        >
                            {isLoading && <CircleNotch className="h-4 w-4 mr-2 animate-spin" />}
                            Reject Change Order
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- Invoice Payment Actions ---

interface InvoiceActionsProps {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    paidAmount: number;
    status: string;
    currency: string;
}

export function InvoiceActions({ invoiceId, invoiceNumber, amount, paidAmount, status, currency }: InvoiceActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentRef, setPaymentRef] = useState("");
    const router = useRouter();

    const remaining = amount - (paidAmount || 0);
    const isPaid = status === "PAID";

    async function handleRecordPayment() {
        const payAmount = parseFloat(paymentAmount);
        if (isNaN(payAmount) || payAmount <= 0) {
            toast.error("Please enter a valid payment amount");
            return;
        }

        if (payAmount > remaining) {
            toast.error("Payment exceeds remaining balance");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "updatePayment",
                    invoiceId,
                    paidAmount: payAmount,
                    paymentReference: paymentRef || undefined,
                    paymentMethod: "BANK_TRANSFER",
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Payment Recorded", {
                    description: `${currency} ${payAmount.toLocaleString()} recorded for ${invoiceNumber}`,
                });
                setPaymentOpen(false);
                setPaymentAmount("");
                setPaymentRef("");
                router.refresh();
            } else {
                toast.error("Failed to record payment", { description: result.error });
            }
        } catch (error) {
            toast.error("Error recording payment");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleMarkFullyPaid() {
        setIsLoading(true);
        try {
            const response = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "updatePayment",
                    invoiceId,
                    paidAmount: remaining,
                    paymentMethod: "BANK_TRANSFER",
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Invoice Marked as Paid", {
                    description: `${invoiceNumber} has been fully paid.`,
                });
                router.refresh();
            } else {
                toast.error("Failed to mark as paid", { description: result.error });
            }
        } catch (error) {
            toast.error("Error marking invoice as paid");
        } finally {
            setIsLoading(false);
        }
    }

    if (isPaid) {
        return (
            <span className="text-xs text-green-600 font-medium">✓ Paid</span>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <DotsThree className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <CurrencyDollar className="h-4 w-4 mr-2" />
                            Record Payment
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Record Payment</DialogTitle>
                            <DialogDescription>
                                Invoice: {invoiceNumber} | Remaining: {currency} {remaining.toLocaleString()}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Payment Amount *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reference">Payment Reference</Label>
                                <Input
                                    id="reference"
                                    placeholder="Transfer ID, check number, etc."
                                    value={paymentRef}
                                    onChange={(e) => setPaymentRef(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleRecordPayment} disabled={isLoading}>
                                {isLoading && <CircleNotch className="h-4 w-4 mr-2 animate-spin" />}
                                Record Payment
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <DropdownMenuItem onClick={handleMarkFullyPaid} disabled={isLoading}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark Fully Paid
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
