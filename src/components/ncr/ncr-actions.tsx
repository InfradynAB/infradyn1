"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CheckCircle, Download, MoreHorizontal, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CloseNCRDialog } from "./close-ncr-dialog";

interface NCRActionsProps {
    ncrId: string;
    ncrNumber: string;
    status: string;
    requiresCreditNote: boolean;
    supplierEmail?: string;
}

export function NCRActions({
    ncrId,
    ncrNumber,
    status,
    requiresCreditNote,
    supplierEmail
}: NCRActionsProps) {
    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [sendingLink, setSendingLink] = useState(false);

    const handleExportAuditLog = async () => {
        setExporting(true);
        try {
            const res = await fetch(`/api/ncr/${ncrId}/export`);
            if (!res.ok) throw new Error("Export failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${ncrNumber}-audit-log.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Audit log exported");
        } catch (error) {
            toast.error("Failed to export audit log");
            console.error("Export error:", error);
        } finally {
            setExporting(false);
        }
    };

    const handleSendMagicLink = async () => {
        setSendingLink(true);
        try {
            const res = await fetch(`/api/ncr/${ncrId}/magic-link`, {
                method: "POST",
            });
            const result = await res.json();

            if (result.success) {
                toast.success(`Magic link sent to supplier`);
            } else {
                toast.error(result.error || "Failed to send magic link");
            }
        } catch (error) {
            toast.error("Failed to send magic link");
        } finally {
            setSendingLink(false);
        }
    };

    const isClosed = status === "CLOSED";

    return (
        <>
            <div className="flex items-center gap-2">
                {/* Close NCR Button - Only show if not closed */}
                {!isClosed && (
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setShowCloseDialog(true)}
                    >
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Close NCR
                    </Button>
                )}

                {/* More Actions Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={handleSendMagicLink}
                            disabled={sendingLink || isClosed}
                        >
                            {sendingLink ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Send to Supplier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleExportAuditLog}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Export Audit Log
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Close NCR Dialog */}
            <CloseNCRDialog
                open={showCloseDialog}
                onOpenChange={setShowCloseDialog}
                ncrId={ncrId}
                ncrNumber={ncrNumber}
                requiresCreditNote={requiresCreditNote}
                onSuccess={() => {
                    // Refresh the page to show updated status
                    window.location.reload();
                }}
            />
        </>
    );
}
