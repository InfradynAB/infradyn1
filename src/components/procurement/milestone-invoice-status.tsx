"use client";

import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle, Clock, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface MilestoneInvoiceStatusProps {
    percentComplete: number;
    hasInvoice: boolean;
    invoiceStatus?: string;
    compact?: boolean;
}

/**
 * Shows the invoice readiness status of a milestone based on progress
 * - Not Ready: < 100% complete
 * - Ready to Invoice: 100% complete, no invoice yet
 * - Invoiced: Has an invoice (shows invoice status)
 */
export function MilestoneInvoiceStatus({
    percentComplete,
    hasInvoice,
    invoiceStatus,
    compact = false,
}: MilestoneInvoiceStatusProps) {
    const progress = Number(percentComplete) || 0;

    // Already has invoice - show invoice status
    if (hasInvoice) {
        const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
            PENDING: { color: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" />, label: "Pending Payment" },
            PAID: { color: "bg-green-100 text-green-700", icon: <CheckCircle className="h-3 w-3" />, label: "Paid" },
            PARTIALLY_PAID: { color: "bg-blue-100 text-blue-700", icon: <Receipt className="h-3 w-3" />, label: "Partial" },
            OVERDUE: { color: "bg-red-100 text-red-700", icon: <Warning className="h-3 w-3" />, label: "Overdue" },
        };

        const config = statusConfig[invoiceStatus || "PENDING"] || statusConfig.PENDING;

        if (compact) {
            return (
                <span className={cn("inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded", config.color)}>
                    {config.icon}
                </span>
            );
        }

        return (
            <Badge variant="secondary" className={cn("gap-1", config.color)}>
                {config.icon}
                {config.label}
            </Badge>
        );
    }

    // 100% complete but no invoice = Ready to Invoice
    if (progress >= 100) {
        if (compact) {
            return (
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium animate-pulse">
                    <Receipt className="h-3 w-3" />
                </span>
            );
        }

        return (
            <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-300 animate-pulse">
                <Receipt className="h-3 w-3" />
                Ready to Invoice
            </Badge>
        );
    }

    // Not complete yet
    if (compact) {
        return (
            <span className="text-xs text-muted-foreground">
                {progress}%
            </span>
        );
    }

    return (
        <span className="text-xs text-muted-foreground">
            {progress}% complete
        </span>
    );
}
