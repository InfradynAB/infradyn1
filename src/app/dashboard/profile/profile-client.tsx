"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    User,
    Envelope,
    Buildings,
    Shield,
    PencilSimple,
    Check,
    X,
    Calendar,
} from "@phosphor-icons/react/dist/ssr";

interface ProfileClientProps {
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
        role: string;
        createdAt: Date;
    };
    organization?: {
        id: string;
        name: string;
    } | null;
}

export function ProfileClient({ user, organization }: ProfileClientProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user.name);
    const [isSaving, setIsSaving] = useState(false);

    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });

            if (!response.ok) throw new Error("Failed to update");

            toast.success("Profile updated");
            setIsEditing(false);
            router.refresh();
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
                <p className="text-sm text-muted-foreground">Manage your account</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Profile Card - Left */}
                <Card className="md:col-span-1">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                            <Avatar className="h-20 w-20 mb-3">
                                <AvatarImage src={user.image || undefined} alt={user.name} />
                                <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <h2 className="font-semibold text-lg">{user.name}</h2>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <Badge variant="secondary" className="mt-2">{user.role}</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Details Card - Right */}
                <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Name */}
                        <div className="flex items-center justify-between py-2 border-b">
                            <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Name</p>
                                    {isEditing ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="h-8 w-48"
                                            />
                                            <Button size="sm" className="h-8 px-2" onClick={handleSave} disabled={isSaving}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setName(user.name); setIsEditing(false); }}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="font-medium">{user.name}</p>
                                    )}
                                </div>
                            </div>
                            {!isEditing && (
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                                    <PencilSimple className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {/* Email */}
                        <div className="flex items-center justify-between py-2 border-b">
                            <div className="flex items-center gap-3">
                                <Envelope className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="font-medium">{user.email}</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200">Verified</Badge>
                        </div>

                        {/* Role */}
                        <div className="flex items-center gap-3 py-2 border-b">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Role</p>
                                <p className="font-medium">{user.role}</p>
                            </div>
                        </div>

                        {/* Organization */}
                        {organization && (
                            <div className="flex items-center justify-between py-2 border-b">
                                <div className="flex items-center gap-3">
                                    <Buildings className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Organization</p>
                                        <p className="font-medium">{organization.name}</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="/dashboard/settings/organization">Manage</a>
                                </Button>
                            </div>
                        )}

                        {/* Member Since */}
                        <div className="flex items-center gap-3 py-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Member Since</p>
                                <p className="font-medium">
                                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
