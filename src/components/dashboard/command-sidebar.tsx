"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    SquaresFour,
    Bell,
    FolderSimple,
    FileText,
    Truck,
    Package,
    Warning,
    Gear,
    User,
    CaretDown,
    CaretRight,
    Buildings,
    ChartLineUp,
    Receipt,
    FileArrowUp,
    Link as LinkIcon,
    CircleDashed,
    ShieldCheck,
    UsersThree,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarFooter,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SupplierProjectSwitcher } from "@/components/supplier/supplier-project-switcher";

// Project health status types
type HealthStatus = "healthy" | "at-risk" | "critical";

interface Project {
    id: string;
    name: string;
    code: string;
    health: HealthStatus;
    progress: number;
}

interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    role: string;
}

interface SupplierProject {
    id: string;
    name: string;
    code: string | null;
}

interface CommandSidebarProps {
    user?: { role: string; name?: string } | null;
    organizations?: Organization[];
    activeOrgId?: string | null;
    projects?: Project[];
    activeProjectId?: string | null;
    alertCount?: number;
    onProjectChange?: (projectId: string) => void;
    onOrgChange?: (orgId: string) => void;
    supplierProjects?: SupplierProject[];
    activeSupplierProjectId?: string | null;
}

// Health status colors
const healthColors: Record<HealthStatus, { bg: string; dot: string; text: string }> = {
    healthy: { bg: "bg-emerald-500/10", dot: "bg-emerald-500", text: "text-emerald-500" },
    "at-risk": { bg: "bg-amber-500/10", dot: "bg-amber-500", text: "text-amber-500" },
    critical: { bg: "bg-red-500/10", dot: "bg-red-500", text: "text-red-500" },
};

// Navigation structure organized by workflow
const dailyOpsNav = [
    { title: "Home", url: "/dashboard", icon: SquaresFour },
    { title: "Alerts", url: "/dashboard/alerts", icon: Bell, badge: true },
    { title: "Analytics", url: "/dashboard/analytics", icon: ChartLineUp },
];

const financialsNav = [
    { title: "Procurement", url: "/dashboard/procurement", icon: FileText },
    { title: "Invoices", url: "/dashboard/procurement?tab=invoices", icon: Receipt },
    { title: "Change Orders", url: "/dashboard/procurement?tab=change-orders", icon: FileArrowUp },
];

const qualityLogisticsNav = [
    { title: "Materials Tracker", url: "/dashboard/procurement", icon: Package },
    { title: "Quality Alerts", url: "/dashboard/alerts", icon: Warning },
    { title: "Deliveries", url: "/dashboard/procurement?tab=deliveries", icon: Truck },
];

const managementNav = [
    { title: "Projects", url: "/dashboard/projects", icon: FolderSimple },
    { title: "Suppliers", url: "/dashboard/suppliers", icon: Buildings },
    { title: "Connected Apps", url: "/dashboard/settings/integrations", icon: LinkIcon },
];

// Admin-only navigation
const adminNav = [
    { title: "Admin Panel", url: "/dashboard/admin", icon: ShieldCheck },
    { title: "Team Management", url: "/dashboard/settings/team", icon: UsersThree },
];

const accountNav = [
    { title: "Profile", url: "/dashboard/profile", icon: User },
    { title: "Settings", url: "/dashboard/settings", icon: Gear },
];

// Supplier-specific navigation
const supplierNav = [
    { title: "Dashboard", url: "/dashboard/supplier", icon: SquaresFour },
    { title: "My POs", url: "/dashboard/supplier/pos", icon: FileText },
    { title: "Compliance", url: "/dashboard/supplier/onboarding", icon: Truck },
];

