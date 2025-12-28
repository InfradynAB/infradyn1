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
    Buildings,
    MagnifyingGlass,
    ArrowLeft,
    Users,
    Briefcase,
    Globe,
    Phone,
    EnvelopeSimple,
    DotsThree,
} from "@phosphor-icons/react/dist/ssr";
import { CreateOrganizationDialog } from "@/components/admin/create-organization-dialog";
import { listOrganizations } from "@/lib/actions/admin-actions";
import { formatDistanceToNow } from "date-fns";

export default async function OrganizationsPage() {
    const result = await listOrganizations();
    const organizations = result.success ? result.data : [];

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
                    <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
                    <p className="text-muted-foreground">Manage all organizations on the platform</p>
                </div>
                <CreateOrganizationDialog />
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10">
                                <Buildings className="h-6 w-6 text-blue-600" weight="duotone" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{organizations?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Total Organizations</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-500/10">
                                <Users className="h-6 w-6 text-green-600" weight="duotone" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">
                                    {organizations?.reduce((sum, org) => sum + (org.memberCount || 0), 0) || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Total Members</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-purple-500/10">
                                <Briefcase className="h-6 w-6 text-purple-600" weight="duotone" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">
                                    {organizations?.reduce((sum, org) => sum + (org.projectCount || 0), 0) || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Total Projects</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>All Organizations</CardTitle>
                    <div className="relative w-72">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search organizations..." className="pl-10" />
                    </div>
                </CardHeader>
                <CardContent>
                    {organizations && organizations.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Industry</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead className="text-center">Members</TableHead>
                                    <TableHead className="text-center">Projects</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Contact</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organizations.map((org) => (
                                    <TableRow key={org.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                                    <Buildings className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{org.name}</p>
                                                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{org.industry || "—"}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800">
                                                {org.size || "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="font-semibold">{org.memberCount || 0}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="font-semibold">{org.projectCount || 0}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(new Date(org.createdAt), { addSuffix: true })}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {org.website && (
                                                    <a href={org.website} target="_blank" rel="noopener noreferrer">
                                                        <Globe className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                    </a>
                                                )}
                                                {org.contactEmail && (
                                                    <a href={`mailto:${org.contactEmail}`}>
                                                        <EnvelopeSimple className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                    </a>
                                                )}
                                                {org.phone && (
                                                    <a href={`tel:${org.phone}`}>
                                                        <Phone className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                    </a>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <DotsThree className="h-4 w-4" weight="bold" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Buildings className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No organizations yet</p>
                            <p className="text-sm">Create your first organization to get started</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
