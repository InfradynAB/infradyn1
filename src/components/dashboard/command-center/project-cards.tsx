"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Buildings, CaretRight, TrendUp } from "@phosphor-icons/react";

interface ProjectCardData {
    id: string;
    name: string;
    code: string;
    status: string;
    health: "healthy" | "at-risk" | "critical";
    progress: number;
    totalCommitted: number;
    totalPaid: number;
    milestones: {
        completed: number;
        total: number;
    };
    activePOs: number;
}

interface ProjectCardProps {
    project: ProjectCardData;
    className?: string;
}

const healthConfig = {
    healthy: {
        label: "On Track",
        dot: "bg-emerald-500",
        bg: "group-hover:border-emerald-500/30",
        badge: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    },
    "at-risk": {
        label: "At Risk",
        dot: "bg-amber-500",
        bg: "group-hover:border-amber-500/30",
        badge: "bg-amber-500/10 text-amber-600 border-amber-200",
    },
    critical: {
        label: "Critical",
        dot: "bg-red-500",
        bg: "group-hover:border-red-500/30",
        badge: "bg-red-500/10 text-red-600 border-red-200",
    },
};

const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
};

export function ProjectCard({ project, className }: ProjectCardProps) {
    const health = healthConfig[project.health];

    return (
        <Link href={`/dashboard/analytics?project=${project.id}`}>
            <Card
                className={cn(
                    "group relative overflow-hidden cursor-pointer",
                    "transition-all duration-300 ease-out",
                    "hover:shadow-lg hover:-translate-y-0.5",
                    "border-2 border-transparent",
                    health.bg,
                    className
                )}
            >
                <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div
                                    className={cn(
                                        "h-2.5 w-2.5 rounded-full animate-pulse",
                                        health.dot
                                    )}
                                />
                                <Badge
                                    variant="outline"
                                    className={cn("text-[10px] font-semibold", health.badge)}
                                >
                                    {health.label}
                                </Badge>
                            </div>
                            <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                                {project.name}
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono">
                                {project.code}
                            </p>
                        </div>
                        <CaretRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Physical Progress</span>
                            <span className="font-bold text-foreground">{project.progress}%</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    health.dot
                                )}
                                style={{ width: `${project.progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/50 rounded-lg p-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                Committed
                            </p>
                            <p className="font-bold text-sm">
                                {formatCurrency(project.totalCommitted)}
                            </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                Milestones
                            </p>
                            <p className="font-bold text-sm">
                                {project.milestones.completed}/{project.milestones.total}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Buildings className="h-3.5 w-3.5" />
                            <span>{project.activePOs} active POs</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendUp className="h-3.5 w-3.5" />
                            <span>
                                {project.totalCommitted > 0
                                    ? Math.round((project.totalPaid / project.totalCommitted) * 100)
                                    : 0}
                                % paid
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

interface ProjectCardsGridProps {
    projects: ProjectCardData[];
    className?: string;
}

export function ProjectCardsGrid({ projects, className }: ProjectCardsGridProps) {
    if (projects.length === 0) {
        return (
            <Card className={cn("p-8 text-center", className)}>
                <div className="text-muted-foreground">
                    <Buildings className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No active projects</p>
                    <p className="text-sm mt-1">
                        Create a project to start tracking your construction portfolio
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
            {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
            ))}
        </div>
    );
}
