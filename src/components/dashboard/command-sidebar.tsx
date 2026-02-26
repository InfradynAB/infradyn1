"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
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
    Lifebuoy,
    ListBullets,
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
    {
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: ChartLineUp,
        subItems: [
            { title: "Overview", url: "/dashboard/analytics", icon: Gauge },
            { title: "Delivery Categories", url: "/dashboard/analytics/delivery-categories", icon: Truck },
            { title: "Quality", url: "/dashboard/analytics/quality", icon: ShieldWarning },
            { title: "Logistics", url: "/dashboard/analytics/logistics", icon: Package },
            { title: "Finance", url: "/dashboard/analytics/finance", icon: CurrencyDollar },
            { title: "Suppliers", url: "/dashboard/analytics/suppliers", icon: UsersThree },
        ],
    },
];

const financialsNav = [
    {
        title: "Procurement",
        url: "/dashboard/procurement",
        icon: FileText,
        subItems: [
            { title: "Purchase Orders", url: "/dashboard/procurement", icon: FileText },
            { title: "New Purchase Order", url: "/dashboard/procurement/new", icon: FileText },
            { title: "Upload Document", url: "/dashboard/procurement/new?step=upload", icon: FileArrowUp },
            { title: "BOQ Tracker", url: "/dashboard/boq", icon: ListBullets },
        ],
    },
    {
        title: "BOQ Tracker",
        url: "/dashboard/boq",
        icon: ListBullets,
    },
    {
        title: "Invoices",
        url: "/dashboard/procurement?tab=invoices",
        icon: Receipt,
        subItems: [
            { title: "Invoices Overview", url: "/dashboard/procurement?tab=invoices", icon: Receipt },
            { title: "Finance Dashboard", url: "/dashboard/analytics/finance", icon: CurrencyDollar },
        ],
    },
    {
        title: "Change Orders",
        url: "/dashboard/procurement?tab=change-orders",
        icon: FileArrowUp,
        subItems: [
            { title: "Change Orders Overview", url: "/dashboard/procurement?tab=change-orders", icon: FileArrowUp },
            { title: "Purchase Orders", url: "/dashboard/procurement", icon: FileText },
        ],
    },
];

const qualityLogisticsNav = [
    {
        title: "Materials Tracker",
        url: "/dashboard/procurement?tab=material-tracker",
        icon: Package,
        subItems: [
            { title: "Materials Overview", url: "/dashboard/procurement?tab=material-tracker", icon: Package },
            { title: "Purchase Orders", url: "/dashboard/procurement", icon: FileText },
        ],
    },
    { title: "Quality Alerts", url: "/dashboard/alerts", icon: Warning },
    {
        title: "Deliveries",
        url: "/dashboard/procurement?tab=deliveries",
        icon: Truck,
        subItems: [
            { title: "Deliveries Overview", url: "/dashboard/procurement?tab=deliveries", icon: Truck },
            { title: "Purchase Orders", url: "/dashboard/procurement", icon: FileText },
        ],
    },
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
    { title: "Support", url: "/dashboard/support", icon: Lifebuoy },
    { title: "Profile", url: "/dashboard/profile", icon: User },
    { title: "Settings", url: "/dashboard/settings", icon: Gear },
];

