import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FolderSimpleIcon, PlusIcon, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/auth";
import { getActiveOrganization } from "@/lib/actions/organization";

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect("/sign-in");
    }

    const activeOrg = await getActiveOrganization();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Welcome, {session.user.name}!</h1>
                <p className="text-muted-foreground">Manage your projects from here.</p>
            </div>

            {activeOrg && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CheckCircle className="h-5 w-5 text-primary" weight="fill" />
                            Active Organization
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold text-xl">{activeOrg.name}</p>
                        <p className="text-sm text-muted-foreground">
                            All data shown below is for this organization. Use the switcher in the sidebar to change.
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FolderSimpleIcon className="h-5 w-5" />
                            Projects
                        </CardTitle>
                        <CardDescription>Create and manage your projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/projects">
                                <PlusIcon className="mr-2 h-4 w-4" />
                                View Projects
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Session Info</CardTitle>
                        <CardDescription>Your current session details</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                        <p><strong>Email:</strong> {session.user.email}</p>
                        <p><strong>Verified:</strong> {session.user.emailVerified ? "Yes" : "No"}</p>
                        <p><strong>2FA:</strong> {session.user.twoFactorEnabled ? "Enabled" : "Disabled"}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
