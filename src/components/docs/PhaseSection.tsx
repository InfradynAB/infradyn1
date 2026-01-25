import React from 'react';
import { Badge } from "@/components/ui/badge";

interface PhaseSectionProps {
    number: number;
    title: string;
    description: string;
    items: string[];
    children?: React.ReactNode;
}

export function PhaseSection({ number, title, description, items, children }: PhaseSectionProps) {
    return (
        <section className="py-12 border-b border-border last:border-0">
            <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="px-3 py-1 text-lg font-mono">
                    Phase {number}
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl leading-relaxed">
                {description}
            </p>

            <div className="space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    Key Objectives
                </h3>
                <ul className="space-y-4">
                    {items.map((item, index) => (
                        <li key={index} className="flex items-start gap-3 text-muted-foreground text-lg">
                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
                {children}
            </div>
        </section>
    );
}