export function CommandSidebar({
    user,
    organizations = [],
    activeOrgId,
    projects = [],
    activeProjectId,
    alertCount = 0,
    onProjectChange,
    onOrgChange,
    supplierProjects = [],
    activeSupplierProjectId,
}: CommandSidebarProps) {
    const pathname = usePathname();
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const isSupplier = user?.role === "SUPPLIER";

    const activeOrg = organizations.find((o) => o.id === activeOrgId);
    const activeProject = projects.find((p) => p.id === activeProjectId);

    // Helper to check if link is active
    const isActive = (url: string) => {
        if (url === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(url.split("?")[0]);
    };

    // Render a navigation group
    const renderNavGroup = (
        label: string,
        items: typeof dailyOpsNav
    ) => (
        <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                tooltip={item.title}
                                isActive={isActive(item.url)}
                                className={cn(
                                    "transition-all duration-200",
                                    isActive(item.url) &&
                                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                )}
                            >
                                <Link href={item.url} className="flex items-center gap-3">
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.title}</span>
                                    {item.badge && alertCount > 0 && !isCollapsed && (
                                        <Badge
                                            variant="destructive"
                                            className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-bold"
                                        >
                                            {alertCount > 99 ? "99+" : alertCount}
                                        </Badge>
                                    )}
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );

    return (
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
            {/* Header with Branding */}
            <SidebarHeader className="border-b border-sidebar-border pb-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={isSupplier ? "/dashboard/supplier" : "/dashboard"}
                                className="flex items-center gap-3"
                            >
                                <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-background overflow-hidden shadow-sm">
                                    <Image
                                        src="/logos/logo.png"
                                        alt="Infradyn"
                                        width={32}
                                        height={32}
                                        className="object-contain"
                                    />
                                </div>
                                {!isCollapsed && (
                                    <div className="flex flex-col gap-0.5 leading-none">
                                        <span className="font-bold tracking-tight text-base">
                                            Infradyn
                                        </span>
                                        <span className="text-[10px] text-sidebar-foreground/60 tracking-widest uppercase">
                                            {isSupplier ? "Supplier Portal" : "Home"}
                                        </span>
                                    </div>
                                )}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Organization Switcher */}
                {!isCollapsed && organizations.length > 0 && (
                    <div className="mt-3 px-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent">
                                    <Buildings className="h-4 w-4 text-sidebar-foreground/60" />
                                    <span className="flex-1 truncate text-left font-medium">
                                        {activeOrg?.name || "Select Organization"}
                                    </span>
                                    <CaretDown className="h-4 w-4 text-sidebar-foreground/60" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                {organizations.map((org) => (
                                    <DropdownMenuItem
                                        key={org.id}
                                        onClick={() => onOrgChange?.(org.id)}
                                        className={cn(
                                            "cursor-pointer",
                                            org.id === activeOrgId && "bg-accent"
                                        )}
                                    >
                                        <Buildings className="mr-2 h-4 w-4" />
                                        {org.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

                {/* Supplier Project Switcher */}
                {isSupplier && !isCollapsed && supplierProjects.length > 0 && (
                    <div className="mt-3 px-2">
                        <SupplierProjectSwitcher
                            projects={supplierProjects}
                            activeProjectId={activeSupplierProjectId ?? null}
                        />
                    </div>
                )}

                {/* Active Project Indicator (The "Uber" Context) */}
                {!isSupplier && !isCollapsed && (
                    <div className="mt-3 px-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all",
                                        "border-2 border-dashed border-sidebar-border hover:border-sidebar-primary/50",
                                        activeProject && healthColors[activeProject.health].bg
                                    )}
                                >
                                    {activeProject ? (
                                        <>
                                            <div
                                                className={cn(
                                                    "h-3 w-3 rounded-full animate-pulse",
                                                    healthColors[activeProject.health].dot
                                                )}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wide">
                                                    Active Project
                                                </p>
                                                <p className="font-semibold truncate">
                                                    {activeProject.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="h-1.5 flex-1 rounded-full bg-sidebar-border overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                healthColors[activeProject.health].dot
                                                            )}
                                                            style={{
                                                                width: `${activeProject.progress}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium">
                                                        {activeProject.progress}%
                                                    </span>
                                                </div>
                                            </div>
                                            <CaretRight className="h-4 w-4 text-sidebar-foreground/40" />
                                        </>
                                    ) : (
                                        <>
                                            <CircleDashed className="h-4 w-4 text-sidebar-foreground/40" />
                                            <div className="flex-1">
                                                <p className="text-sm text-sidebar-foreground/60">
                                                    Select a project
                                                </p>
                                            </div>
                                            <CaretDown className="h-4 w-4 text-sidebar-foreground/40" />
                                        </>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64">
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    Switch Project
                                </div>
                                <DropdownMenuSeparator />
                                {/* All Projects Option */}
                                <DropdownMenuItem
                                    onClick={() => onProjectChange?.("")}
                                    className={cn(
                                        "cursor-pointer flex items-center gap-2",
                                        !activeProjectId && "bg-accent"
                                    )}
                                >
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium">All Projects</p>
                                        <p className="text-xs text-muted-foreground">
                                            View data across all projects
                                        </p>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {projects.length === 0 ? (
                                    <DropdownMenuItem disabled>
                                        No projects available
                                    </DropdownMenuItem>
                                ) : (
                                    projects.map((project) => (
                                        <DropdownMenuItem
                                            key={project.id}
                                            onClick={() => onProjectChange?.(project.id)}
                                            className={cn(
                                                "cursor-pointer flex items-center gap-2",
                                                project.id === activeProjectId && "bg-accent"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "h-2 w-2 rounded-full",
                                                    healthColors[project.health].dot
                                                )}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{project.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {project.code} · {project.progress}% complete
                                                </p>
                                            </div>
                                        </DropdownMenuItem>
                                    ))
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/projects" className="cursor-pointer">
                                        <FolderSimple className="mr-2 h-4 w-4" />
                                        Manage Projects
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </SidebarHeader>

            {/* Main Navigation Content */}
            <SidebarContent className="px-2 py-2">
                {isSupplier ? (
                    // Supplier Navigation
                    renderNavGroup("Portal", supplierNav)
                ) : (
                    // Full Navigation organized by workflow
                    <>
                        {renderNavGroup("Daily Operations", dailyOpsNav)}
                        {renderNavGroup("Financials", financialsNav)}
                        {renderNavGroup("Quality & Logistics", qualityLogisticsNav)}
                        {renderNavGroup("Management", managementNav)}
                        {/* Admin-only navigation */}
                        {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
                            renderNavGroup("Administration", adminNav)
                        )}
                    </>
                )}
            </SidebarContent>

            {/* Footer with Account Links */}
            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    {accountNav.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                tooltip={item.title}
                                isActive={isActive(item.url)}
                                className={cn(
                                    "transition-all duration-200",
                                    isActive(item.url) &&
                                    "bg-sidebar-accent text-sidebar-accent-foreground"
                                )}
                            >
                                <Link href={item.url} className="flex items-center gap-3">
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
