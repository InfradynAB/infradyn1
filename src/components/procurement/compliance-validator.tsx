"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CheckCircleIcon, XCircleIcon, WarningIcon, ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { ConflictResolutionDialog, type ConflictDetails } from "./conflict-resolution-dialog";

export interface ComplianceRule {
    id: string;
    name: string;
    description: string;
    severity: "critical" | "warning" | "info";
    status: "pass" | "fail" | "warning";
    message?: string;
    targetStep?: "upload" | "details" | "milestones" | "boq"; // Which step to navigate to for fix
    currentValue?: string | number;
    expectedValue?: string | number;
    fixType?: "navigate" | "edit_value" | "auto_fix" | "info_only";
    fixLabel?: string;
    field?: string;
}

interface ComplianceData {
    poNumber?: string | null;
    totalValue?: number | null;
    currency?: string | null;
    incoterms?: string | null;
    retentionPercentage?: number | null;
    paymentTerms?: string | null;
    milestones?: { paymentPercentage: number }[];
    boqItems?: { totalPrice: number; isCritical?: boolean; rosStatus?: string }[];
    projectCurrency?: string | null;
}

interface ComplianceValidatorProps {
    data: ComplianceData;
    onNavigateToStep?: (step: "upload" | "details" | "milestones" | "boq") => void;
    onUpdateValue?: (field: string, value: string | number) => void;
}

function runValidation(data: ComplianceData): ComplianceRule[] {
    const rules: ComplianceRule[] = [];

    // Rule 1: PO Number required
    rules.push({
        id: "po-number",
        name: "PO Number",
        description: "PO must have a unique identifier. This is required for tracking and reference.",
        severity: "critical",
        status: data.poNumber ? "pass" : "fail",
        message: data.poNumber ? undefined : "PO number is missing",
        targetStep: "details",
        currentValue: data.poNumber || undefined,
        expectedValue: "A unique PO reference number",
        fixType: "navigate",
        field: "poNumber",
    });

    // Rule 2: Total value required
    rules.push({
        id: "total-value",
        name: "Total Value",
        description: "The PO must have a total contract value greater than zero.",
        severity: "critical",
        status: data.totalValue && data.totalValue > 0 ? "pass" : "fail",
        message: data.totalValue ? undefined : "Total value is missing or zero",
        targetStep: "details",
        currentValue: data.totalValue || 0,
        expectedValue: "A positive contract value",
        fixType: "navigate",
        field: "totalValue",
    });

    // Rule 3: Incoterms should be set
    rules.push({
        id: "incoterms",
        name: "Incoterms",
        description: "International trade terms define shipping and delivery responsibilities. Common values: FOB, CIF, DDP, EXW.",
        severity: "warning",
        status: data.incoterms ? "pass" : "warning",
        message: data.incoterms ? undefined : "Incoterms not specified",
        targetStep: "details",
        currentValue: data.incoterms || "Not set",
        expectedValue: "FOB, CIF, DDP, or EXW",
        fixType: "navigate",
        field: "incoterms",
    });

    // Rule 4: Retention percentage reasonable
    const retention = data.retentionPercentage || 0;
    rules.push({
        id: "retention",
        name: "Retention Percentage",
        description: "Retention is typically 5-10% held until project completion. Values above 20% are unusual.",
        severity: "warning",
        status: retention >= 0 && retention <= 20 ? "pass" : "warning",
        message: retention > 20 ? `Retention ${retention}% exceeds typical 20%` : undefined,
        targetStep: "details",
        currentValue: retention,
        expectedValue: "0% - 20%",
        fixType: "navigate",
        field: "retentionPercentage",
    });

    // Rule 5: Currency matches project
    if (data.projectCurrency && data.currency) {
        rules.push({
            id: "currency-match",
            name: "Currency Match",
            description: "PO currency should match the project's base currency to avoid exchange rate complications.",
            severity: "warning",
            status: data.currency === data.projectCurrency ? "pass" : "warning",
            message: data.currency !== data.projectCurrency
                ? `PO uses ${data.currency}, project uses ${data.projectCurrency}`
                : undefined,
            targetStep: "details",
            currentValue: data.currency,
            expectedValue: data.projectCurrency,
            fixType: "navigate",
            field: "currency",
        });
    }

    // Rule 6: Milestone percentages sum to 100
    if (data.milestones && data.milestones.length > 0) {
        const totalPct = data.milestones.reduce((sum, m) => sum + (m.paymentPercentage || 0), 0);
        rules.push({
            id: "milestone-sum",
            name: "Milestone Percentages",
            description: "All milestone payment percentages must sum to exactly 100% to ensure complete payment coverage.",
            severity: "critical",
            status: totalPct === 100 ? "pass" : "fail",
            message: totalPct !== 100 ? `Milestones sum to ${totalPct}%, not 100%` : undefined,
            targetStep: "milestones",
            currentValue: `${totalPct}%`,
            expectedValue: "100%",
            fixType: "navigate",
            fixLabel: "Adjust milestone percentages to total 100%",
        });
    }

    // Rule 7: BOQ total matches PO total
    if (data.boqItems && data.boqItems.length > 0 && data.totalValue) {
        const boqTotal = data.boqItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        const diff = Math.abs(boqTotal - data.totalValue);
        const tolerance = data.totalValue * 0.01; // 1% tolerance
        rules.push({
            id: "boq-match",
            name: "BOQ Total Match",
            description: "The sum of all BOQ line items must match the PO total value (within 1% tolerance).",
            severity: "critical",
            status: diff <= tolerance ? "pass" : "fail",
            message: diff > tolerance
                ? `BOQ total (${boqTotal.toLocaleString()}) does not match PO total (${data.totalValue.toLocaleString()})`
                : undefined,
            targetStep: "boq",
            currentValue: boqTotal,
            expectedValue: data.totalValue,
            fixType: "auto_fix",
            fixLabel: "You can either: 1) Update the PO Total Value to match BOQ, or 2) Edit BOQ items to match PO Total",
            field: "totalValue",
        });
    }

    // Rule 8: Critical items have ROS dates
    if (data.boqItems) {
        const criticalWithoutROS = data.boqItems.filter(
            (item) => item.isCritical && item.rosStatus === "NOT_SET"
        );
        if (criticalWithoutROS.length > 0) {
            rules.push({
                id: "critical-ros",
                name: "Critical ROS Dates",
                description: "Critical items need Required On Site (ROS) dates for proper delivery tracking and scheduling.",
                severity: "critical",
                status: "fail",
                message: `${criticalWithoutROS.length} critical items missing ROS dates`,
                targetStep: "boq",
                currentValue: `${criticalWithoutROS.length} items without dates`,
                expectedValue: "All critical items with ROS dates",
                fixType: "navigate",
            });
        } else if (data.boqItems.some((item) => item.isCritical)) {
            rules.push({
                id: "critical-ros",
                name: "Critical ROS Dates",
                description: "All critical items must have ROS dates",
                severity: "critical",
                status: "pass",
                targetStep: "boq",
            });
        }
    }

    // Rule 9: Payment terms specified
    rules.push({
        id: "payment-terms",
        name: "Payment Terms",
        description: "Payment terms define when and how payments are made. Example: 'Net 30', '50% upfront, 50% on delivery'.",
        severity: "info",
        status: data.paymentTerms ? "pass" : "warning",
        message: data.paymentTerms ? undefined : "Payment terms not specified",
        targetStep: "details",
        currentValue: data.paymentTerms || "Not set",
        expectedValue: "Clear payment schedule or terms",
        fixType: "navigate",
        field: "paymentTerms",
    });

    return rules;
}

