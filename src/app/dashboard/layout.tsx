import { AppSidebar } from "@/components/app-sidebar"
import { UserMenu } from "@/components/user-menu"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ModeToggle } from "@/components/themes/mode-toggle"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { NotificationCenter } from "@/components/shared/notification-center"
import { auth } from "../../../auth"
import { headers } from "next/headers"
import { noIndexMetadata } from "@/lib/seo.config"
import type { Metadata } from "next"
import { getUserOrganizationsWithActive } from "@/lib/utils/org-context"

// Prevent search engine indexing of dashboard pages
export const metadata: Metadata = {
    ...noIndexMetadata,
    title: "Dashboard",
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Fetch user session server-side
    const session = await auth.api.getSession({
        headers: await headers()
    });

    const user = session?.user ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role, // Pass role for sidebar logic
    } : null;

    // Fetch organizations for the org switcher
    const { organizations, activeOrgId } = await getUserOrganizationsWithActive();

    return (
        <SidebarProvider>
            <AppSidebar 
                user={user} 
                organizations={organizations}
                activeOrgId={activeOrgId}
            />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="#">Materials Tracker</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex items-center gap-2">
                        {user?.id && <NotificationCenter userId={user.id} />}
                        <ModeToggle />
                        <UserMenu user={user} />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

