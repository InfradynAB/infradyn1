import { Suspense } from "react";
import { getUserOrganizations, } from "@/lib/actions/organization";
import { getUserProjects } from "@/lib/actions/project";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FolderSimpleIcon, CalendarBlankIcon, CurrencyDollarIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function ProjectsPage() {
    // Get session and user role
    const session = await auth.api.getSession({
        headers: await headers()
    });

    let isAdmin = false;
    if (session?.user) {
        const currentUser = await db.query.user.findFirst({
            where: eq(user.id, session.user.id),
            columns: { role: true }
        });
        isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
    }

    // We need orgs for the "New Project" dialog check
    const orgs = await getUserOrganizations();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Projects</h1>
                    <p className="text-muted-foreground">
                        {isAdmin ? "Manage and create projects for your organization." : "View projects you're assigned to."}
                    </p>
                </div>
                {/* Only ADMINs can create projects */}
                {isAdmin && orgs.length > 0 && <CreateProjectDialog organizations={orgs} />}
            </div>

            {!isAdmin && (
                <div className="border rounded-lg p-4 bg-muted/30 border-dashed">
                    <p className="text-sm text-muted-foreground">
                        💡 Only organization administrators can create new projects. Contact your admin if you need a new project set up.
                    </p>
                </div>
            )}

            {isAdmin && orgs.length === 0 && (
                <div className="border rounded-lg p-8 text-center text-muted-foreground bg-muted/50 border-dashed mb-6">
                    <p>You need to be a member of an organization to create a project.</p>
                </div>
            )}

            <Suspense fallback={<ProjectListSkeleton />}>
                <ProjectList />
            </Suspense>
        </div>
    );
}

async function ProjectList() {
    const projects = await getUserProjects();

    if (projects.length === 0) {
        return (
            <div className="border rounded-lg p-12 text-center text-muted-foreground bg-muted/50 border-dashed">
                <div className="flex flex-col items-center gap-2">
                    <FolderSimpleIcon className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold">No Projects</h3>
                    <p>You haven&apos;t created or joined any projects yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold truncate">
                                {project.name}
                            </CardTitle>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Badge variant="secondary" className="text-[10px] h-5 px-1">{project.organization.name}</Badge>
                                {project.code && <span>{project.code}</span>}
                            </div>
                        </div>
                        <FolderSimpleIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="mt-4">
                        <div className="space-y-2 text-sm text-muted-foreground">
                            {project.startDate && (
                                <div className="flex items-center gap-2">
                                    <CalendarBlankIcon className="h-4 w-4" />
                                    <span>
                                        {new Date(project.startDate).toLocaleDateString()}
                                        {project.endDate ? ` - ${new Date(project.endDate).toLocaleDateString()}` : " (No end date)"}
                                    </span>
                                </div>
                            )}
                            {project.budget && (
                                <div className="flex items-center gap-2">
                                    <CurrencyDollarIcon className="h-4 w-4" />
                                    <span>Budget: ${Number(project.budget ?? 0).toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/projects/${project.id}`}>View Dashboard</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function ProjectListSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <Skeleton className="h-6 w-[150px]" />
                            <Skeleton className="h-4 w-[100px]" />
                        </div>
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent className="space-y-4 mt-4">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                        <div className="flex justify-end">
                            <Skeleton className="h-9 w-[120px]" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
