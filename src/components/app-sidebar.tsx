import { CalendarIcon, HouseIcon, TrayIcon, MagnifyingGlassIcon, GearIcon, BuildingsIcon, GitForkIcon, TruckIcon, FolderSimpleIcon, Hexagon } from "@phosphor-icons/react/dist/ssr"

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
} from "@/components/ui/sidebar"

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
        title: "Suppliers",
        url: "/dashboard/suppliers",
        icon: TruckIcon,
    },
    {
        title: "Projects",
        url: "/dashboard/projects",
        icon: FolderSimpleIcon,
    },
    {
        title: "Settings",
        url: "/dashboard/settings",
        icon: GearIcon,
    },
]

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Hexagon weight="fill" className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold tracking-tight">Infradyn</span>
                                    <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Materials</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Platform</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
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
