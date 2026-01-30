"use client";

import { useEffect, useState } from "react";

interface PizzaTrackerProgressProps {
    value: number;
    currency: string;
    paid: number;
    total: number;
}

export function PizzaTrackerProgress({ value, currency, paid, total }: PizzaTrackerProgressProps) {
    const [animatedValue, setAnimatedValue] = useState(0);

    useEffect(() => {
        // Smooth entry animation
        const timer = setTimeout(() => {
            setAnimatedValue(value);
        }, 100);

        return () => clearTimeout(timer);
    }, [value]);

    return (
        <div className="space-y-2">
            {/* Pizza Tracker Style Progress Bar - Pill-like Modern Feel */}
            <div className="relative">
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out shadow-sm"
                        style={{ width: `${animatedValue}%` }}
                    />
                </div>
            </div>
            
            {/* Dynamic Sub-text */}
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                    🟩 {animatedValue.toFixed(0)}% paid
                </span>
                <span className="text-muted-foreground">
                    {currency} {paid.toLocaleString()} / {total.toLocaleString()}
                </span>
            </div>
        </div>
    );
}
