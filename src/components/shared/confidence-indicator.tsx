"use client";

/**
 * Confidence Indicator Component
 * Displays AI extraction confidence with color-coded visuals and breakdown
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
    CheckCircle,
    Warning,
    WarningCircle,
    Eye,
    CaretDown,
} from "@phosphor-icons/react";

export interface FieldConfidence {
    value: number;
    reason?: string;
}

export interface ConfidenceBreakdown {
    overall: number;
    fields: Record<string, FieldConfidence>;
    factors: {
        textQuality: number;
        patternMatch: number;
        crossValidation: number;
        completeness: number;
    };
    requiresReview: boolean;
    reviewReason?: string;
}

interface ConfidenceIndicatorProps {
    score: number;
    breakdown?: ConfidenceBreakdown;
    showLabel?: boolean;
    size?: "sm" | "md" | "lg";
    expandable?: boolean;
    className?: string;
}

function getConfidenceLevel(score: number): "high" | "medium" | "low" {
    if (score >= 0.85) return "high";
    if (score >= 0.65) return "medium";
    return "low";
}

function getConfidenceColor(level: "high" | "medium" | "low") {
    switch (level) {
        case "high":
            return "text-green-600 bg-green-100 border-green-200";
        case "medium":
            return "text-amber-600 bg-amber-100 border-amber-200";
        case "low":
            return "text-red-600 bg-red-100 border-red-200";
    }
}

function getProgressColor(level: "high" | "medium" | "low") {
    switch (level) {
        case "high":
            return "bg-green-500";
        case "medium":
            return "bg-amber-500";
        case "low":
            return "bg-red-500";
    }
}

function ConfidenceIcon({ level, size }: { level: "high" | "medium" | "low"; size: number }) {
    switch (level) {
        case "high":
            return <CheckCircle size={size} weight="fill" className="text-green-600" />;
        case "medium":
            return <Warning size={size} weight="fill" className="text-amber-600" />;
        case "low":
            return <WarningCircle size={size} weight="fill" className="text-red-600" />;
    }
}

export function ConfidenceIndicator({
    score,
    breakdown,
    showLabel = true,
    size = "md",
    expandable = true,
    className,
}: ConfidenceIndicatorProps) {
    const level = getConfidenceLevel(score);
    const percentage = Math.round(score * 100);

    const sizeClasses = {
        sm: "text-xs h-5",
        md: "text-sm h-6",
        lg: "text-base h-8",
    };

    const iconSize = size === "sm" ? 12 : size === "md" ? 16 : 20;

    const indicator = (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 px-2 rounded-full border",
                getConfidenceColor(level),
                sizeClasses[size],
                className
            )}
        >
            <ConfidenceIcon level={level} size={iconSize} />
            {showLabel && (
                <span className="font-medium">{percentage}%</span>
            )}
            {expandable && breakdown && (
                <CaretDown size={12} className="opacity-60" />
            )}
        </div>
    );

    if (!expandable || !breakdown) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>{indicator}</TooltipTrigger>
                    <TooltipContent>
                        <p>
                            {level === "high" && "High confidence extraction"}
                            {level === "medium" && "Moderate confidence - review recommended"}
                            {level === "low" && "Low confidence - review required"}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="cursor-pointer">{indicator}</button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Confidence Breakdown</h4>
                        <Badge variant={level === "high" ? "default" : level === "medium" ? "secondary" : "destructive"}>
                            {percentage}% {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Badge>
                    </div>

                    {/* Review warning */}
                    {breakdown.requiresReview && (
                        <div className="flex items-start gap-2 p-2 bg-amber-50 text-amber-800 rounded-md text-xs">
                            <Eye size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{breakdown.reviewReason || "Manual review recommended"}</span>
                        </div>
                    )}

                    {/* Factor breakdown */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Quality Factors
                        </p>

                        <FactorBar label="Text Quality" value={breakdown.factors.textQuality} />
                        <FactorBar label="Pattern Match" value={breakdown.factors.patternMatch} />
                        <FactorBar label="Cross-Validation" value={breakdown.factors.crossValidation} />
                        <FactorBar label="Completeness" value={breakdown.factors.completeness} />
                    </div>

                    {/* Field confidences */}
                    {Object.keys(breakdown.fields).length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Field Confidence
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                                {Object.entries(breakdown.fields).map(([field, conf]) => (
                                    <div key={field} className="flex items-center justify-between">
                                        <span className="text-muted-foreground capitalize">
                                            {field.replace(/([A-Z])/g, " $1").trim()}
                                        </span>
                                        <span
                                            className={cn(
                                                "font-medium",
                                                conf.value >= 0.85 && "text-green-600",
                                                conf.value >= 0.65 && conf.value < 0.85 && "text-amber-600",
                                                conf.value < 0.65 && "text-red-600"
                                            )}
                                        >
                                            {Math.round(conf.value * 100)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function FactorBar({ label, value }: { label: string; value: number }) {
    const level = getConfidenceLevel(value);
    const percentage = Math.round(value * 100);

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{percentage}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all", getProgressColor(level))}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

/**
 * Simple confidence badge without breakdown
 */
export function ConfidenceBadge({
    score,
    className
}: {
    score: number;
    className?: string;
}) {
    const level = getConfidenceLevel(score);
    const percentage = Math.round(score * 100);

    return (
        <Badge
            variant="outline"
            className={cn(
                getConfidenceColor(level),
                className
            )}
        >
            <ConfidenceIcon level={level} size={12} />
            <span className="ml-1">{percentage}%</span>
        </Badge>
    );
}

/**
 * Confidence bar for use in tables/lists
 */
export function ConfidenceBar({
    score,
    width = 60,
    className
}: {
    score: number;
    width?: number;
    className?: string;
}) {
    const level = getConfidenceLevel(score);
    const percentage = Math.round(score * 100);

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn("h-2 bg-muted rounded-full overflow-hidden", className)}
                        style={{ width }}
                    >
                        <div
                            className={cn("h-full rounded-full", getProgressColor(level))}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{percentage}% confidence</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
