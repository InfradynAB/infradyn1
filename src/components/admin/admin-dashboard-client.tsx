"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    UsersThree,
    UserPlus,
    EnvelopeSimple,
    Buildings,
    ChartLineUp,
    ShieldCheck,
    Clock,
    CheckCircle,
    Warning,
    Gear,
    MagnifyingGlass
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { inviteMember } from "@/lib/actions/invitation";

interface AdminDashboardClientProps {
    organization: {
        id: string;
        name: string;
        slug: string;
        logo?: string | null;
    };
    members: Array<{
        id: string;
        role: string;
        createdAt: Date;
        user: {
            id: string;
            name: string;
            email: string;
            image?: string | null;
        };
    }>;
    pendingInvites: Array<{
        id: string;
        email: string;
        role: string;
        status: string;
        createdAt: Date;
        expiresAt: Date;
    }>;
    stats: {
        totalMembers: number;
        pendingInvites: number;
        activeProjects: number;
        activePOs: number;
    };
}

export function AdminDashboardClient({
    organization,
    members,
    pendingInvites,
    stats
}: AdminDashboardClientProps) {
    const [isInviting, setIsInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("PM");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredMembers = members.filter(m =>
        m.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setIsInviting(true);

        const formData = new FormData();
        formData.append("email", inviteEmail);
        formData.append("role", inviteRole);

        const result = await inviteMember(formData);

        if (result.success) {
            toast.success("Invitation sent successfully!");
            setInviteEmail("");
        } else {
            toast.error(result.error || "Failed to send invitation");
        }
        setIsInviting(false);
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border">
                        {organization.logo ? (
                            <img src={organization.logo} alt={organization.name} className="h-10 w-10 rounded-lg" />
                        ) : (
                            <Buildings className="h-8 w-8 text-primary" weight="duotone" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
                        <p className="text-muted-foreground">Organization Administration</p>
                    </div>
                </div>
                <Badge variant="outline" className="gap-1.5 text-sm py-1.5 px-3">
                    <ShieldCheck className="h-4 w-4 text-green-500" weight="fill" />
                    Admin Access
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Team Members</p>
                                <p className="text-3xl font-bold">{stats.totalMembers}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <UsersThree className="h-6 w-6 text-blue-500" weight="duotone" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Invites</p>
                                <p className="text-3xl font-bold">{stats.pendingInvites}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-amber-500" weight="duotone" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Projects</p>
                                <p className="text-3xl font-bold">{stats.activeProjects}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <ChartLineUp className="h-6 w-6 text-green-500" weight="duotone" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active POs</p>
                                <p className="text-3xl font-bold">{stats.activePOs}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-purple-500" weight="duotone" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="members" className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="members" className="gap-2">
                        <UsersThree className="h-4 w-4" />
                        Members
                    </TabsTrigger>
                    <TabsTrigger value="invite" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Invite
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                        <Gear className="h-4 w-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                {/* Members Tab */}
                <TabsContent value="members" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <CardTitle>Organization Members</CardTitle>
                                    <CardDescription>Manage your team members and their roles.</CardDescription>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search members..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Member</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={member.user.image || ""} />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                        {member.user.name?.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{member.user.name}</p>
                                                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                                                    {member.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(member.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">
                                                    Manage
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredMembers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No members found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Pending Invitations */}
                    {pendingInvites.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <EnvelopeSimple className="h-5 w-5" />
                                    Pending Invitations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Sent</TableHead>
                                            <TableHead>Expires</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingInvites.map((invite) => (
                                            <TableRow key={invite.id}>
                                                <TableCell className="font-medium">{invite.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{invite.role}</Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(invite.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(invite.expiresAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" className="text-destructive">
                                                        Revoke
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Invite Tab */}
                <TabsContent value="invite">
                    <Card className="max-w-lg">
                        <CardHeader>
                            <CardTitle>Invite Team Member</CardTitle>
                            <CardDescription>
                                Send an invitation to add new members to your organization.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleInvite} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="colleague@company.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select value={inviteRole} onValueChange={setInviteRole}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PM">Project Manager</SelectItem>
                                            <SelectItem value="SUPPLIER">Supplier</SelectItem>
                                            <SelectItem value="QA">Quality Assurance</SelectItem>
                                            <SelectItem value="SITE_RECEIVER">Site Receiver</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Select the role that best matches this person&apos;s responsibilities.
                                    </p>
                                </div>
                                <Button type="submit" className="w-full gap-2" disabled={isInviting}>
                                    <UserPlus className="h-4 w-4" />
                                    {isInviting ? "Sending..." : "Send Invitation"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <Card className="max-w-lg">
                        <CardHeader>
                            <CardTitle>Organization Settings</CardTitle>
                            <CardDescription>
                                Manage your organization&apos;s profile and preferences.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Organization Name</Label>
                                <Input defaultValue={organization.name} />
                            </div>
                            <div className="space-y-2">
                                <Label>Organization Slug</Label>
                                <Input defaultValue={organization.slug} disabled />
                                <p className="text-xs text-muted-foreground">
                                    The slug cannot be changed after creation.
                                </p>
                            </div>
                            <Button>Save Changes</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