// Site Receiver navigation
const receiverNav: SidebarNavItem[] = [
    { title: "Dashboard", url: "/dashboard/receiver", icon: SquaresFour },
    {
        title: "Deliveries",
        url: "/dashboard/receiver/deliveries",
        icon: Truck,
        subItems: [
            { title: "Incoming Shipments", url: "/dashboard/receiver/deliveries", icon: Package },
            { title: "My Confirmed", url: "/dashboard/receiver/deliveries?tab=confirmed", icon: ShieldCheck },
        ],
    },
    {
        title: "PO Tracking",
        url: "/dashboard/receiver/pos",
        icon: FileText,
    },
    {
        title: "NCRs",
        url: "/dashboard/receiver/ncr",
        icon: ShieldWarning,
        subItems: [
            { title: "My NCRs", url: "/dashboard/receiver/ncr", icon: Warning },
            { title: "Raise NCR", url: "/dashboard/receiver/ncr/new", icon: ShieldWarning },
        ],
    },
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
    const searchParams = useSearchParams();
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const isSupplier = user?.role === "SUPPLIER";
    const isSiteReceiver = user?.role === "SITE_RECEIVER";

    const activeProject = projects.find((p) => p.id === activeProjectId);
    // Keep Analytics consistent: always routes to /dashboard/analytics (hub).
    const dailyOpsItems: SidebarNavItem[] = dailyOpsNav;

    // Helper to check if link is active
    const isActive = (url: string) => {
        if (url === "/dashboard") return pathname === "/dashboard";

        const [basePath, queryString] = url.split("?");
        if (!pathname.startsWith(basePath)) return false;

        if (queryString) {
            const expected = new URLSearchParams(queryString);
            const expectedTab = expected.get("tab");
            if (expectedTab) {
                // When a nav item encodes a `tab`, only mark it active if the current URL has the same tab.
                return searchParams.get("tab") === expectedTab;
            }
        }

        return true;
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
                                        <div className="flex items-center gap-1">
                                            <SidebarMenuButton
                                                asChild
                                                tooltip={item.title}
                                                isActive={isActive(item.url)}
                                                className={cn(navButtonClass(isActive(item.url)), "flex-1")}
                                            >
                                                <Link href={item.url} className="flex items-center gap-3">
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                            <CollapsibleTrigger asChild>
                                                <button
                                                    type="button"
                                                    aria-label={`Toggle ${item.title}`}
                                                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                                                >
                                                    <CaretRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                </button>
                                            </CollapsibleTrigger>
                                        </div>
                                        <CollapsibleContent>
                                            <SidebarMenuSub className="mx-4 mt-1 border-sidebar-border/70 px-2 py-1">
                                                {item.subItems.map((sub) => (
                                                    <SidebarMenuSubItem key={sub.title}>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={isActive(sub.url)}
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

                {!isCollapsed && (
                    <SidebarMenu className="mb-3">
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild className="h-12 rounded-xl">
                                <Link
                                    href={isSupplier ? "/dashboard/supplier" : "/dashboard"}
                                    className="flex items-center gap-2"
                                >
                                    <div className="flex h-9 items-center overflow-hidden">
                                        <Image
                                            src="/logos/logo.png"
                                            alt="Infradyn"
                                            width={120}
                                            height={28}
                                            className="h-7 w-auto object-contain"
                                        />
                                    </div>
                                    <span className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/70">Materials</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}

                {/* Supplier Project Switcher */}
                {isSiteReceiver && !isCollapsed && (
                    <div className="mt-1 px-2">
                        <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-sidebar-border/80 bg-sidebar-accent/40 px-3 text-sm">
                            <Package className="h-4 w-4 text-sidebar-foreground/60" />
                            <span className="font-medium text-sidebar-foreground/80 text-xs">Site Receiver Portal</span>
                        </div>
                    </div>
                )}
                {isSupplier && !isCollapsed && supplierProjects.length > 0 && (
                    <div className="mt-1 px-2">
                        <SupplierProjectSwitcher
                            projects={supplierProjects}
                            activeProjectId={activeSupplierProjectId ?? null}
                        />
                    </div>
                )}

                {/* Active Project Indicator (The "Uber" Context) */}
                {!isSupplier && !isCollapsed && (
                    <div className="mt-1 px-2">
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
                {isSiteReceiver ? (
                    // Site Receiver Navigation
                    <SidebarGroup className="px-1.5 py-1">
                        <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                            Site Portal
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1.5">
                                {receiverNav.map((item) =>
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
                                                    <DropdownMenuContent side="right" align="start" sideOffset={10} className="w-52 rounded-xl border-sidebar-border/80 bg-sidebar text-sidebar-foreground">
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
                                                    <div className="flex items-center gap-1">
                                                        <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item.url)} className={cn(navButtonClass(isActive(item.url)), "flex-1")}>
                                                            <Link href={item.url} className="flex items-center gap-3">
                                                                <item.icon className="h-4 w-4" />
                                                                <span>{item.title}</span>
                                                            </Link>
                                                        </SidebarMenuButton>
                                                        <CollapsibleTrigger asChild>
                                                            <button type="button" aria-label={`Toggle ${item.title}`} className="flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60">
                                                                <CaretRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                            </button>
                                                        </CollapsibleTrigger>
                                                    </div>
                                                    <CollapsibleContent>
                                                        <SidebarMenuSub className="mx-4 mt-1 border-sidebar-border/70 px-2 py-1">
                                                            {item.subItems.map((sub) => (
                                                                <SidebarMenuSubItem key={sub.title}>
                                                                    <SidebarMenuSubButton asChild isActive={isActive(sub.url)} className="h-8 rounded-lg text-xs data-[active=true]:bg-[#0E7490]! data-[active=true]:text-white!">
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
                                            <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item.url)} className={navButtonClass(isActive(item.url))}>
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
                ) : isSupplier ? (
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
