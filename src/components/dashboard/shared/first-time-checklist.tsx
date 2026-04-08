"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Circle, ArrowRight, X, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UserRole = "SUPPLIER" | "SITE_RECEIVER" | "PM" | "QA" | "ADMIN";

interface ChecklistItem {
    id: string;
    label: string;
    href: string;
    completed: boolean;
    description?: string;
}

interface FirstTimeChecklistProps {
    role: UserRole;
    /** Supplier: readiness 0-100, has POs, has responded to NCR */
    supplierData?: { readinessScore: number; poCount: number; ncrRespondedCount: number };
    /** Receiver: has confirmed delivery, has viewed POs */
    receiverData?: { confirmedCount: number; hasViewedPos: boolean };
    /** PM: has created PO, has viewed dashboard */
    pmData?: { poCount: number; hasViewedDashboard: boolean };
    storageKey?: string;
    className?: string;
}

const SUPPLIER_ITEMS = (
    _data: { readinessScore: number; poCount: number; ncrRespondedCount: number; openNcrs: number }
): Omit<ChecklistItem, "completed">[] => [
    {
        id: "profile",
        label: "Complete your profile",
        href: "/dashboard/supplier/onboarding",
        description: "Upload certifications and company details",
    },
    {
        id: "view-pos",
        label: "View your purchase orders",
        href: "/dashboard/supplier/pos",
        description: "See orders assigned to you",
    },
    {
        id: "respond-ncr",
        label: "Respond to an NCR (if any)",
        href: "/dashboard/supplier/pos?filter=ncr",
        description: "Address quality issues when raised",
    },
];

const RECEIVER_ITEMS = (
    _data: { confirmedCount: number; hasViewedPos: boolean }
): Omit<ChecklistItem, "completed">[] => [
    {
        id: "confirm-delivery",
        label: "Confirm your first delivery",
        href: "/dashboard/receiver/deliveries",
        description: "Sign off when materials arrive on site",
    },
    {
        id: "view-pos",
        label: "View PO tracking",
        href: "/dashboard/receiver/pos",
        description: "Track delivery status by purchase order",
    },
    {
        id: "raise-ncr",
        label: "Raise an NCR if needed",
        href: "/dashboard/receiver/ncr/new",
        description: "Report damaged or non-conforming materials",
    },
];

const PM_ITEMS = (_data: { poCount: number; hasViewedDashboard: boolean }): Omit<ChecklistItem, "completed">[] => [
    {
        id: "create-po",
        label: "Create your first purchase order",
        href: "/dashboard/procurement/new",
        description: "Add suppliers and start tracking",
    },
    {
        id: "view-dashboard",
        label: "Explore the PM dashboard",
        href: "/dashboard/pm",
        description: "Overview, deliveries, quality & milestones",
    },
    {
        id: "add-supplier",
        label: "Add a supplier",
        href: "/dashboard/suppliers",
        description: "Onboard suppliers to receive POs",
    },
];

function getItemsAndCompleted(
    role: UserRole,
    supplierData?: FirstTimeChecklistProps["supplierData"],
    receiverData?: FirstTimeChecklistProps["receiverData"],
    pmData?: FirstTimeChecklistProps["pmData"]
): ChecklistItem[] {
    if (role === "SUPPLIER" && supplierData) {
        const items = SUPPLIER_ITEMS(supplierData);
        return items.map((item) => ({
            ...item,
            completed:
                item.id === "profile"
                    ? supplierData.readinessScore >= 100
                    : item.id === "view-pos"
                    ? supplierData.poCount > 0
                    : item.id === "respond-ncr"
                    ? supplierData.ncrRespondedCount > 0 || supplierData.openNcrs === 0
                    : false,
        }));
    }
    if (role === "SITE_RECEIVER" && receiverData) {
        const items = RECEIVER_ITEMS(receiverData);
        return items.map((item) => ({
            ...item,
            completed:
                item.id === "confirm-delivery"
                    ? receiverData.confirmedCount > 0
                    : item.id === "view-pos"
                    ? receiverData.hasViewedPos
                    : item.id === "raise-ncr"
                    ? false
                    : false,
        }));
    }
    if ((role === "PM" || role === "ADMIN" || role === "QA") && pmData) {
        const items = PM_ITEMS(pmData);
        return items.map((item) => ({
            ...item,
            completed:
                item.id === "create-po"
                    ? pmData.poCount > 0
                    : item.id === "view-dashboard"
                    ? pmData.hasViewedDashboard
                    : false,
        }));
    }
    return [];
}

export function FirstTimeChecklist({
    role,
    supplierData,
    receiverData,
    pmData,
    storageKey = "infradyn-first-time-checklist-dismissed",
    className,
}: FirstTimeChecklistProps) {
    const [dismissed, setDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const val = localStorage.getItem(storageKey);
            setDismissed(val === "true");
        } catch {
            setDismissed(false);
        }
    }, [storageKey]);

    const items = getItemsAndCompleted(role, supplierData, receiverData, pmData);
    const completedCount = items.filter((i) => i.completed).length;
    const allDone = completedCount === items.length;

    if (!mounted || items.length === 0 || dismissed || allDone) return null;

    const handleDismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(storageKey, "true");
        } catch {}
    };

    return (
        <div
            className={cn(
                "rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5 space-y-4",
                className
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                        <Sparkle className="h-5 w-5 text-primary" weight="fill" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Get started</h3>
                        <p className="text-xs text-muted-foreground">
                            {completedCount} of {items.length} steps complete
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={handleDismiss}
                    aria-label="Dismiss checklist"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-2">
                {items.map((item) => (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                            item.completed
                                ? "border-emerald-500/20 bg-emerald-500/5"
                                : "border-border/60 bg-background/50 hover:bg-muted/50 hover:border-primary/30"
                        )}
                    >
                        <div className="shrink-0">
                            {item.completed ? (
                                <CheckCircle className="h-5 w-5 text-emerald-500" weight="fill" />
                            ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p
                                className={cn(
                                    "text-sm font-medium",
                                    item.completed ? "text-muted-foreground line-through" : "text-foreground"
                                )}
                            >
                                {item.label}
                            </p>
                            {item.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            )}
                        </div>
                        {!item.completed && (
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
