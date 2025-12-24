import { Suspense } from "react";
import { getTeamMembers, getPendingInvitations } from "@/lib/actions/invitation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Badge } from "@/components/ui/badge";
import { InviteMemberDialog } from "@/components/invite-member-dialog"; // Extracting client logic
import { getSuppliers } from "@/lib/actions/supplier";

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

            <Suspense fallback={<p>Loading team...</p>}>
                <TeamList />
            </Suspense>

            <Suspense fallback={<p>Loading invites...</p>}>
                <InvitationList />
            </Suspense>
        </div>
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
                            </TableRow>
                        ))}
                        {members.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">No members found.</TableCell>
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
                            <TableHead>Sent</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invites.map((inv) => (
                            <TableRow key={inv.id}>
                                <TableCell>{inv.email}</TableCell>
                                <TableCell>{inv.role}</TableCell>
                                <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{inv.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
