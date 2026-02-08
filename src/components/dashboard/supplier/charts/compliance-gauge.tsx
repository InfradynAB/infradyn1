"use client";

import { cn } from "@/lib/utils";

export interface ComplianceData {
    overallScore: number;
    documents: {
        type: string;
        status: "valid" | "expiring" | "missing" | "expired";
        expiryDate?: string;
        uploadDate?: string;
    }[];
}

export function ComplianceGauge({ data }: { data: ComplianceData }) {
    const score = Math.min(100, Math.max(0, data.overallScore));
    const zone = score >= 90 ? "green" : score >= 70 ? "amber" : "red";

    const zoneLabel = { green: "Fully Compliant", amber: "Attention Needed", red: "Non-Compliant" }[zone];
    const zoneColor = {
        green: "text-emerald-600 dark:text-emerald-400",
        amber: "text-amber-600 dark:text-amber-400",
        red: "text-red-600 dark:text-red-400",
    }[zone];

    // SVG arc parameters
    const radius = 80;
    const circumference = Math.PI * radius; // half circle
    const offset = circumference - (score / 100) * circumference;

    const arcColor = {
        green: "#22C55E",
        amber: "#F59E0B",
        red: "#EF4444",
    }[zone];

    return (
        <div className="flex flex-col items-center">
            {/* Gauge SVG */}
            <svg width="220" height="130" viewBox="0 0 220 130" className="overflow-visible">
                {/* Background arc */}
                <path
                    d="M 20 110 A 80 80 0 0 1 200 110"
                    fill="none"
                    stroke="currentColor"
                    className="text-border/40"
                    strokeWidth="14"
                    strokeLinecap="round"
                />
                {/* Score arc */}
                <path
                    d="M 20 110 A 80 80 0 0 1 200 110"
                    fill="none"
                    stroke={arcColor}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                />
                {/* Center text */}
                <text x="110" y="95" textAnchor="middle" className="fill-foreground text-[28px] font-bold font-mono">
                    {score}%
                </text>
                <text x="110" y="115" textAnchor="middle" className={cn("text-[11px] font-semibold", zoneColor)}>
                    {zoneLabel}
                </text>
            </svg>

            {/* Document summary below gauge */}
            <div className="grid grid-cols-3 gap-3 w-full mt-4">
                {[
                    { label: "Valid", status: "valid" as const, color: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
                    { label: "Expiring", status: "expiring" as const, color: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400" },
                    { label: "Missing", status: "missing" as const, color: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400" },
                ].map(({ label, status, color }) => {
                    const count = data.documents.filter(d => d.status === status).length;
                    return (
                        <div key={status} className={cn("rounded-xl px-3 py-2.5 text-center", color)}>
                            <p className="text-lg font-bold font-mono">{count}</p>
                            <p className="text-[10px] font-semibold">{label}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
