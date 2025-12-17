import { Suspense } from "react";
import { getUserOrganizations } from "@/lib/actions/organization";
import { CreateOrgDialog } from "@/components/create-org-dialog";
import { Card, CardHeader, CardTitle,  CardContent } from "@/components/ui/card";
import { BuildingsIcon, CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OrganizationsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Organizations</h1>
                    <p className="text-muted-foreground">Manage your organizations from here.</p>
                </div>
                <CreateOrgDialog />
            </div>

            <Suspense fallback={<OrgListSkeleton />}>
                <OrgList />
            </Suspense>
        </div>
    );
}

async function OrgList() {
    const orgs = await getUserOrganizations();

    if (orgs.length === 0) {
        return (
            <div className="border rounded-lg p-12 text-center text-muted-foreground bg-muted/50 border-dashed">
                <div className="flex flex-col items-center gap-2">
                    <BuildingsIcon className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold">No Organizations</h3>
                    <p>You haven&apos;t created or joined any organizations yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-bold truncate">
                            {org.name}
                        </CardTitle>
                        <BuildingsIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground mb-4">
                            /{org.slug}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                            <CalendarBlankIcon className="h-4 w-4" />
                            <span>Created {new Date(org.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="flex justify-end">
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/org/${org.slug}`}>View Details</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function OrgListSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-6 w-[150px]" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[200px]" />
                        <div className="flex justify-end">
                            <Skeleton className="h-9 w-[100px]" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
