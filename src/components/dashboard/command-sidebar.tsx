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
    Gauge,
    ShieldWarning,
    Target,
    CurrencyDollar,
    CalendarCheck,
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
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    SidebarFooter,
    useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

interface SupplierProject {
    id: string;
    name: string;
    code: string | null;
}

interface CommandSidebarProps {
    user?: { role: string; name?: string } | null;
    projects?: Project[];
    activeProjectId?: string | null;
    alertCount?: number;
    onProjectChange?: (projectId: string) => void;
    supplierProjects?: SupplierProject[];
    activeSupplierProjectId?: string | null;
}

// Health status colors
const healthColors: Record<HealthStatus, { bg: string; dot: string; text: string }> = {
    healthy: { bg: "bg-emerald-500/10", dot: "bg-emerald-500", text: "text-emerald-500" },
    "at-risk": { bg: "bg-amber-500/10", dot: "bg-amber-500", text: "text-amber-500" },
    critical: { bg: "bg-red-500/10", dot: "bg-red-500", text: "text-red-500" },
};

interface SidebarNavItem {
    title: string;
    url: string;
    icon: React.ElementType;
    badge?: boolean;
    subItems?: { title: string; url: string; icon: React.ElementType }[];
}

// Navigation structure organized by workflow
const dailyOpsNav: SidebarNavItem[] = [
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
interface SupplierNavItem {
    title: string;
    url: string;
    icon: React.ElementType;
    subItems?: { title: string; url: string; icon: React.ElementType }[];
}

const supplierNav: SupplierNavItem[] = [
    { title: "Dashboard", url: "/dashboard/supplier", icon: SquaresFour },
    {
        title: "Analytics",
        url: "/dashboard/supplier/analytics",
        icon: ChartLineUp,
        subItems: [
            { title: "Overview", url: "/dashboard/supplier/analytics", icon: Gauge },
            { title: "PO Status", url: "/dashboard/supplier/analytics/orders", icon: FileText },
            { title: "Deliveries", url: "/dashboard/supplier/analytics/deliveries", icon: Truck },
            { title: "Invoices", url: "/dashboard/supplier/analytics/invoices", icon: Receipt },
            { title: "NCRs", url: "/dashboard/supplier/analytics/ncrs", icon: ShieldWarning },
            { title: "Milestones", url: "/dashboard/supplier/analytics/milestones", icon: Target },
            { title: "Compliance", url: "/dashboard/supplier/analytics/compliance", icon: ShieldCheck },
        ],
    },
    { title: "My POs", url: "/dashboard/supplier/pos", icon: FileText },
    { title: "Compliance", url: "/dashboard/supplier/onboarding", icon: Truck },
];

const pmAnalyticsSubItems: { title: string; url: string; icon: React.ElementType }[] = [
    { title: "Overview", url: "/dashboard/pm/overview", icon: Gauge },
    { title: "Deliveries", url: "/dashboard/pm/deliveries", icon: Truck },
    { title: "Materials", url: "/dashboard/pm/materials", icon: Package },
    { title: "Quality", url: "/dashboard/pm/quality", icon: ShieldWarning },
    { title: "Milestones", url: "/dashboard/pm/milestones", icon: Target },
    { title: "Suppliers", url: "/dashboard/pm/suppliers", icon: UsersThree },
    { title: "Cost & Budget", url: "/dashboard/pm/financials", icon: CurrencyDollar },
    { title: "Inspections", url: "/dashboard/pm/inspections", icon: CalendarCheck },
];

export function CommandSidebar({
    user,
    projects = [],
    activeProjectId,
    alertCount = 0,
    onProjectChange,
    supplierProjects = [],
    activeSupplierProjectId,
}: CommandSidebarProps) {
    const pathname = usePathname();
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const isSupplier = user?.role === "SUPPLIER";
    const isPM = user?.role === "PM" || user?.role === "PROJECT_MANAGER";

    const activeProject = projects.find((p) => p.id === activeProjectId);
    const dailyOpsItems: SidebarNavItem[] = isPM
        ? dailyOpsNav.map((item) =>
            item.title === "Analytics"
                ? { ...item, url: "/dashboard/pm/overview", subItems: pmAnalyticsSubItems }
                : item
        )
        : dailyOpsNav;

    // Helper to check if link is active
    const isActive = (url: string) => {
        if (url === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(url.split("?")[0]);
    };

    const navButtonClass = (active: boolean) =>
        cn(
            "h-10 rounded-xl border border-transparent px-3 text-[13px] font-medium transition-all duration-200",
            "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            active &&
            "border-[#0E7490]/80 bg-[#0E7490] text-white shadow-sm data-[active=true]:!border-[#0E7490]/80 data-[active=true]:!bg-[#0E7490] data-[active=true]:!text-white"
        );

    const shouldShowAlertBadge = (item: SidebarNavItem) =>
        !!item.badge && alertCount > 0 && !isCollapsed && !pathname.startsWith("/dashboard/alerts");

    // Render a navigation group
    const renderNavGroup = (
        label: string,
        items: SidebarNavItem[]
    ) => (
        <SidebarGroup className="px-1.5 py-1">
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                {label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu className="gap-1.5">
                    {items.map((item) =>
                        item.subItems ? (
                            isCollapsed ? (
                                <SidebarMenuItem key={item.title}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <SidebarMenuButton
                                                tooltip={item.title}
                                                isActive={isActive(item.url)}
                                                className={navButtonClass(isActive(item.url))}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                            </SidebarMenuButton>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            side="right"
                                            align="start"
                                            sideOffset={10}
                                            className="w-52 rounded-xl border-sidebar-border/80 bg-sidebar text-sidebar-foreground"
                                        >
                                            {item.subItems.map((sub) => (
                                                <DropdownMenuItem asChild key={sub.title}>
                                                    <Link href={sub.url} className="cursor-pointer gap-2 text-sm">
                                                        <sub.icon className="h-3.5 w-3.5" />
                                                        <span>{sub.title}</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </SidebarMenuItem>
                            ) : (
                                <Collapsible key={item.title} asChild defaultOpen={pathname.startsWith(item.url.split("?")[0])} className="group/collapsible">
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton
                                                tooltip={item.title}
                                                isActive={isActive(item.url)}
                                                className={navButtonClass(isActive(item.url))}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                                <CaretRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub className="mx-4 mt-1 border-sidebar-border/70 px-2 py-1">
                                                {item.subItems.map((sub) => (
                                                    <SidebarMenuSubItem key={sub.title}>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={pathname === sub.url}
                                                            className="h-8 rounded-lg text-xs data-[active=true]:bg-[#0E7490]! data-[active=true]:text-white!"
                                                        >
                                                            <Link href={sub.url} className="flex items-center gap-2">
                                                                <sub.icon className="h-3.5 w-3.5" />
                                                                <span>{sub.title}</span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </SidebarMenuItem>
                                </Collapsible>
                            )
                        ) : (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    isActive={isActive(item.url)}
                                    className={navButtonClass(isActive(item.url))}
                                >
                                    <Link href={item.url} className="flex items-center gap-3">
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.title}</span>
                                        {shouldShowAlertBadge(item) && (
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
                        )
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );

    return (
        <Sidebar
            collapsible="icon"
            variant="floating"
            className="border-0"
        >
            {/* Header with Project Context */}
            <SidebarHeader className="border-b border-sidebar-border/70 px-3 pt-3 pb-4">
                {isCollapsed && (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            {isSupplier ? (
                                <SidebarMenuButton size="lg" asChild className="h-12 rounded-xl">
                                    <Link
                                        href="/dashboard/supplier"
                                        className="flex items-center justify-center"
                                    >
                                        <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-background overflow-hidden shadow-sm">
                                            <Image
                                                src="/logos/logo.png"
                                                alt="Infradyn"
                                                width={32}
                                                height={32}
                                                className="object-contain"
                                            />
                                        </div>
                                    </Link>
                                </SidebarMenuButton>
                            ) : (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            size="lg"
                                            className="h-12 rounded-xl flex items-center justify-center"
                                            tooltip="Switch Project"
                                        >
                                            <div className="flex items-center justify-center gap-1.5">
                                                <FolderSimple className="h-4.5 w-4.5" />
                                                {activeProject && (
                                                    <span
                                                        className={cn(
                                                            "h-2 w-2 rounded-full",
                                                            healthColors[activeProject.health].dot
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="right" align="start" sideOffset={10} className="w-64">
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                            Switch Project
                                        </div>
                                        <DropdownMenuSeparator />
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
                            )}
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}

                {/* Supplier Project Switcher */}
                {isSupplier && !isCollapsed && supplierProjects.length > 0 && (
                    <div className="px-2">
                        <SupplierProjectSwitcher
                            projects={supplierProjects}
                            activeProjectId={activeSupplierProjectId ?? null}
                        />
                    </div>
                )}

                {/* Active Project Indicator (The "Uber" Context) */}
                {!isSupplier && !isCollapsed && (
                    <div className="px-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={cn(
                                        "flex h-10 w-full items-center gap-2 rounded-xl border border-sidebar-border/80 px-3 text-left text-sm transition-colors",
                                        "bg-sidebar-accent/40 hover:bg-sidebar-accent/70",
                                        activeProject && healthColors[activeProject.health].bg
                                    )}
                                >
                                    {activeProject ? (
                                        <>
                                            <div
                                                className={cn(
                                                    "h-2.5 w-2.5 rounded-full",
                                                    healthColors[activeProject.health].dot
                                                )}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate leading-none">
                                                    {activeProject.name}
                                                </p>
                                            </div>
                                            <span className="text-xs font-medium text-sidebar-foreground/70">{activeProject.progress}%</span>
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
            <SidebarContent className="px-2 py-3">
                {isSupplier ? (
                    // Supplier Navigation with collapsible sub-items
                    <SidebarGroup className="px-1.5 py-1">
                        <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                            Portal
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1.5">
                                {supplierNav.map((item) =>
                                    item.subItems ? (
                                        isCollapsed ? (
                                            <SidebarMenuItem key={item.title}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <SidebarMenuButton
                                                            tooltip={item.title}
                                                            isActive={isActive(item.url)}
                                                            className={navButtonClass(isActive(item.url))}
                                                        >
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{item.title}</span>
                                                        </SidebarMenuButton>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        side="right"
                                                        align="start"
                                                        sideOffset={10}
                                                        className="w-52 rounded-xl border-sidebar-border/80 bg-sidebar text-sidebar-foreground"
                                                    >
                                                        {item.subItems.map((sub) => (
                                                            <DropdownMenuItem asChild key={sub.title}>
                                                                <Link href={sub.url} className="cursor-pointer gap-2 text-sm">
                                                                    <sub.icon className="h-3.5 w-3.5" />
                                                                    <span>{sub.title}</span>
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </SidebarMenuItem>
                                        ) : (
                                            <Collapsible key={item.title} asChild defaultOpen={pathname.startsWith(item.url.split("?")[0])} className="group/collapsible">
                                                <SidebarMenuItem>
                                                    <CollapsibleTrigger asChild>
                                                        <SidebarMenuButton
                                                            tooltip={item.title}
                                                            isActive={isActive(item.url)}
                                                            className={navButtonClass(isActive(item.url))}
                                                        >
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{item.title}</span>
                                                            <CaretRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                        </SidebarMenuButton>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent>
                                                        <SidebarMenuSub className="mx-4 mt-1 border-sidebar-border/70 px-2 py-1">
                                                            {item.subItems.map((sub) => (
                                                                <SidebarMenuSubItem key={sub.title}>
                                                                    <SidebarMenuSubButton
                                                                        asChild
                                                                        isActive={pathname === sub.url}
                                                                        className="h-8 rounded-lg text-xs data-[active=true]:bg-[#0E7490]! data-[active=true]:text-white!"
                                                                    >
                                                                        <Link href={sub.url} className="flex items-center gap-2">
                                                                            <sub.icon className="h-3.5 w-3.5" />
                                                                            <span>{sub.title}</span>
                                                                        </Link>
                                                                    </SidebarMenuSubButton>
                                                                </SidebarMenuSubItem>
                                                            ))}
                                                        </SidebarMenuSub>
                                                    </CollapsibleContent>
                                                </SidebarMenuItem>
                                            </Collapsible>
                                        )
                                    ) : (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                tooltip={item.title}
                                                isActive={isActive(item.url)}
                                                className={navButtonClass(isActive(item.url))}
                                            >
                                                <Link href={item.url} className="flex items-center gap-3">
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ) : (
                    // Full Navigation organized by workflow
                    <>
                        {renderNavGroup("Daily Operations", dailyOpsItems)}
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
            <SidebarFooter className="border-t border-sidebar-border/70 px-3 pb-3 pt-2">
                <SidebarMenu className="gap-1.5">
                    {accountNav.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                tooltip={item.title}
                                isActive={isActive(item.url)}
                                className={navButtonClass(isActive(item.url))}
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
