"use client";

import { CalendarBlank, CurrencyDollar, Clock } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";

interface Milestone {
    id: string;
    title: string;
    expectedDate: Date | null;
    amount: number | null;
    currency: string;
    poNumber: string;
    status: string;
}

interface UpcomingMilestonesProps {
    milestones: Milestone[];
}

export function UpcomingMilestones({ milestones }: UpcomingMilestonesProps) {
    if (milestones.length === 0) {
        return (
            <div className="rounded-2xl border bg-card p-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                    Upcoming Milestones
                </h3>
                <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No upcoming milestones</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Upcoming Milestones
            </h3>
            <div className="space-y-3">
                {milestones.slice(0, 5).map((milestone) => (
                    <div
                        key={milestone.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <CalendarBlank className="h-5 w-5" weight="duotone" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{milestone.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {milestone.poNumber}
                                {milestone.expectedDate && (
                                    <> · Due {formatDistanceToNow(new Date(milestone.expectedDate), { addSuffix: true })}</>
                                )}
                            </p>
                        </div>
                        {milestone.amount && (
                            <div className="text-right shrink-0">
                                <p className="font-bold text-sm flex items-center gap-1">
                                    <CurrencyDollar className="h-3.5 w-3.5 text-green-600" />
                                    {milestone.currency} {Number(milestone.amount).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
