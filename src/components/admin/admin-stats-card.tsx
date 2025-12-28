"use client";

import { cn } from "@/lib/utils";
import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react";

interface AdminStatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    icon?: React.ReactNode;
    variant?: "default" | "primary" | "success" | "warning" | "danger";
    className?: string;
}

export function AdminStatsCard({
    title,
    value,
    subtitle,
    trend,
    trendValue,
    icon,
    variant = "default",
    className,
}: AdminStatsCardProps) {
    const variantStyles = {
        default: "bg-card border",
        primary: "bg-blue-500/5 border-blue-500/20",
        success: "bg-green-500/5 border-green-500/20",
        warning: "bg-amber-500/5 border-amber-500/20",
        danger: "bg-red-500/5 border-red-500/20",
    };

    const iconVariants = {
        default: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        primary: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
        success: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
        warning: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
        danger: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
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
                variantStyles[variant],
                className
            )}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-3">
                    {/* Title */}
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {title}
                    </p>

                    {/* Value */}
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-bold tracking-tight">{value}</span>
                        {trend && trendValue && (
                            <span className={cn("flex items-center gap-1 text-sm font-semibold", trendColors[trend])}>
                                <TrendIcon className="h-4 w-4" weight="bold" />
                                {trendValue}
                            </span>
                        )}
                    </div>

                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                    )}
                </div>

                {/* Icon */}
                {icon && (
                    <div className={cn("p-3 rounded-xl", iconVariants[variant])}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
