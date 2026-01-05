"use client";

/**
 * Usage Quota Dashboard Component
 * Displays AI usage statistics and quota limits
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    MagnifyingGlass,
    Robot,
    EnvelopeSimple,
    CurrencyDollar,
    Clock,
    WarningCircle,
} from "@phosphor-icons/react";

export interface QuotaStatus {
    ocr: { used: number; limit: number; remaining: number; percentage: number };
    aiParse: { used: number; limit: number; remaining: number; percentage: number };
    emailIngest: { used: number; limit: number; remaining: number; percentage: number };
    periodStart: Date;
    isOverLimit: boolean;
    estimatedCostThisMonth: number;
}

interface UsageQuotaDashboardProps {
    quota: QuotaStatus;
    className?: string;
}

function getUsageColor(percentage: number) {
    if (percentage >= 90) return "text-red-600 bg-red-100";
    if (percentage >= 75) return "text-amber-600 bg-amber-100";
    return "text-green-600 bg-green-100";
}

function getProgressColor(percentage: number) {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    return "bg-primary";
}

function UsageBar({
    label,
    icon: Icon,
    used,
    limit,
    percentage,
    unit = "",
}: {
    label: string;
    icon: React.ElementType;
    used: number;
    limit: number;
    percentage: number;
    unit?: string;
}) {
    const isNearLimit = percentage >= 90;
    const isWarning = percentage >= 75;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon size={18} weight="duotone" className="text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                    {isNearLimit && (
                        <WarningCircle size={14} className="text-red-500" />
                    )}
                    <span className={cn(
                        "text-sm font-medium",
                        isNearLimit && "text-red-600",
                        isWarning && !isNearLimit && "text-amber-600"
                    )}>
                        {used.toLocaleString()} / {limit.toLocaleString()}{unit}
                    </span>
                </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all",
                        getProgressColor(percentage)
                    )}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                />
            </div>
        </div>
    );
}

export function UsageQuotaDashboard({ quota, className }: UsageQuotaDashboardProps) {
    const periodStart = new Date(quota.periodStart);
    const daysInPeriod = Math.floor(
        (Date.now() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    const daysRemaining = Math.max(0, 30 - daysInPeriod);

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Usage & Quotas</CardTitle>
                        <CardDescription>AI processing usage this billing period</CardDescription>
                    </div>
                    {quota.isOverLimit && (
                        <Badge variant="destructive">
                            <WarningCircle size={14} className="mr-1" />
                            Limit Reached
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Usage bars */}
                <div className="space-y-4">
                    <UsageBar
                        label="OCR Pages"
                        icon={MagnifyingGlass}
                        used={quota.ocr.used}
                        limit={quota.ocr.limit}
                        percentage={quota.ocr.percentage}
                        unit=" pages"
                    />
                    <UsageBar
                        label="AI Document Parsing"
                        icon={Robot}
                        used={quota.aiParse.used}
                        limit={quota.aiParse.limit}
                        percentage={quota.aiParse.percentage}
                        unit=" docs"
                    />
                    <UsageBar
                        label="Email Ingestion"
                        icon={EnvelopeSimple}
                        used={quota.emailIngest.used}
                        limit={quota.emailIngest.limit}
                        percentage={quota.emailIngest.percentage}
                        unit=" emails"
                    />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-muted rounded-lg">
                            <CurrencyDollar size={18} className="text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Est. Cost</p>
                            <p className="text-sm font-medium">
                                ${quota.estimatedCostThisMonth.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-muted rounded-lg">
                            <Clock size={18} className="text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Days Remaining</p>
                            <p className="text-sm font-medium">{daysRemaining} days</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Compact usage indicator for headers/sidebars
 */
export function UsageIndicator({ quota }: { quota: QuotaStatus }) {
    const avgPercentage = (
        quota.ocr.percentage +
        quota.aiParse.percentage +
        quota.emailIngest.percentage
    ) / 3;

    const isWarning = avgPercentage >= 75;
    const isNearLimit = avgPercentage >= 90;

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            isNearLimit && "bg-red-100 text-red-700",
            isWarning && !isNearLimit && "bg-amber-100 text-amber-700",
            !isWarning && "bg-muted text-muted-foreground"
        )}>
            {isNearLimit && <WarningCircle size={14} weight="fill" />}
            <span>
                {Math.round(avgPercentage)}% quota used
            </span>
        </div>
    );
}
