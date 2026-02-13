"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Plus,
    ArrowsClockwise,
    DownloadSimple,
    ArrowRight,
    Sparkle,
    FolderPlus,
} from "@phosphor-icons/react";
import {
    GlobalSearch,
    ProjectCardsGrid,
    TopPrioritiesSection,
    ActivityFeed,
    AISummaryCard,
    QuickStatsTiles,
} from "@/components/dashboard/command-center";
import { toast } from "sonner";
import { HomeOnboardingTour } from "./onboarding-tour";

interface ProjectData {
    id: string;
    name: string;
    code: string;
    status: string;
    health: "healthy" | "at-risk" | "critical";
    progress: number;
    totalCommitted: number;
    totalPaid: number;
    milestones: { completed: number; total: number };
    activePOs: number;
}

interface AlertData {
    id: string;
    type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    description: string;
    href: string;
    actionLabel: string;
    count?: number;
}

interface ActivityData {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    icon: string;
    href?: string;
}

interface QuickStatsData {
    totalCommitted: number;
    totalPaid: number;
    physicalProgress: number;
    activePOs: number;
    milestonesCompleted: number;
    milestonesTotal: number;
    onTrack: number;
    atRisk: number;
    delayed: number;
}

interface AISummaryData {
    summary: string;
    sentiment: "positive" | "neutral" | "negative";
    keyPoints: string[];
}

interface CommandCenterData {
    projects: ProjectData[];
    alerts: AlertData[];
    activity: ActivityData[];
    aiSummary: AISummaryData | null;
    quickStats: QuickStatsData | null;
}

interface CommandCenterClientProps {
    userName?: string;
}

export function CommandCenterClient({ userName }: CommandCenterClientProps) {
    const [data, setData] = useState<CommandCenterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await fetch("/api/dashboard/command-center");
            if (!response.ok) throw new Error("Failed to fetch");
            const result = await response.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error("Error fetching command center data:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = () => {
        fetchData(true);
        toast.success("Dashboard refreshed");
    };

    // Get greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="space-y-6 pb-8">
            <HomeOnboardingTour />
            {/* Header Section */}
            <div id="tour-home-header" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                        {getGreeting()}, {userName?.split(" ")[0] || "there"}!
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here&apos;s your project overview
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="gap-2"
                    >
                        <ArrowsClockwise
                            className={cn("h-4 w-4", refreshing && "animate-spin")}
                        />
                        Refresh
                    </Button>
                    <Button asChild size="sm" className="gap-2">
                        <Link href="/dashboard/projects">
                            <FolderPlus className="h-4 w-4" />
                            New Project
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Global Search Bar */}
            <div id="tour-home-search" className="flex justify-center">
                <GlobalSearch className="w-full max-w-2xl" />
            </div>

            {/* AI Summary Card - The 30-second overview */}
            <AISummaryCard data={data?.aiSummary || null} loading={loading} />

            {/* Quick Stats Tiles */}
            <div id="tour-home-stats">
                <QuickStatsTiles stats={data?.quickStats || null} loading={loading} />
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column - Projects (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Projects Section */}
                    <div id="tour-home-projects">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                Active Projects
                                {data?.projects && data.projects.length > 0 && (
                                    <span className="text-sm font-normal text-muted-foreground">
                                        ({data.projects.length})
                                    </span>
                                )}
                            </h2>
                            <Button asChild variant="ghost" size="sm" className="gap-1">
                                <Link href="/dashboard/projects">
                                    View All
                                    <ArrowRight className="h-3 w-3" />
                                </Link>
                            </Button>
                        </div>

                        {loading ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="h-48 rounded-xl" />
                                ))}
                            </div>
                        ) : (
                            <ProjectCardsGrid projects={data?.projects || []} />
                        )}
                    </div>

                    {/* Activity Feed */}
                    <div id="tour-home-activity">
                        {loading ? (
                            <Skeleton className="h-96 rounded-xl" />
                        ) : (
                            <ActivityFeed
                                activities={data?.activity || []}
                                maxHeight="350px"
                            />
                        )}
                    </div>
                </div>

                {/* Right Column - Alerts (1/3 width) */}
                <div className="space-y-6">
                    {/* Top Priorities / Alerts Queue */}
                    <div id="tour-home-priorities">
                        {loading ? (
                            <Skeleton className="h-80 rounded-xl" />
                        ) : (
                            <TopPrioritiesSection alerts={data?.alerts || []} />
                        )}
                    </div>

                    {/* Quick Actions Card */}
                    <div id="tour-home-actions" className="rounded-xl border bg-card p-5">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Sparkle className="h-4 w-4 text-primary" />
                            Quick Actions
                        </h3>
                        <div className="space-y-2">
                            <Button
                                asChild
                                variant="outline"
                                className="w-full justify-start gap-2"
                            >
                                <Link href="/dashboard/procurement/new">
                                    <Plus className="h-4 w-4" />
                                    Create Purchase Order
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="w-full justify-start gap-2"
                            >
                                <Link href="/dashboard/analytics">
                                    <DownloadSimple className="h-4 w-4" />
                                    Download Report
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="w-full justify-start gap-2"
                            >
                                <Link href="/dashboard/suppliers">
                                    <Plus className="h-4 w-4" />
                                    Add Supplier
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