export function ComplianceValidator({ data, onNavigateToStep, onUpdateValue }: ComplianceValidatorProps) {
    const rules = runValidation(data);
    const [selectedConflict, setSelectedConflict] = useState<ConflictDetails | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const criticalFails = rules.filter(r => r.severity === "critical" && r.status === "fail");
    const canPublish = criticalFails.length === 0;

    const handleClick = (rule: ComplianceRule) => {
        if (rule.status === "pass") return;

        // Convert rule to ConflictDetails for the dialog
        const conflict: ConflictDetails = {
            id: rule.id,
            type: rule.severity,
            title: rule.name,
            description: rule.message || rule.description,
            currentValue: rule.currentValue,
            expectedValue: rule.expectedValue,
            step: rule.targetStep,
            fixType: rule.fixType || "navigate",
            fixLabel: rule.fixLabel,
            field: rule.field,
        };

        setSelectedConflict(conflict);
        setDialogOpen(true);
    };

    const handleNavigateFromDialog = (step: string) => {
        if (onNavigateToStep && (step === "upload" || step === "details" || step === "milestones" || step === "boq")) {
            onNavigateToStep(step);
        }
    };

    const handleAutoFix = (conflictId: string) => {
        // For BOQ match, we could update the PO total to match BOQ
        if (conflictId === "boq-match" && data.boqItems && onUpdateValue) {
            const boqTotal = data.boqItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
            onUpdateValue("totalValue", boqTotal);
        }
    };

    const stepLabels = {
        upload: "Upload",
        details: "PO Details",
        milestones: "Milestones",
        boq: "BOQ & ROS",
    };

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Contract Compliance</CardTitle>
                            <CardDescription>
                                Validation checks before publishing PO. Click any issue to fix it.
                            </CardDescription>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${canPublish
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                            }`}>
                            {canPublish ? "Ready to Publish" : `${criticalFails.length} Issue(s)`}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {rules.map((rule) => {
                        const isClickable = rule.status !== "pass";

                        return (
                            <div
                                key={rule.id}
                                onClick={() => isClickable && handleClick(rule)}
                                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${rule.status === "fail"
                                    ? "bg-red-50 dark:bg-red-950/30"
                                    : rule.status === "warning"
                                        ? "bg-amber-50 dark:bg-amber-950/30"
                                        : "bg-green-50/50 dark:bg-green-950/20"
                                    } ${isClickable ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : ""}`}
                            >
                                {rule.status === "pass" && (
                                    <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" weight="fill" />
                                )}
                                {rule.status === "fail" && (
                                    <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0" weight="fill" />
                                )}
                                {rule.status === "warning" && (
                                    <WarningIcon className="h-5 w-5 text-amber-600 flex-shrink-0" weight="fill" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{rule.name}</p>
                                    {rule.message && (
                                        <p className="text-xs text-muted-foreground">{rule.message}</p>
                                    )}
                                </div>
                                {isClickable && rule.targetStep && (
                                    <button
                                        type="button"
                                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClick(rule);
                                        }}
                                    >
                                        Fix in {stepLabels[rule.targetStep]}
                                        <ArrowRightIcon className="h-3 w-3" />
                                    </button>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded ${rule.severity === "critical"
                                    ? "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200"
                                    : rule.severity === "warning"
                                        ? "bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                                        : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                    }`}>
                                    {rule.severity}
                                </span>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <ConflictResolutionDialog
                conflict={selectedConflict}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onNavigateToStep={handleNavigateFromDialog}
                onUpdateValue={onUpdateValue}
                onAutoFix={handleAutoFix}
            />
        </>
    );
}

export { runValidation };

