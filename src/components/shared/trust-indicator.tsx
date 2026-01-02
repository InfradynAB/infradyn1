"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck, User, Robot } from "@phosphor-icons/react";

export type TrustLevel = "VERIFIED" | "INTERNAL" | "FORECAST";

interface TrustIndicatorProps {
    level: TrustLevel;
    showLabel?: boolean;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const trustConfig: Record<TrustLevel, {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: typeof ShieldCheck;
    label: string;
    tooltip: string;
}> = {
    VERIFIED: {
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-500/20",
        borderColor: "border-green-200 dark:border-green-500/30",
        icon: ShieldCheck,
        label: "Verified",
        tooltip: "Supplier-reported and document-verified data",
    },
    INTERNAL: {
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-500/20",
        borderColor: "border-amber-200 dark:border-amber-500/30",
        icon: User,
        label: "Internal",
        tooltip: "Logged by internal project team",
    },
    FORECAST: {
        color: "text-slate-500 dark:text-slate-400",
        bgColor: "bg-slate-100 dark:bg-slate-500/20",
        borderColor: "border-slate-200 dark:border-slate-500/30",
        icon: Robot,
        label: "Forecast",
        tooltip: "AI-generated based on historical trends",
    },
};

const sizeConfig = {
    sm: { icon: "h-3 w-3", text: "text-xs", padding: "px-1.5 py-0.5" },
    md: { icon: "h-4 w-4", text: "text-sm", padding: "px-2 py-1" },
    lg: { icon: "h-5 w-5", text: "text-base", padding: "px-2.5 py-1.5" },
};

/**
 * Visual Trust Indicator Component
 * Displays a color-coded badge indicating the source and reliability of data.
 * - 🟢 VERIFIED: Supplier + Document
 * - 🟠 INTERNAL: PM/Site Team Input
 * - ⚪ FORECAST: AI Prediction
 */
export function TrustIndicator({
    level,
    showLabel = true,
    size = "md",
    className,
}: TrustIndicatorProps) {
    const config = trustConfig[level];
    const sizeStyles = sizeConfig[size];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border font-medium",
                config.bgColor,
                config.borderColor,
                config.color,
                sizeStyles.padding,
                sizeStyles.text,
                className
            )}
            title={config.tooltip}
        >
            <Icon className={sizeStyles.icon} weight="duotone" />
            {showLabel && <span>{config.label}</span>}
        </div>
    );
}

/**
 * Inline Trust Dot
 * Minimal version for use in tables or lists.
 */
export function TrustDot({ level, className }: { level: TrustLevel; className?: string }) {
    const config = trustConfig[level];
    return (
        <span
            className={cn("inline-block h-2.5 w-2.5 rounded-full", config.bgColor, className)}
            title={config.tooltip}
        />
    );
}
