"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Upload, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { EvidenceUpload } from "./evidence-upload";

interface UploadedFile {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
}

interface CloseNCRDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ncrId: string;
    ncrNumber: string;
    requiresCreditNote: boolean;
    onSuccess?: () => void;
}

export function CloseNCRDialog({
    open,
    onOpenChange,
    ncrId,
    ncrNumber,
    requiresCreditNote,
    onSuccess,
}: CloseNCRDialogProps) {
    const [loading, setLoading] = useState(false);
    const [proofUploaded, setProofUploaded] = useState(false);
    const [uploadedProof, setUploadedProof] = useState<UploadedFile[]>([]);
    const [creditNoteUploaded, setCreditNoteUploaded] = useState(false);
    const [uploadedCreditNote, setUploadedCreditNote] = useState<UploadedFile[]>([]);
    const [closureNotes, setClosureNotes] = useState("");
    const [confirmed, setConfirmed] = useState(false);

    const canClose =
        proofUploaded &&
        uploadedProof.length > 0 &&
        confirmed &&
        (!requiresCreditNote || (creditNoteUploaded && uploadedCreditNote.length > 0));

    const handleClose = async () => {
        if (!canClose) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/ncr/${ncrId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "CLOSED",
                    closureNotes,
                    proofOfFixDocId: uploadedProof[0]?.id,
                    creditNoteDocId: requiresCreditNote ? uploadedCreditNote[0]?.id : undefined,
                }),
            });

            const result = await res.json();
            if (result.success) {
                toast.success(`${ncrNumber} closed successfully`);
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error(result.error || "Failed to close NCR");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleProofUploaded = (files: UploadedFile[]) => {
        setUploadedProof(files);
        setProofUploaded(files.length > 0);
    };

    const handleCreditNoteUploaded = (files: UploadedFile[]) => {
        setUploadedCreditNote(files);
        setCreditNoteUploaded(files.length > 0);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Close NCR: {ncrNumber}
                    </DialogTitle>
                    <DialogDescription>
                        Provide proof of fix to close this non-conformance report.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Credit Note Warning */}
                    {requiresCreditNote && (
                        <Alert className="bg-amber-50 border-amber-200">
                            <CreditCard className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                                <strong>Payment Shield Active:</strong> This item was already paid.
                                A credit note is required before closure.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Proof of Fix Upload */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Proof of Fix (Required)
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Upload photo or document showing the defect has been resolved.
                        </p>
                        <EvidenceUpload
                            ncrId={ncrId}
                            onUploadComplete={handleProofUploaded}
                            maxFiles={3}
                        />
                        {proofUploaded && uploadedProof.length > 0 && (
                            <p className="text-sm text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Proof of fix uploaded
                            </p>
                        )}
                    </div>

                    {/* Credit Note Upload (Conditional) */}
                    {requiresCreditNote && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Credit Note (Required)
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Upload credit note or adjustment documentation.
                            </p>
                            <EvidenceUpload
                                ncrId={ncrId}
                                onUploadComplete={handleCreditNoteUploaded}
                                maxFiles={1}
                            />
                            {creditNoteUploaded && uploadedCreditNote.length > 0 && (
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4" />
                                    Credit note uploaded
                                </p>
                            )}
                        </div>
                    )}

                    {/* Closure Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Closure Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Final comments on resolution..."
                            value={closureNotes}
                            onChange={(e) => setClosureNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Confirmation Checkbox */}
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Checkbox
                            id="confirm"
                            checked={confirmed}
                            onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                        />
                        <Label htmlFor="confirm" className="text-sm leading-relaxed cursor-pointer">
                            I confirm that the defect has been verified as fixed and the NCR can be closed.
                            {requiresCreditNote && " The credit note has been recorded in our financial system."}
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleClose}
                        disabled={!canClose || loading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Close NCR
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
