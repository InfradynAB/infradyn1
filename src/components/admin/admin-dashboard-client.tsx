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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    UsersThree,
    UserPlus,
    EnvelopeSimple,
    Buildings,
    ChartLineUp,
    ShieldCheck,
    Clock,
    CheckCircle,
    Gear,
    MagnifyingGlass,
    PencilSimple,
    Trash,
    XCircle,
    Shield,
    User,
    Factory,
    DownloadSimple,
    UploadSimple,
    PaperPlaneTilt,
    X,
    DotsSixVertical,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { inviteMember } from "@/lib/actions/invitation";
import { removeOrganizationMember, updateAdminOrganizationDetails, updateOrganizationMemberEmail } from "@/lib/actions/admin-members";
import * as XLSX from "xlsx";

function reorderCols(
    arr: string[], from: string, to: string, setter: (val: string[]) => void
) {
    const next = [...arr]; const fi = next.indexOf(from); const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return; next.splice(fi, 1); next.splice(ti, 0, from); setter(next);
}

type BulkInviteRole = "PM" | "SUPPLIER" | "QA" | "SITE_RECEIVER";

type BulkInviteRow = {
    id: string;
    name: string;
    email: string;
    role: BulkInviteRole;
};

interface AdminDashboardClientProps {
    organization: {
        id: string;
        name: string;
        slug: string;
        logo?: string | null;
        contactEmail?: string | null;
        phone?: string | null;
        website?: string | null;
        industry?: string | null;
        size?: string | null;
        description?: string | null;
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
            isDeleted?: boolean;
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
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [orgContactEmail, setOrgContactEmail] = useState(organization.contactEmail || "");
    const [orgPhone, setOrgPhone] = useState(organization.phone || "");
    const [orgWebsite, setOrgWebsite] = useState(organization.website || "");
    const [orgIndustry, setOrgIndustry] = useState(organization.industry || "");
    const [orgSize, setOrgSize] = useState(organization.size || "");
    const [orgDescription, setOrgDescription] = useState(organization.description || "");
    const [bulkRows, setBulkRows] = useState<BulkInviteRow[]>([]);
    const [isSendingBulk, setIsSendingBulk] = useState(false);
    const [isEditEmailOpen, setIsEditEmailOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<{ id: string; name: string; email: string } | null>(null);
    const [selectedMemberForDelete, setSelectedMemberForDelete] = useState<{ id: string; name: string } | null>(null);
    const [editedEmail, setEditedEmail] = useState("");
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const [isDeletingMember, setIsDeletingMember] = useState(false);
    const [memberCols, setMemberCols] = useState(["member", "email", "role", "access", "status", "joined"]);
    const [memberDragCol, setMemberDragCol] = useState<string | null>(null);
    const [memberDragOverCol, setMemberDragOverCol] = useState<string | null>(null);
    const [inviteCols, setInviteCols] = useState(["invEmail", "role", "access", "status", "sent", "expires"]);
    const [inviteDragCol, setInviteDragCol] = useState<string | null>(null);
    const [inviteDragOverCol, setInviteDragOverCol] = useState<string | null>(null);

    const filteredMembers = members.filter(m =>
        m.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingInvitations = pendingInvites.filter(invite => invite.status === "PENDING");
    const validBulkRows = bulkRows.filter((row) => row.email.trim().includes("@"));

    const getAccessLabel = (role: string) => {
        if (role === "SUPPLIER") return "Supplier Portal";
        if (role === "ADMIN" || role === "SUPER_ADMIN") return "Organization Admin";
        return "Project Workspace";
    };

    const getStatusBadge = (status: string) => {
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
    };

    const createRowId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const updateBulkRow = (rowId: string, patch: Partial<BulkInviteRow>) => {
        setBulkRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
    };

    const removeBulkRow = (rowId: string) => {
        setBulkRows((rows) => rows.filter((row) => row.id !== rowId));
    };

    const addBulkRow = () => {
        setBulkRows((rows) => [
            ...rows,
            { id: createRowId(), name: "", email: "", role: "PM" }
        ]);
    };

    const downloadBulkTemplate = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet([
            { name: "Jane Doe", email: "jane@example.com", role: "PM" },
            { name: "Supplier User", email: "supplier@example.com", role: "SUPPLIER" },
        ]);
        XLSX.utils.book_append_sheet(wb, ws, "bulk_invite_template");
        XLSX.writeFile(wb, "infradyn_bulk_invite_template.xlsx");
    };

    const handleUploadBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const bytes = await file.arrayBuffer();
            const wb = XLSX.read(bytes, { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

            const parsed = rows
                .map((row) => {
                    const rawName = (row.name ?? row.Name ?? "").toString().trim();
                    const rawEmail = (row.email ?? row.Email ?? "").toString().trim().toLowerCase();
                    const rawRole = (row.role ?? row.Role ?? "PM").toString().trim().toUpperCase();

                    const role: BulkInviteRole = rawRole === "SUPPLIER" || rawRole === "QA" || rawRole === "SITE_RECEIVER"
                        ? rawRole
                        : "PM";

                    return {
                        id: createRowId(),
                        name: rawName,
                        email: rawEmail,
                        role,
                    } as BulkInviteRow;
                })
                .filter((row) => row.email.length > 0);

            setBulkRows(parsed);
            toast.success(`Imported ${parsed.length} user${parsed.length === 1 ? "" : "s"}.`);
        } catch {
            toast.error("Could not read file. Please use the template and try again.");
        } finally {
            e.target.value = "";
        }
    };

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

    async function handleEditEmailSubmit() {
        if (!selectedMemberForEdit) return;

        const nextEmail = editedEmail.trim().toLowerCase();
        if (!nextEmail || nextEmail === selectedMemberForEdit.email.toLowerCase()) {
            setIsEditEmailOpen(false);
            return;
        }

        setIsUpdatingEmail(true);
        const result = await updateOrganizationMemberEmail(selectedMemberForEdit.id, nextEmail);
        if (result.success) {
            toast.success("Member email updated.");
            setIsEditEmailOpen(false);
            setSelectedMemberForEdit(null);
        } else {
            toast.error(result.error || "Failed to update email.");
        }
        setIsUpdatingEmail(false);
    }

    async function handleDeleteMemberConfirm() {
        if (!selectedMemberForDelete) return;

        setIsDeletingMember(true);
        const result = await removeOrganizationMember(selectedMemberForDelete.id);
        if (result.success) {
            toast.success("Member removed from organization.");
            setIsDeleteConfirmOpen(false);
            setSelectedMemberForDelete(null);
        } else {
            toast.error(result.error || "Failed to remove member.");
        }
        setIsDeletingMember(false);
    }

    async function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSavingSettings(true);

        const formData = new FormData();
        formData.append("orgId", organization.id);
        formData.append("contactEmail", orgContactEmail);
        formData.append("phone", orgPhone);
        formData.append("website", orgWebsite);
        formData.append("industry", orgIndustry);
        formData.append("size", orgSize);
        formData.append("description", orgDescription);

        const result = await updateAdminOrganizationDetails(formData);
        if (result.success) {
            toast.success("Organization details updated.");
        } else {
            toast.error(result.error || "Failed to update settings.");
        }

        setIsSavingSettings(false);
    }

    async function handleSendBulkInvites() {
        if (validBulkRows.length === 0) {
            toast.error("Add at least one valid email before sending.");
            return;
        }

        setIsSendingBulk(true);
        let successCount = 0;
        let failCount = 0;

        for (const row of validBulkRows) {
            const formData = new FormData();
            formData.append("email", row.email.trim().toLowerCase());
            formData.append("role", row.role);

            const result = await inviteMember(formData);
            if (result.success) {
                successCount += 1;
            } else {
                failCount += 1;
            }
        }

        if (successCount > 0) {
            toast.success(`Sent ${successCount} invitation${successCount === 1 ? "" : "s"}.`);
        }
        if (failCount > 0) {
            toast.error(`${failCount} invitation${failCount === 1 ? "" : "s"} failed.`);
        }

        setIsSendingBulk(false);
    }

    const MEMBER_DEF: Record<string, { label: string; cell: (member: (typeof filteredMembers)[number]) => ReactNode }> = {
        member: { label: "Member", cell: (m) => (
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10"><AvatarImage src={m.user.image || ""} /><AvatarFallback className="bg-primary/10 text-primary font-semibold">{m.user.name?.charAt(0)}</AvatarFallback></Avatar>
                <div><p className="font-medium">{m.user.name}</p></div>
            </div>
        ) },
        email:  { label: "Email",  cell: (m) => <span className="font-mono text-sm">{m.user.email}</span> },
        role:   { label: "Role",   cell: (m) => <Badge variant={m.role === "ADMIN" ? "default" : "secondary"}>{m.role}</Badge> },
        access: { label: "Access", cell: (m) => (
            <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                {m.role === "SUPPLIER" ? <Factory className="h-3.5 w-3.5" /> : m.role === "ADMIN" || m.role === "SUPER_ADMIN" ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                <span>{getAccessLabel(m.role)}</span>
            </div>
        ) },
        status: { label: "Status", cell: (m) => getStatusBadge(m.user.isDeleted ? "INACTIVE" : "ACTIVE") },
        joined: { label: "Joined", cell: (m) => <span className="text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</span> },
    };

    const INVITE_DEF: Record<string, { label: string; cell: (invite: (typeof pendingInvites)[number]) => ReactNode }> = {
        invEmail: { label: "Email",   cell: (inv) => <span className="font-medium">{inv.email}</span> },
        role:     { label: "Role",    cell: (inv) => <Badge variant="outline">{inv.role}</Badge> },
        access:   { label: "Access",  cell: (inv) => <span className="text-muted-foreground">{getAccessLabel(inv.role)}</span> },
        status:   { label: "Status",  cell: (inv) => getStatusBadge(inv.status) },
        sent:     { label: "Sent",    cell: (inv) => <span className="text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</span> },
        expires:  { label: "Expires", cell: (inv) => <span className="text-muted-foreground">{new Date(inv.expiresAt).toLocaleDateString()}</span> },
    };

    return (
        <>
            <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border">
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
                <Card className="border-border/60 bg-card shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Team Members</p>
                                <p className="text-3xl font-bold">{stats.totalMembers}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                <UsersThree className="h-6 w-6 text-foreground" weight="duotone" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/60 bg-card shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Invites</p>
                                <p className="text-3xl font-bold">{stats.pendingInvites}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                <Clock className="h-6 w-6 text-foreground" weight="duotone" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/60 bg-card shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Projects</p>
                                <p className="text-3xl font-bold">{stats.activeProjects}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                <ChartLineUp className="h-6 w-6 text-foreground" weight="duotone" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/60 bg-card shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active POs</p>
                                <p className="text-3xl font-bold">{stats.activePOs}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-foreground" weight="duotone" />
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
                                        {memberCols.map((col) => (
                                            <TableHead key={col} draggable
                                                onDragStart={() => setMemberDragCol(col)}
                                                onDragOver={(e) => { e.preventDefault(); setMemberDragOverCol(col); }}
                                                onDragEnd={() => { reorderCols(memberCols, memberDragCol!, memberDragOverCol!, setMemberCols); setMemberDragCol(null); setMemberDragOverCol(null); }}
                                                className={["cursor-grab active:cursor-grabbing select-none", memberDragCol === col ? "opacity-40 bg-muted/60" : "", memberDragOverCol === col && memberDragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
                                            >
                                                <span className="flex items-center gap-1"><DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{MEMBER_DEF[col].label}</span>
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.map((member) => (
                                        <TableRow key={member.id}>
                                            {memberCols.map((col) => (<TableCell key={col}>{MEMBER_DEF[col].cell(member)}</TableCell>))}
                                            <TableCell className="text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedMemberForEdit({ id: member.id, name: member.user.name, email: member.user.email }); setEditedEmail(member.user.email); setIsEditEmailOpen(true); }} className="gap-1.5">
                                                        <PencilSimple className="h-3.5 w-3.5" />
                                                        Edit Email
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedMemberForDelete({ id: member.id, name: member.user.name }); setIsDeleteConfirmOpen(true); }} className="gap-1.5 text-destructive">
                                                        <Trash className="h-3.5 w-3.5" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredMembers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                                    Invitations & Access Requests
                                </CardTitle>
                                <CardDescription>
                                    {pendingInvitations.length} pending, {pendingInvites.length - pendingInvitations.length} processed.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {inviteCols.map((col) => (
                                                <TableHead key={col} draggable
                                                    onDragStart={() => setInviteDragCol(col)}
                                                    onDragOver={(e) => { e.preventDefault(); setInviteDragOverCol(col); }}
                                                    onDragEnd={() => { reorderCols(inviteCols, inviteDragCol!, inviteDragOverCol!, setInviteCols); setInviteDragCol(null); setInviteDragOverCol(null); }}
                                                    className={["cursor-grab active:cursor-grabbing select-none", inviteDragCol === col ? "opacity-40 bg-muted/60" : "", inviteDragOverCol === col && inviteDragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
                                                >
                                                    <span className="flex items-center gap-1"><DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{INVITE_DEF[col].label}</span>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingInvites.map((invite) => (
                                            <TableRow key={invite.id}>
                                                {inviteCols.map((col) => (<TableCell key={col}>{INVITE_DEF[col].cell(invite)}</TableCell>))}
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
                    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                        <Card>
                            <CardHeader>
                                <CardTitle>Invite Team Member</CardTitle>
                                <CardDescription>
                                    Send an invitation to add one member at a time.
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
                                    </div>
                                    <Button type="submit" className="w-full gap-2" disabled={isInviting}>
                                        <UserPlus className="h-4 w-4" />
                                        {isInviting ? "Sending..." : "Send Invitation"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <CardTitle>Bulk Invite via Excel</CardTitle>
                                        <CardDescription>
                                            Download template, upload file, review rows, assign roles, then send all invitations at once.
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button type="button" variant="outline" className="gap-2" onClick={downloadBulkTemplate}>
                                            <DownloadSimple className="h-4 w-4" />
                                            Download Template
                                        </Button>
                                        <Button type="button" variant="outline" className="gap-2" asChild>
                                            <label>
                                                <UploadSimple className="h-4 w-4" />
                                                Upload File
                                                <input
                                                    type="file"
                                                    accept=".xlsx,.xls,.csv"
                                                    className="hidden"
                                                    onChange={handleUploadBulkFile}
                                                />
                                            </label>
                                        </Button>
                                        <Button type="button" variant="ghost" onClick={addBulkRow}>Add Row</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-xl border border-border/60 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead className="text-right">Remove</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bulkRows.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell>
                                                        <Input
                                                            value={row.name}
                                                            onChange={(e) => updateBulkRow(row.id, { name: e.target.value })}
                                                            placeholder="Full name"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={row.email}
                                                            onChange={(e) => updateBulkRow(row.id, { email: e.target.value })}
                                                            placeholder="user@company.com"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select value={row.role} onValueChange={(value) => updateBulkRow(row.id, { role: value as BulkInviteRole })}>
                                                            <SelectTrigger className="w-[170px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="PM">Project Manager</SelectItem>
                                                                <SelectItem value="SUPPLIER">Supplier</SelectItem>
                                                                <SelectItem value="QA">Quality Assurance</SelectItem>
                                                                <SelectItem value="SITE_RECEIVER">Site Receiver</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeBulkRow(row.id)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {bulkRows.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                                        No users loaded yet. Upload a template file or add rows manually.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        {validBulkRows.length} valid email{validBulkRows.length === 1 ? "" : "s"} ready to invite out of {bulkRows.length} row{bulkRows.length === 1 ? "" : "s"}.
                                    </p>
                                    <Button
                                        type="button"
                                        className="gap-2"
                                        onClick={handleSendBulkInvites}
                                        disabled={isSendingBulk || validBulkRows.length === 0}
                                    >
                                        <PaperPlaneTilt className="h-4 w-4" />
                                        {isSendingBulk ? "Sending Invitations..." : "Send Invitations to All"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <Card className="w-full">
                        <CardHeader>
                            <CardTitle>Organization Settings</CardTitle>
                            <CardDescription>
                                Update organization details. Organization name and slug are locked.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveSettings} className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Organization Name</Label>
                                    <Input value={organization.name} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label>Organization Slug</Label>
                                    <Input value={organization.slug} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="org-contact-email">Contact Email</Label>
                                    <Input
                                        id="org-contact-email"
                                        type="email"
                                        value={orgContactEmail}
                                        onChange={(e) => setOrgContactEmail(e.target.value)}
                                        placeholder="ops@company.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="org-phone">Phone</Label>
                                    <Input
                                        id="org-phone"
                                        value={orgPhone}
                                        onChange={(e) => setOrgPhone(e.target.value)}
                                        placeholder="+971 50 123 4567"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="org-website">Website</Label>
                                    <Input
                                        id="org-website"
                                        value={orgWebsite}
                                        onChange={(e) => setOrgWebsite(e.target.value)}
                                        placeholder="https://example.com"
                                    />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="org-industry">Industry</Label>
                                        <Input
                                            id="org-industry"
                                            value={orgIndustry}
                                            onChange={(e) => setOrgIndustry(e.target.value)}
                                            placeholder="Construction"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="org-size">Organization Size</Label>
                                        <Input
                                            id="org-size"
                                            value={orgSize}
                                            onChange={(e) => setOrgSize(e.target.value)}
                                            placeholder="11-50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="org-description">Description</Label>
                                    <Input
                                        id="org-description"
                                        value={orgDescription}
                                        onChange={(e) => setOrgDescription(e.target.value)}
                                        placeholder="Brief description of your organization"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Button type="submit" disabled={isSavingSettings}>
                                    {isSavingSettings ? "Saving..." : "Save Details"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            </div>

            <Dialog open={isEditEmailOpen} onOpenChange={setIsEditEmailOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit member email</DialogTitle>
                        <DialogDescription>
                            Update the email for {selectedMemberForEdit?.name || "this member"}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="edit-member-email">Email address</Label>
                        <Input
                            id="edit-member-email"
                            type="email"
                            value={editedEmail}
                            onChange={(e) => setEditedEmail(e.target.value)}
                            placeholder="user@company.com"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditEmailOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleEditEmailSubmit} disabled={isUpdatingEmail || editedEmail.trim().length === 0}>
                            {isUpdatingEmail ? "Saving..." : "Save Email"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-destructive" />
                            Delete member
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove {selectedMemberForDelete?.name || "this member"} from your organization? This action can be reversed only by inviting them again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingMember}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void handleDeleteMemberConfirm();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeletingMember}
                        >
                            {isDeletingMember ? "Deleting..." : "Delete Member"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
