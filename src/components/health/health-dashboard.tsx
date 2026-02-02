"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    ActivityIcon, 
    CheckCircleIcon, 
    WarningIcon, 
    XCircleIcon,
    ArrowsClockwiseIcon,
    DatabaseIcon,
    CloudIcon,
    EnvelopeSimpleIcon,
    PlugsIcon,
    CpuIcon,
    ClockIcon,
    GlobeIcon,
    ShieldCheckIcon,
    LightningIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ServiceHealth {
    name: string;
    status: "healthy" | "degraded" | "unhealthy";
    responseTime?: number;
    message?: string;
    lastChecked: string;
    category: "database" | "storage" | "external" | "internal" | "email" | "api";
}

interface HealthResponse {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    services: ServiceHealth[];
    summary: {
        total: number;
        healthy: number;
        degraded: number;
        unhealthy: number;
    };
}

const categoryIcons: Record<string, React.ReactNode> = {
    database: <DatabaseIcon className="h-4 w-4" weight="duotone" />,
    storage: <CloudIcon className="h-4 w-4" weight="duotone" />,
    email: <EnvelopeSimpleIcon className="h-4 w-4" weight="duotone" />,
    external: <PlugsIcon className="h-4 w-4" weight="duotone" />,
    internal: <CpuIcon className="h-4 w-4" weight="duotone" />,
    api: <GlobeIcon className="h-4 w-4" weight="duotone" />,
};

