"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RiskItem {
    id: string;
    name: string;
    supplierRisk: 1 | 2 | 3 | 4 | 5;
    projectImpact: 1 | 2 | 3 | 4 | 5;
    category: string;
}

interface RiskHeatmapProps {
    data: RiskItem[];
    onCellClick?: (items: RiskItem[]) => void;
}

const RISK_LABELS = ["Low", "Med", "High", "V.High", "Critical"];
const IMPACT_LABELS = ["Min", "Minor", "Mod", "Major", "Critical"];

const getCellStyle = (risk: number, impact: number) => {
    const score = risk * impact;
    if (score <= 4) return { bg: "bg-emerald-500/15 dark:bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-400" };
    if (score <= 8) return { bg: "bg-yellow-500/15 dark:bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-700 dark:text-yellow-400" };
    if (score <= 12) return { bg: "bg-amber-500/20 dark:bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-700 dark:text-amber-400" };
    if (score <= 16) return { bg: "bg-orange-500/20 dark:bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-700 dark:text-orange-400" };
    return { bg: "bg-red-500/20 dark:bg-red-500/15", border: "border-red-500/40", text: "text-red-700 dark:text-red-400" };
};

export function RiskHeatmap({ data, onCellClick }: RiskHeatmapProps) {
    const [selectedCell, setSelectedCell] = useState<{ risk: number; impact: number } | null>(null);

    const getItemsInCell = (risk: number, impact: number) =>
        data.filter(item => item.supplierRisk === risk && item.projectImpact === impact);

    const criticalCount = data.filter(d => d.supplierRisk * d.projectImpact >= 16).length;
    const highCount = data.filter(d => { const s = d.supplierRisk * d.projectImpact; return s >= 12 && s < 16; }).length;

    return (
        <Card className="shadow-none border">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">Risk Heatmap</CardTitle>
                        <CardDescription>Supplier Risk vs Project Impact</CardDescription>
                    </div>
                    <div className="flex gap-1.5">
                        {criticalCount > 0 && <Badge variant="destructive" className="text-xs">{criticalCount} Critical</Badge>}
                        {highCount > 0 && (
                            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700">
                                {highCount} High
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <TooltipProvider delayDuration={200}>
                    <div className="relative ml-8">
                        {/* Y-axis label */}
                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-medium text-muted-foreground whitespace-nowrap tracking-wide uppercase">
                            Impact
                        </div>

                        <div className="grid grid-cols-6 gap-1">
                            {/* Header */}
                            <div className="h-7" />
                            {RISK_LABELS.map((label, i) => (
                                <div key={label} className="h-7 flex items-end justify-center text-[10px] font-medium text-muted-foreground pb-0.5">
                                    {i + 1}
                                </div>
                            ))}

                            {/* Matrix rows (5→1 top to bottom) */}
                            {[5, 4, 3, 2, 1].map((impact) => (
                                <>
                                    <div key={`label-${impact}`} className="h-12 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                                        {impact}
                                    </div>
                                    {[1, 2, 3, 4, 5].map((risk) => {
                                        const items = getItemsInCell(risk as 1|2|3|4|5, impact as 1|2|3|4|5);
                                        const style = getCellStyle(risk, impact);
                                        const isSelected = selectedCell?.risk === risk && selectedCell?.impact === impact;
                                        return (
                                            <Tooltip key={`${risk}-${impact}`}>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={cn(
                                                            "h-12 rounded-md border flex items-center justify-center cursor-pointer transition-all duration-200",
                                                            style.bg, style.border,
                                                            isSelected && "ring-2 ring-ring ring-offset-1 ring-offset-background",
                                                            items.length > 0 && "hover:scale-105 hover:shadow-sm"
                                                        )}
                                                        onClick={() => {
                                                            if (items.length > 0) {
                                                                setSelectedCell({ risk, impact });
                                                                onCellClick?.(items);
                                                            }
                                                        }}
                                                    >
                                                        {items.length > 0 && (
                                                            <span className={cn("text-base font-bold tabular-nums", style.text)}>
                                                                {items.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-[200px] text-xs">
                                                    <p className="font-semibold">{RISK_LABELS[risk - 1]} Risk x {IMPACT_LABELS[impact - 1]} Impact</p>
                                                    {items.length > 0 ? (
                                                        <p className="text-muted-foreground mt-0.5">
                                                            {items.slice(0, 3).map(i => i.name).join(", ")}
                                                            {items.length > 3 && ` +${items.length - 3}`}
                                                        </p>
                                                    ) : (
                                                        <p className="text-muted-foreground mt-0.5">No items</p>
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </>
                            ))}
                        </div>

                        {/* X-axis */}
                        <div className="text-center mt-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Supplier Risk
                        </div>
                    </div>
                </TooltipProvider>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
                    {[
                        { label: "Low", class: "bg-emerald-500/20 border-emerald-500/40" },
                        { label: "Medium", class: "bg-yellow-500/20 border-yellow-500/40" },
                        { label: "High", class: "bg-orange-500/25 border-orange-500/40" },
                        { label: "Critical", class: "bg-red-500/25 border-red-500/40" },
                    ].map(({ label, class: cls }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <div className={cn("w-3.5 h-3.5 rounded border", cls)} />
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
