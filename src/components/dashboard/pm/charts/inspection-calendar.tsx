"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, CalendarBlank } from "@phosphor-icons/react";

export interface InspectionEvent {
    id: string;
    date: string; // ISO date string YYYY-MM-DD
    title: string;
    status: "scheduled" | "passed" | "failed" | "pending";
    supplier?: string;
}

interface Props {
    events: InspectionEvent[];
    month?: Date;
    onDayClick?: (date: string, events: InspectionEvent[]) => void;
}

const statusCfg: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
    scheduled: { bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", icon: CalendarBlank },
    passed: { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle },
    failed: { bg: "bg-red-500", text: "text-red-600 dark:text-red-400", icon: XCircle },
    pending: { bg: "bg-gray-400 dark:bg-gray-500", text: "text-muted-foreground", icon: Clock },
};

export function InspectionCalendar({ events, month: monthProp, onDayClick }: Props) {
    const now = monthProp || new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    const monthName = firstDay.toLocaleString("default", { month: "long", year: "numeric" });

    // Build event map: date string -> events
    const eventMap: Record<string, InspectionEvent[]> = {};
    for (const e of events) {
        const key = e.date.slice(0, 10);
        if (!eventMap[key]) eventMap[key] = [];
        eventMap[key].push(e);
    }

    // Build cells
    const cells: Array<{ day: number | null; dateStr: string }> = [];
    for (let i = 0; i < startDow; i++) cells.push({ day: null, dateStr: "" });
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        cells.push({ day: d, dateStr });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Summary
    const counts = { scheduled: 0, passed: 0, failed: 0, pending: 0 };
    for (const e of events) if (counts[e.status] !== undefined) counts[e.status]++;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Inspections — {monthName}</h3>
                <div className="flex items-center gap-3">
                    {(["scheduled", "passed", "failed", "pending"] as const).map((s) => (
                        <div key={s} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className={cn("w-2 h-2 rounded-full", statusCfg[s].bg)} />
                            {s} ({counts[s]})
                        </div>
                    ))}
                </div>
            </div>

            {/* Calendar grid */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 bg-muted/40 dark:bg-muted/20">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                        <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2 uppercase tracking-wider">{d}</div>
                    ))}
                </div>

                {/* Cells */}
                <div className="grid grid-cols-7">
                    {cells.map((cell, i) => {
                        const dayEvents = cell.dateStr ? (eventMap[cell.dateStr] || []) : [];
                        const isToday = cell.dateStr === today;
                        return (
                            <button
                                key={i}
                                disabled={!cell.day}
                                onClick={() => cell.dateStr && dayEvents.length > 0 && onDayClick?.(cell.dateStr, dayEvents)}
                                className={cn(
                                    "relative h-16 border-t border-r border-border/30 last:border-r-0 p-1 text-left transition-colors",
                                    cell.day && dayEvents.length > 0 && "cursor-pointer hover:bg-muted/40",
                                    !cell.day && "bg-muted/10",
                                )}
                            >
                                {cell.day && (
                                    <>
                                        <span className={cn(
                                            "text-[11px] font-medium",
                                            isToday && "bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                        )}>{cell.day}</span>
                                        {dayEvents.length > 0 && (
                                            <div className="flex flex-wrap gap-0.5 mt-1">
                                                {dayEvents.slice(0, 3).map((e) => (
                                                    <span key={e.id} className={cn("w-2 h-2 rounded-full", statusCfg[e.status].bg)} title={e.title} />
                                                ))}
                                                {dayEvents.length > 3 && <span className="text-[8px] text-muted-foreground ml-0.5">+{dayEvents.length - 3}</span>}
                                            </div>
                                        )}
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
