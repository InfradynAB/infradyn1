"use client";

import { Info } from "@phosphor-icons/react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpTooltipProps {
    content: string;
    className?: string;
}

export function HelpTooltip({ content, className }: HelpTooltipProps) {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className={`inline-flex items-center justify-center rounded-full hover:bg-muted transition-colors ${className}`}
                        aria-label="More information"
                    >
                        <Info className="h-4 w-4 text-muted-foreground" weight="fill" />
                    </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <p className="text-sm">{content}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// Predefined tooltips for common terms
export const TOOLTIPS = {
    totalCommitted: "Total value of all active purchase orders across your projects",
    totalPaid: "Amount already paid to suppliers for completed work or deliveries",
    pendingPayments: "Invoices submitted by suppliers awaiting your approval and payment",
    overdue: "Payments that are past their due date and need immediate attention",
    progressBySupplier: "Track how much work each supplier has completed compared to their milestones",
    changeOrderImpact: "Summary of approved and pending changes that affect project cost or schedule",
    ncr: "Non-Conformance Reports - issues where materials or work don't meet quality standards",
    boq: "Bill of Quantities - detailed list of materials, parts, and labor required for the project",
    ros: "Rate of Supply - schedule showing when materials should arrive from suppliers",
    retention: "Money held back from payments (usually 5-10%) until project completion as quality assurance",
};
