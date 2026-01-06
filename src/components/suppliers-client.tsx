"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TruckIcon, MagnifyingGlassIcon, SealCheckIcon, ArrowsClockwiseIcon, DotsThreeIcon, EyeIcon, TrashIcon, UsersThreeIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import Link from "next/link";
import { deleteSupplier, inviteSelectedSuppliers } from "@/lib/actions/supplier";

interface Supplier {
    id: string;
    name: string;
    contactEmail: string | null;
    taxId: string | null;
    status: string | null;
    readinessScore: string | number | null;
}

interface SuppliersClientProps {
    suppliers: Supplier[];
}

const ITEMS_PER_PAGE = 10;

export function SuppliersClient({ suppliers }: SuppliersClientProps) {
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [isInviting, setIsInviting] = useState(false);

    // Filter suppliers by search
    const filtered = useMemo(() => {
        if (!search.trim()) return suppliers;
        const q = search.toLowerCase();
        return suppliers.filter(
            s => s.name.toLowerCase().includes(q) ||
                (s.contactEmail && s.contactEmail.toLowerCase().includes(q))
        );
    }, [suppliers, search]);

    // Pagination
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
    }, [filtered, currentPage]);

    // Selection helpers - only count pending suppliers
    const pendingOnPage = paginated.filter(s => s.status === 'INACTIVE' && s.contactEmail);
    const allPendingSelected = pendingOnPage.length > 0 && pendingOnPage.every(s => selectedIds.has(s.id));
    const someSelected = selectedIds.size > 0;

    const toggleAll = () => {
        if (allPendingSelected) {
            setSelectedIds(new Set());
        } else {
            // Only select pending suppliers with emails
            setSelectedIds(new Set(pendingOnPage.map(s => s.id)));
        }
    };

    const toggleOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    // Get pending suppliers that can be invited
    const pendingSelected = Array.from(selectedIds).filter(id => {
        const s = suppliers.find(sup => sup.id === id);
        return s && s.status === 'INACTIVE' && s.contactEmail;
    });

    // Actions
    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete supplier "${name}"?`)) return;
        const result = await deleteSupplier(id);
        if (result.success) {
            toast.success("Supplier deleted");
        } else {
            toast.error(result.error || "Failed to delete");
        }
    };

    const handleInviteSelected = async () => {
        if (pendingSelected.length === 0) {
            toast.error("No pending suppliers selected");
            return;
        }
        setIsInviting(true);
        const result = await inviteSelectedSuppliers(pendingSelected);
        if (result.success) {
            toast.success(`Invited ${result.invited} supplier(s)`);
            setSelectedIds(new Set());
        } else {
            toast.error(result.error || "Failed to invite");
        }
        setIsInviting(false);
    };

    // Empty state
    if (suppliers.length === 0) {
        return (
            <Card className="border-dashed bg-muted/30 py-20">
                <div className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                        <TruckIcon className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Registry is Empty</h3>
                    <p className="text-muted-foreground max-w-sm">
                        You haven&apos;t added any suppliers yet.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search + Actions Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search suppliers..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        className="pl-9"
                    />
                </div>
                {someSelected && (
                    <Button
                        onClick={handleInviteSelected}
                        disabled={isInviting || pendingSelected.length === 0}
                        className="gap-2"
                    >
                        <UsersThreeIcon className="h-4 w-4" />
                        Invite Selected ({pendingSelected.length})
                    </Button>
                )}
            </div>

            {/* Table */}
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-12 py-5">
                                <Checkbox
                                    checked={allPendingSelected}
                                    onCheckedChange={toggleAll}
                                    disabled={pendingOnPage.length === 0}
                                    aria-label="Select all pending"
                                />
                            </TableHead>
                            <TableHead className="py-5 font-bold text-foreground">Supplier Identity</TableHead>
                            <TableHead className="py-5 font-bold text-foreground">Contact</TableHead>
                            <TableHead className="py-5 font-bold text-foreground">Readiness</TableHead>
                            <TableHead className="py-5 font-bold text-foreground">Status</TableHead>
                            <TableHead className="py-5 font-bold text-foreground text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((s) => {
                            const readiness = Number(s.readinessScore) || 0;
                            const isVerified = readiness === 100;
                            const isInvited = s.status === 'INVITED';
                            const canBeSelected = s.status === 'INACTIVE' && s.contactEmail;

                            return (
                                <TableRow key={s.id} className={`group transition-colors border-muted/40 ${canBeSelected ? 'hover:bg-muted/30' : 'bg-muted/5 opacity-75'}`}>
                                    <TableCell className="py-4">
                                        <Checkbox
                                            checked={selectedIds.has(s.id)}
                                            onCheckedChange={() => toggleOne(s.id)}
                                            disabled={!canBeSelected}
                                            aria-label={`Select ${s.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${isVerified ? 'bg-green-500/10 text-green-600' : isInvited ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/5 text-primary'}`}>
                                                {s.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-base leading-none mb-1">{s.name}</div>
                                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">
                                                    Tax ID: {s.taxId || "Not set"}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-medium">{s.contactEmail || <span className="text-muted-foreground italic">No email</span>}</div>
                                    </TableCell>
                                    <TableCell className="w-[180px]">
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                <span>Score</span>
                                                <span>{readiness}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${isVerified ? 'bg-green-500' : 'bg-primary'}`}
                                                    style={{ width: `${readiness}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {isVerified ? (
                                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200/50 flex items-center gap-1.5 px-3 py-1 text-xs font-bold ring-1 ring-green-500/20">
                                                <SealCheckIcon className="h-3.5 w-3.5" weight="fill" />
                                                Verified
                                            </Badge>
                                        ) : isInvited ? (
                                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200/50 flex items-center gap-1.5 px-3 py-1 text-xs font-bold">
                                                <SealCheckIcon className="h-3.5 w-3.5" />
                                                Invited
                                            </Badge>
                                        ) : s.contactEmail ? (
                                            <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-200/50 flex items-center gap-1.5 px-3 py-1 text-xs font-bold">
                                                <ArrowsClockwiseIcon className="h-3.5 w-3.5" />
                                                Pending
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-gray-500/5 text-gray-500 border-gray-200/50 flex items-center gap-1.5 px-3 py-1 text-xs font-bold">
                                                No Email
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right py-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <DotsThreeIcon className="h-5 w-5" weight="bold" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/suppliers/${s.id}`} className="flex items-center gap-2">
                                                        <EyeIcon className="h-4 w-4" />
                                                        View Details
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(s.id, s.name)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <TrashIcon className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <CaretLeftIcon className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-2">
                            {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <CaretRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
