"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkle, TrendUp, TrendDown, Minus } from "@phosphor-icons/react";

interface AISummaryData {
    summary: string;
    sentiment: "positive" | "neutral" | "negative";
    keyPoints: string[];
}

interface AISummaryCardProps {
    data: AISummaryData | null;
    className?: string;
    loading?: boolean;
}

const sentimentConfig = {
    positive: {
        bg: "bg-gradient-to-br from-emerald-500/5 to-emerald-500/10",
        border: "border-emerald-500/20",
        icon: TrendUp,
        iconColor: "text-emerald-500",
        label: "On Track",
    },
    neutral: {
        bg: "bg-gradient-to-br from-amber-500/5 to-amber-500/10",
        border: "border-amber-500/20",
        icon: Minus,
        iconColor: "text-amber-500",
        label: "Attention Needed",
    },
    negative: {
        bg: "bg-gradient-to-br from-red-500/5 to-red-500/10",
        border: "border-red-500/20",
        icon: TrendDown,
        iconColor: "text-red-500",
        label: "Action Required",
    },
};

export function AISummaryCard({ data, className, loading }: AISummaryCardProps) {
    if (loading) {
        return (
            <Card className={cn("overflow-hidden", className)}>
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                        <div className="flex-1 space-y-3">
                            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                            <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card className={cn("overflow-hidden border-dashed", className)}>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-muted">
                            <Sparkle className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">AI Health Summary</p>
                            <p className="text-xs text-muted-foreground">
                                Add projects to see your portfolio health summary
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const config = sentimentConfig[data.sentiment];
    const SentimentIcon = config.icon;

    return (
        <Card
            className={cn(
                "overflow-hidden border-2",
                config.bg,
                config.border,
                className
            )}
        >
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    {/* AI Badge */}
                    <div className="flex-shrink-0">
                        <div
                            className={cn(
                                "relative p-3 rounded-xl",
                                "bg-gradient-to-br from-primary/10 to-primary/5",
                                "border border-primary/10"
                            )}
                        >
                            <Sparkle className="h-5 w-5 text-primary" />
                            <div className="absolute -top-1 -right-1">
                                <SentimentIcon
                                    className={cn("h-4 w-4", config.iconColor)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Weekly Health Summary
                            </span>
                            <span
                                className={cn(
                                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                    data.sentiment === "positive" &&
                                        "bg-emerald-500/10 text-emerald-600",
                                    data.sentiment === "neutral" &&
                                        "bg-amber-500/10 text-amber-600",
                                    data.sentiment === "negative" &&
                                        "bg-red-500/10 text-red-600"
                                )}
                            >
                                {config.label}
                            </span>
                        </div>

                        {/* Main Summary */}
                        <p className="text-sm leading-relaxed text-foreground mb-4">
                            {data.summary}
                        </p>

                        {/* Key Points */}
                        {data.keyPoints.length > 0 && (
                            <div className="space-y-1.5">
                                {data.keyPoints.map((point, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 text-xs text-muted-foreground"
                                    >
                                        <div className="h-1 w-1 rounded-full bg-primary/50" />
                                        <span>{point}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
