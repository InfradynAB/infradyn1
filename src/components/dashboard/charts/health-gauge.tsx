"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HealthGaugeProps {
    score: number;
    label?: string;
    breakdown?: { category: string; score: number; weight: number }[];
}

type HealthLevel = "critical" | "poor" | "fair" | "good" | "excellent";

const getHealthLevel = (score: number): HealthLevel => {
    if (score < 20) return "critical";
    if (score < 40) return "poor";
    if (score < 60) return "fair";
    if (score < 80) return "good";
    return "excellent";
};

const HEALTH_CONFIG: Record<HealthLevel, { color: string; glowColor: string; label: string; description: string; badgeClass: string }> = {
    critical: {
        color: "#ef4444",
        glowColor: "rgba(239,68,68,0.3)",
        label: "Critical",
        description: "Immediate action required",
        badgeClass: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    },
    poor: {
        color: "#f97316",
        glowColor: "rgba(249,115,22,0.3)",
        label: "Poor",
        description: "Major improvements needed",
        badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    },
    fair: {
        color: "#eab308",
        glowColor: "rgba(234,179,8,0.3)",
        label: "Fair",
        description: "Attention needed in some areas",
        badgeClass: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    },
    good: {
        color: "#22c55e",
        glowColor: "rgba(34,197,94,0.3)",
        label: "Good",
        description: "Operations running smoothly",
        badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    },
    excellent: {
        color: "#06b6d4",
        glowColor: "rgba(6,182,212,0.3)",
        label: "Excellent",
        description: "Outstanding performance",
        badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
    },
};

export function HealthGauge({ score, label = "Procurement Health", breakdown }: HealthGaugeProps) {
    const [animatedScore, setAnimatedScore] = useState(0);
    const healthLevel = getHealthLevel(score);
    const config = HEALTH_CONFIG[healthLevel];

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedScore(score), 100);
        return () => clearTimeout(timer);
    }, [score]);

    // SVG gauge
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedScore / 100) * circumference * 0.75;

    return (
        <Card className="shadow-none border">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">{label}</CardTitle>
                        <CardDescription>AI-powered health assessment</CardDescription>
                    </div>
                    <Badge variant="outline" className={cn("font-medium", config.badgeClass)}>
                        {config.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center">
                    {/* Gauge SVG */}
                    <div className="relative w-[200px] h-[140px]">
                        <svg width="200" height="140" viewBox="0 0 200 140" className="transform -rotate-[135deg]">
                            {/* Background arc */}
                            <circle
                                cx="100" cy="100" r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="14"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference * 0.25}
                                strokeLinecap="round"
                                className="text-muted/40"
                            />
                            {/* Colored arc */}
                            <circle
                                cx="100" cy="100" r={radius}
                                fill="none"
                                stroke={config.color}
                                strokeWidth="14"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                                style={{ filter: `drop-shadow(0 0 8px ${config.glowColor})` }}
                            />
                        </svg>

                        {/* Center score */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
                            <span
                                className="text-4xl font-bold font-mono transition-all duration-700"
                                style={{ color: config.color }}
                            >
                                {animatedScore.toFixed(0)}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">out of 100</span>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center mt-2 mb-4">{config.description}</p>

                    {/* Breakdown */}
                    {breakdown && breakdown.length > 0 && (
                        <div className="w-full space-y-2.5 pt-4 border-t">
                            {breakdown.map((item) => {
                                const level = getHealthLevel(item.score);
                                return (
                                    <div key={item.category} className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground w-20 truncate">{item.category}</span>
                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700 ease-out"
                                                style={{
                                                    width: `${Math.min(item.score, 100)}%`,
                                                    backgroundColor: HEALTH_CONFIG[level].color,
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground w-8 text-right tabular-nums">
                                            {item.score.toFixed(0)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
