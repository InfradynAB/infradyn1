"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { getUserOrganizations, updateOrganization } from "@/lib/actions/organization";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CircleNotchIcon, BuildingsIcon } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";

type Organization = {
    id: string;
    name: string;
    slug: string;
    retentionPolicyDays: number;
    logo?: string | null;
    contactEmail?: string | null;
};

function OrgEditForm({ org }: { org: Organization }) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        const result = await updateOrganization(formData);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Organization updated successfully!");
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <input type="hidden" name="orgId" value={org.id} />
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor={`name-${org.id}`}>Organization Name</Label>
                    <Input id={`name-${org.id}`} name="name" defaultValue={org.name} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`slug-${org.id}`}>Slug (URL Identifier)</Label>
                    <Input id={`slug-${org.id}`} name="slug" defaultValue={org.slug} required />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor={`contactEmail-${org.id}`}>Contact Email (for notifications)</Label>
                <Input
                    id={`contactEmail-${org.id}`}
                    name="contactEmail"
                    type="email"
                    defaultValue={org.contactEmail || ""}
                    placeholder="pm@yourcompany.com"
                />
                <p className="text-xs text-muted-foreground">
                    Invoice approval requests and other notifications will be sent to this email.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor={`retention-${org.id}`}>Data Retention Policy (Days)</Label>
                <div className="flex items-center gap-2">
                    <Input
                        id={`retention-${org.id}`}
                        name="retentionPolicyDays"
                        type="number"
                        defaultValue={org.retentionPolicyDays || 365}
                        min="30"
                        max="3650"
                        className="w-[120px]"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    Number of days to retain project data after completion.
                </p>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </form>
    );
}

export default function OrganizationSettingsPage() {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        getUserOrganizations().then((data) => {
            if (mounted) {
                // Cast to match Organization type if needed, or rely on inference
                // The actual DB type might differ slightly so we cast safely
                setOrgs(data as unknown as Organization[]);
                setLoading(false);
            }
        });
        return () => { mounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="max-w-4xl space-y-6">
                <div>
                    <h3 className="text-2xl font-bold">Organization Settings</h3>
                    <p className="text-muted-foreground">Manage your organization details.</p>
                </div>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-[200px]" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (orgs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/50">
                <BuildingsIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold">No Organizations</h3>
                <p className="text-muted-foreground">You are not a member of any organization.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h3 className="text-2xl font-bold">Organization Settings</h3>
                <p className="text-muted-foreground">Manage your organization details and policies.</p>
            </div>

            <div className="grid gap-6">
                {orgs.map((org) => (
                    <Card key={org.id}>
                        <CardHeader>
                            <CardTitle>{org.name}</CardTitle>
                            <CardDescription>ID: {org.id}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OrgEditForm org={org} />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
