"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Warning,
    CheckCircle,
    Clock,
    FileText,
    ArrowsClockwise,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AttentionItem {
    type: "draft_po" | "pending_invoice" | "pending_co" | "overdue_payment" | "critical_ncr";
    count: number;
    label: string;
    href: string;
}

interface AttentionData {
    hasIssues: boolean;
    items: AttentionItem[];
}

export function AttentionStrip() {
    const [data, setData] = useState<AttentionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAttentionData() {
            try {
                const response = await fetch("/api/dashboard/attention");
                const result = await response.json();
                if (result.success) {
                    setData(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch attention data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchAttentionData();
    }, []);

    if (loading) {
        return (
            <div className="h-16 bg-muted animate-pulse rounded-lg" />
        );
    }

    if (!data) return null;

    // All good state
    if (!data.hasIssues) {
        return (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                <AlertTitle className="text-green-900 dark:text-green-100 font-semibold">
                    All Up to Date
                </AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
                    All procurement items are current. No immediate action required.
                </AlertDescription>
            </Alert>
        );
    }

    // Has issues - show attention items
    return (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
            <Warning className="h-5 w-5 text-amber-600" weight="fill" />
            <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold mb-3">
                Attention Required
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
                <div className="flex flex-wrap gap-3">
                    {data.items.map((item, index) => (
                        <Link key={index} href={item.href}>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "bg-white dark:bg-gray-900 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50",
                                    "h-auto py-2 px-3 gap-2"
                                )}
                            >
                                <Badge variant="destructive" className="rounded-full px-2">
                                    {item.count}
                                </Badge>
                                <span className="text-sm font-medium">{item.label}</span>
                                {item.type === "draft_po" && <FileText className="h-4 w-4" />}
                                {item.type === "pending_invoice" && <Clock className="h-4 w-4" />}
                                {item.type === "pending_co" && <ArrowsClockwise className="h-4 w-4" />}
                                {item.type === "overdue_payment" && <Warning className="h-4 w-4" />}
                            </Button>
                        </Link>
                    ))}
                </div>
            </AlertDescription>
        </Alert>
    );
}