const categoryLabels: Record<string, string> = {
    database: "Database",
    storage: "Storage",
    email: "Email",
    external: "External Services",
    internal: "Internal Services",
    api: "API Endpoints",
};

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m ${seconds % 60}s`;
    }
}

function StatusIcon({ status }: { status: "healthy" | "degraded" | "unhealthy" }) {
    switch (status) {
        case "healthy":
            return <CheckCircleIcon className="h-5 w-5 text-emerald-500" weight="fill" />;
        case "degraded":
            return <WarningIcon className="h-5 w-5 text-amber-500" weight="fill" />;
        case "unhealthy":
            return <XCircleIcon className="h-5 w-5 text-red-500" weight="fill" />;
    }
}

function StatusBadge({ status }: { status: "healthy" | "degraded" | "unhealthy" }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                status === "healthy" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                status === "degraded" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                status === "unhealthy" && "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
        >
            <span
                className={cn(
                    "h-1.5 w-1.5 rounded-full animate-pulse",
                    status === "healthy" && "bg-emerald-500",
                    status === "degraded" && "bg-amber-500",
                    status === "unhealthy" && "bg-red-500"
                )}
            />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
    return (
        <div
            className={cn(
                "group relative p-4 rounded-xl border transition-all duration-200",
                "hover:shadow-md hover:border-border/80",
                service.status === "healthy" && "bg-card border-border/50",
                service.status === "degraded" && "bg-amber-500/5 border-amber-500/20",
                service.status === "unhealthy" && "bg-red-500/5 border-red-500/20"
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div
                        className={cn(
                            "p-2 rounded-lg",
                            service.status === "healthy" && "bg-muted/50 text-muted-foreground",
                            service.status === "degraded" && "bg-amber-500/10 text-amber-600",
                            service.status === "unhealthy" && "bg-red-500/10 text-red-600"
                        )}
                    >
                        {categoryIcons[service.category]}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">{service.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {service.message}
                        </p>
                    </div>
                </div>
                <StatusIcon status={service.status} />
            </div>
            
            {service.responseTime !== undefined && (
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        Response
                    </span>
                    <span className={cn(
                        "font-mono",
                        service.responseTime < 100 && "text-emerald-600",
                        service.responseTime >= 100 && service.responseTime < 500 && "text-foreground",
                        service.responseTime >= 500 && "text-amber-600"
                    )}>
                        {service.responseTime}ms
                    </span>
                </div>
            )}
        </div>
    );
}

function StatCard({ 
    label, 
    value, 
    icon, 
    variant = "default" 
}: { 
    label: string; 
    value: string | number; 
    icon: React.ReactNode;
    variant?: "default" | "success" | "warning" | "danger";
}) {
    return (
        <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3">
                <div
                    className={cn(
                        "p-2.5 rounded-lg",
                        variant === "default" && "bg-muted/50 text-muted-foreground",
                        variant === "success" && "bg-emerald-500/10 text-emerald-600",
                        variant === "warning" && "bg-amber-500/10 text-amber-600",
                        variant === "danger" && "bg-red-500/10 text-red-600"
                    )}
                >
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold tracking-tight">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </div>
        </div>
    );
}

export function HealthDashboard() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchHealth = useCallback(async () => {
        try {
            const response = await fetch("/api/health", {
                cache: "no-store",
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            setHealth(data);
            setError(null);
            setLastRefresh(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch health data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        
        if (autoRefresh) {
            const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [fetchHealth, autoRefresh]);

    // Group services by category
    const servicesByCategory = health?.services.reduce((acc, service) => {
        if (!acc[service.category]) {
            acc[service.category] = [];
        }
        acc[service.category].push(service);
        return acc;
    }, {} as Record<string, ServiceHealth[]>) ?? {};

    if (loading && !health) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <ArrowsClockwiseIcon className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading health status...</p>
                </div>
            </div>
        );
    }

    if (error && !health) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-center px-4">
                    <div className="p-4 rounded-full bg-red-500/10">
                        <XCircleIcon className="h-8 w-8 text-red-500" weight="fill" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Failed to Load Health Data</h2>
                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    </div>
                    <button
                        onClick={fetchHealth}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <ActivityIcon className="h-6 w-6 text-primary" weight="duotone" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
                            <p className="text-sm text-muted-foreground">
                                Monitor all services and infrastructure
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded border-border"
                        />
                        Auto-refresh
                    </label>
                    <button
                        onClick={fetchHealth}
                        disabled={loading}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border",
                            "bg-card hover:bg-muted/50 transition-colors",
                            loading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <ArrowsClockwiseIcon className={cn("h-4 w-4", loading && "animate-spin")} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overall Status Banner */}
            {health && (
                <div
                    className={cn(
                        "p-6 rounded-2xl mb-8 border",
                        health.status === "healthy" && "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
                        health.status === "degraded" && "bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/20",
                        health.status === "unhealthy" && "bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/20"
                    )}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div
                                className={cn(
                                    "p-3 rounded-xl",
                                    health.status === "healthy" && "bg-emerald-500/20",
                                    health.status === "degraded" && "bg-amber-500/20",
                                    health.status === "unhealthy" && "bg-red-500/20"
                                )}
                            >
                                {health.status === "healthy" ? (
                                    <ShieldCheckIcon className="h-8 w-8 text-emerald-600" weight="duotone" />
                                ) : health.status === "degraded" ? (
                                    <WarningIcon className="h-8 w-8 text-amber-600" weight="duotone" />
                                ) : (
                                    <XCircleIcon className="h-8 w-8 text-red-600" weight="duotone" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">
                                    {health.status === "healthy"
                                        ? "All Systems Operational"
                                        : health.status === "degraded"
                                        ? "Some Systems Degraded"
                                        : "System Issues Detected"}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Last checked: {lastRefresh.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                        <StatusBadge status={health.status} />
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            {health && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Total Services"
                        value={health.summary.total}
                        icon={<CpuIcon className="h-5 w-5" weight="duotone" />}
                    />
                    <StatCard
                        label="Healthy"
                        value={health.summary.healthy}
                        icon={<CheckCircleIcon className="h-5 w-5" weight="duotone" />}
                        variant="success"
                    />
                    <StatCard
                        label="Degraded"
                        value={health.summary.degraded}
                        icon={<WarningIcon className="h-5 w-5" weight="duotone" />}
                        variant={health.summary.degraded > 0 ? "warning" : "default"}
                    />
                    <StatCard
                        label="Unhealthy"
                        value={health.summary.unhealthy}
                        icon={<XCircleIcon className="h-5 w-5" weight="duotone" />}
                        variant={health.summary.unhealthy > 0 ? "danger" : "default"}
                    />
                </div>
            )}

            {/* System Info */}
            {health && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                        <ClockIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Uptime:</span>
                        <span className="font-medium">{formatUptime(health.uptime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <LightningIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Version:</span>
                        <span className="font-mono font-medium">{health.version}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <GlobeIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Environment:</span>
                        <span className="font-medium capitalize">{health.environment}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Services:</span>
                        <span className="font-medium">{health.summary.total} monitored</span>
                    </div>
                </div>
            )}

            {/* Services by Category */}
            {health && (
                <div className="space-y-8">
                    {Object.entries(servicesByCategory).map(([category, services]) => (
                        <div key={category}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 rounded-lg bg-muted/50">
                                    {categoryIcons[category]}
                                </div>
                                <h3 className="font-semibold">{categoryLabels[category]}</h3>
                                <span className="text-xs text-muted-foreground ml-auto">
                                    {services.filter(s => s.status === "healthy").length}/{services.length} healthy
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {services.map((service, index) => (
                                    <ServiceCard key={`${service.name}-${index}`} service={service} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-border/50 text-center">
                <p className="text-xs text-muted-foreground">
                    Health data refreshes automatically every 30 seconds when enabled.
                    <br />
                    For detailed logs and metrics, check your monitoring dashboard.
                </p>
            </div>
        </div>
    );
}
