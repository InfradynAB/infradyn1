import { SidebarWrapper } from "@/components/dashboard/sidebar-wrapper"
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
import { getActiveProjectId } from "@/lib/utils/project-context"
import { getSupplierProjects, getSupplierActiveProjectId } from "@/lib/utils/supplier-project-context"
import { redirect } from "next/navigation"
import db from "@/db/drizzle"
import { project, purchaseOrder, invoice, changeOrder, ncr, supplier } from "@/db/schema"
import { eq, and, not, inArray, or } from "drizzle-orm"
import { getProgressKPIs } from "@/lib/services/kpi-engine"

// Prevent search engine indexing of dashboard pages
export const metadata: Metadata = {
    ...noIndexMetadata,
    title: "Home ",
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

    // If not logged in, redirect to sign-in
    if (!session?.user) {
        redirect("/sign-in");
    }

    const user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
    };

    // Fetch organizations for the org switcher
    const { organizations, activeOrgId } = await getUserOrganizationsWithActive();

    // CRITICAL: User must belong to at least one organization to access the dashboard
    // Only invited users can access the software
    if (organizations.length === 0) {
        redirect("/access-denied");
    }

    // Fetch projects for the project switcher
    let projects: Array<{
        id: string;
        name: string;
        code: string;
        health: "healthy" | "at-risk" | "critical";
        progress: number;
    }> = [];

    // Count alerts for badge
    let alertCount = 0;

    // Get active project from cookie
    const activeProjectId = await getActiveProjectId();

    if (activeOrgId) {
        try {
            // Fetch active projects
            const projectsData = await db.query.project.findMany({
                where: and(
                    eq(project.organizationId, activeOrgId),
                    eq(project.isDeleted, false)
                ),
                columns: { id: true, name: true, code: true },
                limit: 10,
            });

            // Get health status for each project
            projects = await Promise.all(
                projectsData.map(async (p) => {
                    try {
                        const progressKPIs = await getProgressKPIs({
                            organizationId: activeOrgId,
                            projectId: p.id,
                        });
                        let health: "healthy" | "at-risk" | "critical" = "healthy";
                        if (progressKPIs.delayedCount > 0 || progressKPIs.atRiskCount > 2) {
                            health = "at-risk";
                        }
                        if (progressKPIs.delayedCount > 2) {
                            health = "critical";
                        }
                        return {
                            id: p.id,
                            name: p.name,
                            code: p.code || p.id.slice(0, 8).toUpperCase(),
                            health,
                            progress: Math.round(progressKPIs.physicalProgress),
                        };
                    } catch {
                        return {
                            id: p.id,
                            name: p.name,
                            code: p.code || p.id.slice(0, 8).toUpperCase(),
                            health: "healthy" as const,
                            progress: 0,
                        };
                    }
                })
            );

            // Count alerts (pending approvals, overdue, etc.)
            const orgPOs = await db.query.purchaseOrder.findMany({
                where: and(
                    eq(purchaseOrder.organizationId, activeOrgId),
                    eq(purchaseOrder.isDeleted, false)
                ),
                columns: { id: true },
            });
            const poIds = orgPOs.map((po) => po.id);

            if (poIds.length > 0) {
                const [pendingInvoices, pendingCOs, openNCRs] = await Promise.all([
                    db.query.invoice.findMany({
                        where: and(
                            inArray(invoice.purchaseOrderId, poIds),
                            eq(invoice.status, "PENDING_APPROVAL")
                        ),
                        columns: { id: true },
                    }),
                    db.query.changeOrder.findMany({
                        where: and(
                            inArray(changeOrder.purchaseOrderId, poIds),
                            eq(changeOrder.status, "PENDING")
                        ),
                        columns: { id: true },
                    }),
                    db.query.ncr.findMany({
                        where: and(
                            eq(ncr.organizationId, activeOrgId),
                            eq(ncr.isDeleted, false),
                            not(eq(ncr.status, "CLOSED")),
                            or(eq(ncr.severity, "CRITICAL"), eq(ncr.severity, "MAJOR"))
                        ),
                        columns: { id: true },
                    }),
                ]);
                alertCount = pendingInvoices.length + pendingCOs.length + openNCRs.length;
            }
        } catch (error) {
            console.error("Error fetching sidebar data:", error);
        }
    }

    // ------ Supplier-specific: fetch projects for the project switcher ------
    let supplierProjects: Array<{ id: string; name: string; code: string | null }> = [];
    let activeSupplierProjectId: string | null = null;

    if (user.role === "SUPPLIER") {
        try {
            // Find the supplier record for this user
            const supplierData = await db.query.supplier.findFirst({
                where: eq(supplier.userId, user.id),
                columns: { id: true },
            });

            if (supplierData) {
                supplierProjects = await getSupplierProjects(supplierData.id, activeOrgId);
                activeSupplierProjectId = await getSupplierActiveProjectId();
            }
        } catch (error) {
            console.error("Error fetching supplier projects:", error);
        }
    }

    return (
        <SidebarProvider>
            <SidebarWrapper
                user={user}
                organizations={organizations}
                activeOrgId={activeOrgId}
                projects={projects}
                activeProjectId={activeProjectId}
                alertCount={alertCount}
                supplierProjects={supplierProjects}
                activeSupplierProjectId={activeSupplierProjectId}
            />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">Infradyn</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Home</BreadcrumbPage>
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

