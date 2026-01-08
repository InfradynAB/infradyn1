"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, Warning, XCircle, CurrencyDollar } from "@phosphor-icons/react";

type PaymentStatus = "NOT_STARTED" | "PENDING" | "APPROVED" | "INVOICED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "REJECTED";

interface PaymentStatusBadgeProps {
    status: PaymentStatus | string;
    className?: string;
    showIcon?: boolean;
}

const statusConfig: Record<string, {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof CheckCircle;
    className: string;
}> = {
    NOT_STARTED: {
        label: "Not Started",
        variant: "outline",
        icon: Clock,
        className: "text-gray-500 border-gray-300",
    },
    PENDING: {
        label: "Pending",
        variant: "outline",
        icon: Clock,
        className: "text-amber-600 border-amber-300 bg-amber-50",
    },
    APPROVED: {
        label: "Approved",
        variant: "default",
        icon: CheckCircle,
        className: "bg-blue-500",
    },
    INVOICED: {
        label: "Invoiced",
        variant: "outline",
        icon: CurrencyDollar,
        className: "text-blue-600 border-blue-300 bg-blue-50",
    },
    PARTIALLY_PAID: {
        label: "Partial Payment",
        variant: "outline",
        icon: CurrencyDollar,
        className: "text-amber-600 border-amber-300 bg-amber-50",
    },
    PAID: {
        label: "Paid",
        variant: "default",
        icon: CheckCircle,
        className: "bg-green-500",
    },
    OVERDUE: {
        label: "Overdue",
        variant: "destructive",
        icon: Warning,
        className: "",
    },
    REJECTED: {
        label: "Rejected",
        variant: "destructive",
        icon: XCircle,
        className: "",
    },
};

export function PaymentStatusBadge({ status, className, showIcon = true }: PaymentStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} className={cn(config.className, className)}>
            {showIcon && <Icon className="mr-1 h-3 w-3" />}
            {config.label}
        </Badge>
    );
}

// CO Status Badge
type COStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

interface COStatusBadgeProps {
    status: COStatus | string;
    className?: string;
}

const coStatusConfig: Record<string, {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
}> = {
    DRAFT: {
        label: "Draft",
        variant: "outline",
        className: "text-gray-500 border-gray-300",
    },
    SUBMITTED: {
        label: "Submitted",
        variant: "outline",
        className: "text-blue-600 border-blue-300 bg-blue-50",
    },
    UNDER_REVIEW: {
        label: "Under Review",
        variant: "outline",
        className: "text-amber-600 border-amber-300 bg-amber-50",
    },
    APPROVED: {
        label: "Approved",
        variant: "default",
        className: "bg-green-500",
    },
    REJECTED: {
        label: "Rejected",
        variant: "destructive",
        className: "",
    },
};

export function COStatusBadge({ status, className }: COStatusBadgeProps) {
    const config = coStatusConfig[status] || coStatusConfig.DRAFT;

    return (
        <Badge variant={config.variant} className={cn(config.className, className)}>
            {config.label}
        </Badge>
    );
}

// Validation Status Badge
type ValidationStatus = "PENDING" | "PASSED" | "MISMATCH" | "FAILED";

interface ValidationStatusBadgeProps {
    status: ValidationStatus | string;
    className?: string;
}

const validationConfig: Record<string, {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
}> = {
    PENDING: {
        label: "Pending Validation",
        variant: "outline",
        className: "text-gray-500 border-gray-300",
    },
    PASSED: {
        label: "Validated",
        variant: "default",
        className: "bg-green-500",
    },
    MISMATCH: {
        label: "Mismatch",
        variant: "outline",
        className: "text-amber-600 border-amber-300 bg-amber-50",
    },
    FAILED: {
        label: "Failed",
        variant: "destructive",
        className: "",
    },
};

export function ValidationStatusBadge({ status, className }: ValidationStatusBadgeProps) {
    const config = validationConfig[status] || validationConfig.PENDING;

    return (
        <Badge variant={config.variant} className={cn(config.className, className)}>
            {config.label}
        </Badge>
    );
}
