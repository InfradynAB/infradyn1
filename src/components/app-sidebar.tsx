import { CalendarIcon, HouseIcon, TrayIcon, MagnifyingGlassIcon, GearIcon, BuildingsIcon, GitForkIcon, TruckIcon, FolderSimpleIcon, Hexagon, FileTextIcon, PlugsConnectedIcon, UserCircleIcon, ChartLineUp, UsersThreeIcon, ShieldCheckIcon, MapTrifoldIcon, CurrencyDollarIcon, SquaresFourIcon, ShieldStarIcon, BellIcon, ListBulletsIcon, ClockCounterClockwiseIcon, CaretRightIcon, Gauge, Receipt, ShieldWarning, Target } from "@phosphor-icons/react/dist/ssr"
import Image from "next/image"

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
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { OrgSwitcher } from "./org-switcher"
import type { Icon } from "@phosphor-icons/react"

interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    role: string;
}

interface SubItem {
    title: string;
    url: string;
    icon: Icon;
}

interface MenuItem {
    title: string;
    url: string;
    icon: Icon;
    roles?: string[];
    subItems?: SubItem[];
}

// Menu items.
const items: MenuItem[] = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: HouseIcon,
    },
    {
        title: "Admin Dashboard",
        url: "/dashboard/admin",
        icon: ShieldStarIcon,
        roles: ["ADMIN", "SUPER_ADMIN"], // Only visible to Admins
    },
    {
        title: "Executive Dashboard",
        url: "/dashboard/executive",
        icon: ChartLineUp,
        roles: ["ADMIN", "SUPER_ADMIN"], // Only visible to Admins
    },
    {
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: ChartLineUp,
        subItems: [
            { title: "Overview", url: "/dashboard/analytics", icon: Gauge },
            { title: "Delivery Categories", url: "/dashboard/analytics/delivery-categories", icon: TruckIcon },
            { title: "Supplier Scorecards", url: "/dashboard/analytics/suppliers", icon: UsersThreeIcon },
            { title: "Quality & NCR", url: "/dashboard/analytics/quality", icon: ShieldCheckIcon },
            { title: "Logistics", url: "/dashboard/analytics/logistics", icon: MapTrifoldIcon },
            { title: "Finance", url: "/dashboard/analytics/finance", icon: CurrencyDollarIcon },
        ],
    },
    {
        title: "My PM Dashboard",
        url: "/dashboard/pm/overview",
        icon: SquaresFourIcon,
        roles: ["PM", "PROJECT_MANAGER"], // Only visible to PMs
    },
    {
        title: "Supplier Scorecards",
        url: "/dashboard/analytics/suppliers",
        icon: UsersThreeIcon,
    },
    {
        title: "Quality & NCR",
        url: "/dashboard/analytics/quality",
        icon: ShieldCheckIcon,
    },
    {
        title: "Logistics",
        url: "/dashboard/analytics/logistics",
        icon: MapTrifoldIcon,
    },
    {
        title: "Finance",
        url: "/dashboard/analytics/finance",
        icon: CurrencyDollarIcon,
    },
    {
        title: "Projects",
        url: "/dashboard/projects",
        icon: FolderSimpleIcon,
    },
    {
        title: "Procurement",
        url: "/dashboard/procurement",
        icon: FileTextIcon,
    },
    {
        title: "Suppliers",
        url: "/dashboard/suppliers",
        icon: TruckIcon,
    },
    {
        title: "Alerts",
        url: "/dashboard/alerts",
        icon: BellIcon,
        subItems: [
            { title: "All Alerts", url: "/dashboard/alerts", icon: ListBulletsIcon },
            { title: "Logs", url: "/dashboard/alerts/logs", icon: ClockCounterClockwiseIcon },
        ],
    },
    {
        title: "Integrations",
        url: "/dashboard/settings/integrations",
        icon: PlugsConnectedIcon,
    },
    {
        title: "Profile",
        url: "/dashboard/profile",
        icon: UserCircleIcon,
    },
    {
        title: "Settings",
        url: "/dashboard/settings",
        icon: GearIcon,
    },
]

const supplierItems: MenuItem[] = [
    {
        title: "Dashboard",
        url: "/dashboard/supplier",
        icon: HouseIcon,
    },
    {
        title: "Analytics",
        url: "/dashboard/supplier/analytics",
        icon: ChartLineUp,
        subItems: [
            { title: "Overview", url: "/dashboard/supplier/analytics?tab=overview", icon: Gauge },
            { title: "PO Status", url: "/dashboard/supplier/analytics?tab=orders", icon: FileTextIcon },
            { title: "Deliveries", url: "/dashboard/supplier/analytics?tab=deliveries", icon: TruckIcon },
            { title: "Invoices", url: "/dashboard/supplier/analytics?tab=invoices", icon: Receipt },
            { title: "NCRs", url: "/dashboard/supplier/analytics?tab=ncrs", icon: ShieldWarning },
            { title: "Milestones", url: "/dashboard/supplier/analytics?tab=milestones", icon: Target },
            { title: "Compliance", url: "/dashboard/supplier/analytics?tab=compliance", icon: ShieldCheckIcon },
        ],
    },
    {
        title: "My POs",
        url: "/dashboard/supplier/pos",
        icon: FileTextIcon,
    },
    {
        title: "Profile & Compliance",
        url: "/dashboard/supplier/onboarding",
        icon: TruckIcon,
    },
]

export function AppSidebar({
    user,
    organizations = [],
    activeOrgId = null
}: {
    user?: { role: string } | null;
    organizations?: Organization[];
    activeOrgId?: string | null;
}) {
    const isSupplier = user?.role === "SUPPLIER";
    const userRole = user?.role || "";

    // Filter items based on role - items with no roles array are visible to all
    const filteredItems = items.filter(item => {
        if (!('roles' in item) || !item.roles) return true;
        return item.roles.includes(userRole);
    });

    const menuItems = isSupplier ? supplierItems : filteredItems;

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href={isSupplier ? "/dashboard/supplier" : "/dashboard"} className="flex items-center gap-2">
                                <div className="flex h-9 items-center overflow-hidden">
                                    <Image
                                        src="/logos/logo.png"
                                        alt="Infradyn"
                                        width={120}
                                        height={28}
                                        className="h-7 w-auto object-contain"
                                    />
                                </div>
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Materials</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                {/* Organization Switcher - always show for non-suppliers */}
                {!isSupplier && (
                    <div className="px-2 pb-2">
                        <OrgSwitcher
                            organizations={organizations}
                            activeOrgId={activeOrgId}
                        />
                    </div>
                )}
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Platform</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {menuItems.map((item) => (
                                'subItems' in item && item.subItems ? (
                                    <Collapsible key={item.title} asChild defaultOpen className="group/collapsible">
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton tooltip={item.title}>
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                    <CaretRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {item.subItems.map((subItem) => (
                                                        <SidebarMenuSubItem key={subItem.title}>
                                                            <SidebarMenuSubButton asChild>
                                                                <a href={subItem.url}>
                                                                    <subItem.icon className="size-4" />
                                                                    <span>{subItem.title}</span>
                                                                </a>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                ) : (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild tooltip={item.title}>
                                            <a href={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
