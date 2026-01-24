import { CalendarIcon, HouseIcon, TrayIcon, MagnifyingGlassIcon, GearIcon, BuildingsIcon, GitForkIcon, TruckIcon, FolderSimpleIcon, Hexagon, FileTextIcon, PlugsConnectedIcon, UserCircleIcon } from "@phosphor-icons/react/dist/ssr"

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
} from "@/components/ui/sidebar"
import { OrgSwitcher } from "./org-switcher"

interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    role: string;
}

// Menu items.
const items = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: HouseIcon,
    },
    {
        title: "Organizations",
        url: "/dashboard/org",
        icon: BuildingsIcon,
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

const supplierItems = [
    {
        title: "Dashboard",
        url: "/dashboard/supplier",
        icon: HouseIcon,
    },
    {
        title: "My POs",
        url: "/dashboard/supplier/pos", // Or just link to dashboard if it lists them
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
    const menuItems = isSupplier ? supplierItems : items;

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href={isSupplier ? "/dashboard/supplier" : "/dashboard"}>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Hexagon weight="fill" className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold tracking-tight">Infradyn</span>
                                    <span className="text-[10px] text-muted-foreground tracking-widest uppercase">{isSupplier ? "Supplier Portal" : "Materials"}</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                {/* Organization Switcher */}
                {!isSupplier && organizations.length > 0 && (
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
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title}>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
