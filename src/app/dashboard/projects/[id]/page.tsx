"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    ArrowLeft,
    Building2,
    Calendar,
    DollarSign,
    MapPin,
    Pencil,
    Trash2,
    FolderOpen,
    Hash,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";

interface Project {
    id: string;
    name: string;
    code: string | null;
    budget: string | null;
    location: string | null;
    currency: string | null;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    updatedAt: string;
    organization: {
        id: string;
        name: string;
    };
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchProject = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}`);
            if (!res.ok) {
                if (res.status === 404) {
                    toast.error("Project not found");
                    router.push("/dashboard/projects");
                    return;
                }
                throw new Error("Failed to fetch project");
            }
            const data = await res.json();
            setProject(data);
        } catch (error) {
            toast.error("Failed to load project");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [projectId, router]);

    useEffect(() => {
        fetchProject();
    }, [fetchProject]);

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsUpdating(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                body: formData,
            });

            const result = await res.json();

            if (result.success) {
                toast.success("Project updated successfully");
                setEditDialogOpen(false);
                fetchProject(); // Refresh data
            } else {
                toast.error(result.error || "Failed to update project");
            }
        } catch (error) {
            toast.error("An error occurred");
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);

        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "DELETE",
            });

            const result = await res.json();

            if (result.success) {
                toast.success("Project deleted successfully");
                router.push("/dashboard/projects");
            } else {
                toast.error(result.error || "Failed to delete project");
            }
        } catch (error) {
            toast.error("An error occurred");
            console.error(error);
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
        }
    };

    if (loading) {
        return <ProjectDetailSkeleton />;
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold">Project not found</h2>
                <p className="text-muted-foreground mb-4">This project may have been deleted or you don&apos;t have access.</p>
                <Button asChild>
                    <Link href="/dashboard/projects">Back to Projects</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/projects">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">{project.name}</h1>
                        {project.code && (
                            <Badge variant="secondary" className="text-sm">
                                <Hash className="h-3 w-3 mr-1" />
                                {project.code}
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Building2 className="h-4 w-4" />
                        {project.organization.name}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                    <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Project Details */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Project Information</CardTitle>
                        <CardDescription>Basic details about this project</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Hash className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Project Code</p>
                                <p className="font-medium">{project.code || "Not assigned"}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Location</p>
                                <p className="font-medium">{project.location || "Not specified"}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Budget</p>
                                <p className="font-medium">
                                    {project.budget 
                                        ? `${project.currency || "USD"} ${Number(project.budget).toLocaleString()}`
                                        : "Not specified"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Timeline</CardTitle>
                        <CardDescription>Project dates and duration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Start Date</p>
                                <p className="font-medium">
                                    {project.startDate 
                                        ? format(new Date(project.startDate), "MMMM d, yyyy")
                                        : "Not set"}
                                </p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">End Date</p>
                                <p className="font-medium">
                                    {project.endDate 
                                        ? format(new Date(project.endDate), "MMMM d, yyyy")
                                        : "Not set"}
                                </p>
                            </div>
                        </div>
                        <Separator />
                        <div className="text-sm text-muted-foreground">
                            <p>Created: {format(new Date(project.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                            <p>Last updated: {format(new Date(project.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Navigate to project modules</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
                            <Link href={`/dashboard/procurement?project=${projectId}`}>
                                <span className="text-lg">📦</span>
                                <span>Procurement</span>
                            </Link>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
                            <Link href={`/dashboard/procurement/ncr?project=${projectId}`}>
                                <span className="text-lg">⚠️</span>
                                <span>NCRs</span>
                            </Link>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
                            <Link href={`/dashboard/suppliers?project=${projectId}`}>
                                <span className="text-lg">🏢</span>
                                <span>Suppliers</span>
                            </Link>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
                            <Link href={`/dashboard/settings?project=${projectId}`}>
                                <span className="text-lg">⚙️</span>
                                <span>Settings</span>
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>
                            Update project details. Project code cannot be changed.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Project Name</Label>
                                <Input 
                                    id="edit-name" 
                                    name="name" 
                                    defaultValue={project.name} 
                                    required 
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Project Code</Label>
                                <Input value={project.code || ""} disabled className="bg-muted" />
                                <p className="text-xs text-muted-foreground">Code cannot be changed</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-budget">Budget</Label>
                                    <Input 
                                        id="edit-budget" 
                                        name="budget" 
                                        type="number" 
                                        defaultValue={project.budget || ""} 
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-currency">Currency</Label>
                                    <Select name="currency" defaultValue={project.currency || "USD"}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Major Currencies */}
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                            <SelectItem value="EUR">EUR (€)</SelectItem>
                                            <SelectItem value="GBP">GBP (£)</SelectItem>
                                            <SelectItem value="KES">KES (Sh)</SelectItem>
                                            {/* European Currencies */}
                                            <SelectItem value="CHF">CHF (Fr) - Swiss Franc</SelectItem>
                                            <SelectItem value="SEK">SEK (kr) - Swedish Krona</SelectItem>
                                            <SelectItem value="NOK">NOK (kr) - Norwegian Krone</SelectItem>
                                            <SelectItem value="DKK">DKK (kr) - Danish Krone</SelectItem>
                                            <SelectItem value="PLN">PLN (zł) - Polish Zloty</SelectItem>
                                            <SelectItem value="CZK">CZK (Kč) - Czech Koruna</SelectItem>
                                            <SelectItem value="HUF">HUF (Ft) - Hungarian Forint</SelectItem>
                                            <SelectItem value="RON">RON (lei) - Romanian Leu</SelectItem>
                                            <SelectItem value="BGN">BGN (лв) - Bulgarian Lev</SelectItem>
                                            <SelectItem value="HRK">HRK (kn) - Croatian Kuna</SelectItem>
                                            <SelectItem value="RSD">RSD (дин) - Serbian Dinar</SelectItem>
                                            <SelectItem value="UAH">UAH (₴) - Ukrainian Hryvnia</SelectItem>
                                            <SelectItem value="ISK">ISK (kr) - Icelandic Króna</SelectItem>
                                            <SelectItem value="TRY">TRY (₺) - Turkish Lira</SelectItem>
                                            <SelectItem value="RUB">RUB (₽) - Russian Ruble</SelectItem>
                                            <SelectItem value="GEL">GEL (₾) - Georgian Lari</SelectItem>
                                            <SelectItem value="AMD">AMD (֏) - Armenian Dram</SelectItem>
                                            <SelectItem value="AZN">AZN (₼) - Azerbaijani Manat</SelectItem>
                                            <SelectItem value="MDL">MDL (L) - Moldovan Leu</SelectItem>
                                            <SelectItem value="ALL">ALL (L) - Albanian Lek</SelectItem>
                                            <SelectItem value="MKD">MKD (ден) - Macedonian Denar</SelectItem>
                                            <SelectItem value="BAM">BAM (KM) - Bosnia Mark</SelectItem>
                                            <SelectItem value="BYN">BYN (Br) - Belarusian Ruble</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-location">Location</Label>
                                <LocationAutocomplete 
                                    name="location" 
                                    defaultValue={project.location || ""} 
                                    placeholder="Search city or address..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-startDate">Start Date</Label>
                                    <Input 
                                        id="edit-startDate" 
                                        name="startDate" 
                                        type="date"
                                        defaultValue={project.startDate ? project.startDate.split("T")[0] : ""}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-endDate">End Date</Label>
                                    <Input 
                                        id="edit-endDate" 
                                        name="endDate" 
                                        type="date"
                                        defaultValue={project.endDate ? project.endDate.split("T")[0] : ""}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone.
                            All associated data including purchase orders, NCRs, and documents will be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete Project
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function ProjectDetailSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1">
                    <Skeleton className="h-8 w-[250px] mb-2" />
                    <Skeleton className="h-4 w-[150px]" />
                </div>
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-[150px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i}>
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-[150px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i}>
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
