"use client";

import { useState, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    CheckCircle,
    XCircle,
    Warning,
    ArrowRight,
    CircleNotch,
} from "@phosphor-icons/react";
import type { PendingApproval } from "@/lib/actions/approvals";

interface ApprovalModalProps {
    approval: PendingApproval | null;
    isOpen: boolean;
    onClose: () => void;
    onResolve: (conflictId: string, resolution: "ACCEPTED" | "REJECTED" | "ESCALATED", comment?: string) => Promise<void>;
}

/**
 * PM Approval Modal
 * Shows conflict details and allows resolution
 */
export function ApprovalModal({ approval, isOpen, onClose, onResolve }: ApprovalModalProps) {
    const [isPending, startTransition] = useTransition();
    const [comment, setComment] = useState("");
    const [showReject, setShowReject] = useState(false);

    if (!approval) return null;

    const isResolved = approval.state === "RESOLVED" || approval.state === "CLOSED";
    const isEscalated = approval.state === "ESCALATED";

    const handleResolve = (resolution: "ACCEPTED" | "REJECTED" | "ESCALATED") => {
        startTransition(async () => {
            try {
                await onResolve(approval.id, resolution, comment);
                toast.success(resolution === "ACCEPTED" ? "Conflict resolved" : `Item ${resolution.toLowerCase()}`);
                onClose();
                setComment("");
                setShowReject(false);
            } catch (error: any) {
                toast.error("Failed to resolve", { description: error.message });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isResolved ? "bg-green-500/10" : isEscalated ? "bg-purple-500/10" : "bg-amber-500/10"}`}>
                            {isResolved ? (
                                <CheckCircle className="h-6 w-6 text-green-600" weight="duotone" />
                            ) : isEscalated ? (
                                <ArrowRight className="h-6 w-6 text-purple-600" weight="duotone" />
                            ) : (
                                <Warning className="h-6 w-6 text-amber-600" weight="duotone" />
                            )}
                        </div>
                        {isResolved ? "Conflict Resolved" : isEscalated ? "Conflict Escalated" : "Resolve Conflict"}
                    </DialogTitle>
                    <DialogDescription>
                        {isResolved ? (
                            <>This conflict for <strong>{approval.poNumber}</strong> has been resolved.</>
                        ) : isEscalated ? (
                            <>This conflict for <strong>{approval.poNumber}</strong> has been escalated.</>
                        ) : (
                            <>Review the conflict for <strong>{approval.poNumber}</strong></>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Conflict Details */}
                    <div className="p-4 rounded-xl bg-muted">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Milestone</span>
                            <Badge variant="outline">{approval.type.replace("_", " ")}</Badge>
                        </div>
                        <p className="font-semibold">{approval.milestoneTitle}</p>
                        {approval.deviationPercent > 0 && (
                            <p className="text-sm text-amber-600 mt-1">
                                {approval.deviationPercent}% deviation detected
                            </p>
                        )}
                    </div>

                    {/* Priority Indicators */}
                    <div className="flex gap-2">
                        {approval.isCriticalPath && (
                            <Badge variant="destructive">Critical Path</Badge>
                        )}
                        {approval.isFinancialMilestone && (
                            <Badge className="bg-blue-100 text-blue-700">Financial</Badge>
                        )}
                        {approval.escalationLevel > 0 && (
                            <Badge className="bg-purple-100 text-purple-700">L{approval.escalationLevel} Escalation</Badge>
                        )}
                    </div>

                    {/* Description */}
                    {approval.description && (
                        <p className="text-sm text-muted-foreground">{approval.description}</p>
                    )}

                    {/* Resolved/Escalated State - Show confirmation */}
                    {(isResolved || isEscalated) ? (
                        <div className={`p-4 rounded-xl text-center ${isResolved ? "bg-green-50 dark:bg-green-500/10" : "bg-purple-50 dark:bg-purple-500/10"}`}>
                            <CheckCircle className={`h-10 w-10 mx-auto mb-2 ${isResolved ? "text-green-600" : "text-purple-600"}`} weight="duotone" />
                            <p className={`font-semibold ${isResolved ? "text-green-700 dark:text-green-400" : "text-purple-700 dark:text-purple-400"}`}>
                                {isResolved ? "This conflict has been resolved" : "This conflict has been escalated to higher authority"}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                No further action required.
                            </p>
                            <Button variant="outline" className="mt-4" onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    ) : (
                        /* Actions - Only show if not resolved */
                        <>
                            {!showReject ? (
                                <>
                                    <div>
                                        <Textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Add a note (optional)..."
                                            rows={2}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setShowReject(true)}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reject
                                        </Button>
                                        <Button
                                            className="flex-1"
                                            onClick={() => handleResolve("ACCEPTED")}
                                            disabled={isPending}
                                        >
                                            {isPending ? (
                                                <CircleNotch className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                            )}
                                            Accept & Resolve
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <Textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Reason for rejection/escalation..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setShowReject(false)}
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleResolve("REJECTED")}
                                            disabled={isPending}
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            className="bg-purple-600 hover:bg-purple-700"
                                            onClick={() => handleResolve("ESCALATED")}
                                            disabled={isPending}
                                        >
                                            <ArrowRight className="h-4 w-4 mr-2" />
                                            Escalate
                                        </Button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

