import { Suspense } from "react";
import { getTeamMembers, getPendingInvitations } from "@/lib/actions/invitation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Badge } from "@/components/ui/badge";
import { InviteMemberDialog } from "@/components/invite-member-dialog"; // Extracting client logic
import { getSuppliers } from "@/lib/actions/supplier";
import { Skeleton } from "@/components/ui/skeleton";

function getAccessLabel(role: string) {
    if (role === "SUPPLIER") return "Supplier Portal";
    if (role === "ADMIN" || role === "SUPER_ADMIN") return "Organization Admin";
    return "Project Workspace";
}

function getStatusBadge(status: string) {
    const normalized = status.toUpperCase();

    if (normalized === "ACTIVE" || normalized === "ACCEPTED") {
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">Active</Badge>;
    }
    if (normalized === "PENDING") {
        return <Badge variant="secondary">Pending</Badge>;
    }
    if (normalized === "REJECTED") {
        return <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">Rejected</Badge>;
    }

    return <Badge variant="outline">Inactive</Badge>;
}

export default async function TeamSettingsPage() {
    const suppliers = await getSuppliers();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Team</h1>
                    <p className="text-muted-foreground">Manage members and invitations.</p>
                </div>
                <div className="flex gap-2">
                    <InviteMemberDialog suppliers={suppliers} />
                </div>
            </div>

            <Suspense fallback={<TeamListSkeleton />}>
                <TeamList />
            </Suspense>

            <Suspense fallback={<InvitationListSkeleton />}>
                <InvitationList />
            </Suspense>
        </div>
    );
}

function TeamListSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    );
}

function InvitationListSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    );
}

async function TeamList() {
    const members = await getTeamMembers();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Members</CardTitle>
                <CardDescription>People with access to this organization.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Access</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.map((m) => (
                            <TableRow key={m.id}>
                                <TableCell className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={m.user.image || ""} />
                                        <AvatarFallback>{m.user.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{m.user.name}</span>
                                </TableCell>
                                <TableCell>{m.user.email}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{m.role}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{getAccessLabel(m.role)}</TableCell>
                                <TableCell>{getStatusBadge((m.user as any).isDeleted ? "INACTIVE" : "ACTIVE")}</TableCell>
                                <TableCell className="text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                        {members.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">No members found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

async function InvitationList() {
    const invites = await getPendingInvitations();

    if (invites.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Access</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invites.map((inv) => (
                            <TableRow key={inv.id}>
                                <TableCell>{inv.email}</TableCell>
                                <TableCell>{inv.role}</TableCell>
                                <TableCell className="text-muted-foreground">{getAccessLabel(inv.role)}</TableCell>
                                <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    {getStatusBadge(inv.status)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
