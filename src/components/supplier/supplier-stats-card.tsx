"use client";

import { cn } from "@/lib/utils";
import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react";

interface SupplierStatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    icon?: React.ReactNode;
    variant?: "default" | "success" | "warning" | "danger";
}

export function SupplierStatsCard({
    title,
    value,
    subtitle,
    trend,
    trendValue,
    icon,
    variant = "default",
}: SupplierStatsCardProps) {
    const variantStyles = {
        default: "bg-card",
        success: "bg-green-500/5 border-green-500/10",
        warning: "bg-amber-500/5 border-amber-500/10",
        danger: "bg-red-500/5 border-red-500/10",
    };

    const trendColors = {
        up: "text-green-600",
        down: "text-red-600",
        neutral: "text-muted-foreground",
    };

    const TrendIcon = trend === "up" ? TrendUp : trend === "down" ? TrendDown : Minus;

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border p-6 transition-all hover:shadow-lg",
                variantStyles[variant]
            )}
        >
            {/* Icon */}
            {icon && (
                <div className="absolute top-4 right-4 text-muted-foreground/20">
                    {icon}
                </div>
            )}

            {/* Title */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                {title}
            </p>

            {/* Value */}
            <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold tracking-tight">{value}</span>
                {trend && trendValue && (
                    <span className={cn("flex items-center gap-1 text-sm font-semibold", trendColors[trend])}>
                        <TrendIcon className="h-4 w-4" weight="bold" />
                        {trendValue}
                    </span>
                )}
            </div>

            {/* Subtitle */}
            {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
        </div>
    );
}
