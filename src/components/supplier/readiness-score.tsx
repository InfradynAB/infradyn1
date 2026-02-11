"use client";

import { useEffect, useState } from "react";

interface ReadinessScoreProps {
    score: number;
    size?: number;
    strokeWidth?: number;
}

export function ReadinessScore({ score, size = 120, strokeWidth = 8 }: ReadinessScoreProps) {
    const [offset, setOffset] = useState(0);
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        const progressOffset = ((100 - score) / 100) * circumference;
        setOffset(progressOffset);
    }, [score, circumference]);

    const isComplete = score === 100;
    const isCompact = size <= 40;

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-muted-foreground/20"
                />
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    style={{
                        strokeDashoffset: offset,
                        transition: "stroke-dashoffset 1s ease-in-out",
                    }}
                    strokeLinecap="round"
                    className={isComplete ? "text-emerald-500" : "text-emerald-500"}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {isCompact ? (
                    <span className="text-[9px] font-bold text-foreground leading-none">{score}%</span>
                ) : size <= 80 ? (
                    <span className="text-sm font-bold">{score}%</span>
                ) : (
                    <>
                        <span className="text-2xl font-bold">{score}%</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Readiness</span>
                    </>
                )}
            </div>
        </div>
    );
}
