"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PaperPlaneTilt, CircleNotch, CheckCircle, Warning } from "@phosphor-icons/react";
import { submitPurchaseOrder } from "@/lib/actions/procurement";
import { toast } from "sonner";

interface SubmitPOButtonProps {
    poId: string;
    poNumber: string;
    status: string;
}

export function SubmitPOButton({ poId, poNumber, status }: SubmitPOButtonProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Only show button for DRAFT status
    if (status !== "DRAFT") {
        return null;
    }

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const result = await submitPurchaseOrder(poId);

            if (result.success) {
                setShowSuccess(true);
                toast.success(`PO ${poNumber} submitted successfully!`, {
                    description: "The purchase order has been submitted and saved to the database.",
                    duration: 5000,
                });
                // Refresh the page after short delay to show updated status
                setTimeout(() => {
                    router.refresh();
                }, 1500);
            } else {
                toast.error("Failed to submit PO", {
                    description: result.error || "An unexpected error occurred",
                });
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error("Failed to submit PO", {
                description: "An unexpected error occurred. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSuccess) {
        return (
            <Button 
                variant="default" 
                className="bg-emerald-600 hover:bg-emerald-600 cursor-default"
                disabled
            >
                <CheckCircle className="mr-2 h-4 w-4" weight="fill" />
                Submitted!
            </Button>
        );
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button 
                    variant="default" 
                    className="bg-[#1E293B] hover:bg-[#334155]"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <PaperPlaneTilt className="mr-2 h-4 w-4" weight="fill" />
                            Submit PO
                        </>
                    )}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Warning className="h-5 w-5 text-amber-500" weight="fill" />
                        Submit Purchase Order?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            You are about to submit <strong>{poNumber}</strong>. 
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Once submitted, this PO will be marked as &quot;Submitted&quot; and ready for approval. 
                            You can still edit the PO after submission if needed.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-[#1E293B] hover:bg-[#334155]"
                    >
                        {isSubmitting ? (
                            <>
                                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <PaperPlaneTilt className="mr-2 h-4 w-4" weight="fill" />
                                Yes, Submit PO
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
