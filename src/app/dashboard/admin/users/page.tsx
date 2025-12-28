import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    User,
    Users,
    MagnifyingGlass,
    ArrowLeft,
    Buildings,
    ShieldCheck,
    Package,
    EnvelopeSimple,
} from "@phosphor-icons/react/dist/ssr";
import { InvitePMDialog } from "@/components/admin/invite-pm-dialog";
import { listAllUsers } from "@/lib/actions/admin-actions";
import { formatDistanceToNow } from "date-fns";

const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
    PM: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    SUPPLIER: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    QA: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
    SITE_RECEIVER: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400",
};

const roleIcons: Record<string, React.ReactNode> = {
    ADMIN: <ShieldCheck className="h-4 w-4" />,
    PM: <Buildings className="h-4 w-4" />,
    SUPPLIER: <Package className="h-4 w-4" />,
    QA: <User className="h-4 w-4" />,
    SITE_RECEIVER: <User className="h-4 w-4" />,
};

export default async function UsersPage() {
    const result = await listAllUsers();
    const users = result.success ? result.data : [];

    const adminCount = users?.filter(u => u.role === "ADMIN").length || 0;
    const pmCount = users?.filter(u => u.role === "PM").length || 0;
    const supplierCount = users?.filter(u => u.role === "SUPPLIER").length || 0;

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin">
                    <Button variant="ghost" size="icon" className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">Users</h1>
                    <p className="text-muted-foreground">Manage all users on the platform</p>
                </div>
                <InvitePMDialog />
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10">
                                <Users className="h-6 w-6 text-blue-600" weight="duotone" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{users?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-purple-500/10">
                                <ShieldCheck className="h-6 w-6 text-purple-600" weight="duotone" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{adminCount}</p>
                                <p className="text-sm text-muted-foreground">Admins</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-500/10">
                                <Buildings className="h-6 w-6 text-green-600" weight="duotone" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{pmCount}</p>
                                <p className="text-sm text-muted-foreground">Project Managers</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-amber-500/10">
                                <Package className="h-6 w-6 text-amber-600" weight="duotone" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{supplierCount}</p>
                                <p className="text-sm text-muted-foreground">Suppliers</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>All Users</CardTitle>
                    <div className="relative w-72">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search users..." className="pl-10" />
                    </div>
                </CardHeader>
                <CardContent>
                    {users && users.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Verified</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                                    {user.image ? (
                                                        <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <User className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[user.role || "PM"]}`}>
                                                {roleIcons[user.role || "PM"]}
                                                {user.role || "PM"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">
                                                {user.organization?.name || "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {user.emailVerified ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                                    <ShieldCheck className="h-4 w-4" weight="fill" />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Pending</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <a href={`mailto:${user.email}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <EnvelopeSimple className="h-4 w-4" />
                                                </Button>
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No users yet</p>
                            <p className="text-sm">Invite users to get started</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
