import React from 'react';
import { Badge } from "@/components/ui/badge";

interface DocSectionProps {
    title: string;
    items: string[];
    icon?: React.ReactNode;
}

function DocSection({ title, items, icon }: DocSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
                {icon}
                {title}
            </h3>
            <ul className="space-y-3">
                {items.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-muted-foreground leading-relaxed">
                        <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-sm md:text-base">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

interface PhaseSectionProps {
    number: number;
    title: string;
    description: string;
    journeySteps?: string[];
    systemActions?: string[];
    developerTriggers?: string[];
    children?: React.ReactNode;
}

export function PhaseSection({
    number,
    title,
    description,
    journeySteps,
    systemActions,
    developerTriggers,
    children
}: PhaseSectionProps) {
    return (
        <section className="py-16 border-b border-border last:border-0 scroll-mt-20">
            <div className="flex flex-col gap-6 mb-12">
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="px-4 py-1 text-xl font-mono border-primary/20 bg-primary/5 text-primary">
                        Phase {number}
                    </Badge>
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight">{title}</h2>
                <p className="text-xl text-muted-foreground max-w-4xl leading-relaxed">
                    {description}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                {journeySteps && (
                    <DocSection title="Journey Steps" items={journeySteps} />
                )}

                <div className="space-y-12">
                    {systemActions && (
                        <DocSection title="System Actions" items={systemActions} />
                    )}

                    {developerTriggers && (
                        <div className="p-6 rounded-xl bg-primary/5 border border-primary/10">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Developer Triggers</h4>
                            <div className="flex flex-wrap gap-2 text-xs font-mono">
                                {developerTriggers.map((trigger, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-background border border-border rounded shadow-sm">
                                        {trigger}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {children && (
                <div className="pt-8 mt-8 border-t border-dashed">
                    {children}
                </div>
            )}
        </section>
    );
}
