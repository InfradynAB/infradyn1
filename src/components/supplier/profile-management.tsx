"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSupplierProfile, uploadSupplierDocument } from "@/lib/actions/compliance";
import { toast } from "sonner";
import {
    CircleNotchIcon,
    UploadIcon,
    CheckCircleIcon,
    PencilSimpleIcon,
    BuildingsIcon,
    FileTextIcon,
    ShieldCheckIcon,
    UserIcon,
    EnvelopeSimpleIcon,
    FloppyDiskIcon
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

interface SupplierData {
    id: string;
    name: string | null;

    industry: string | null;
    services: string | null;
    readinessScore: string | null;
    documents: Array<{
        id: string;
        documentType: string;
        fileUrl: string;
        status: string | null;
    }>;
}

interface ProfileManagementProps {
    supplier: SupplierData;
    userName: string;
    userEmail: string;
}

const DOCS_CONFIG = [
    { type: "tax_id", label: "Tax Identification", icon: FileTextIcon },
    { type: "insurance", label: "Liability Insurance", icon: ShieldCheckIcon },
    { type: "iso_cert", label: "Quality Certification", icon: CheckCircleIcon }
];

export function ProfileManagement({ supplier, userName, userEmail }: ProfileManagementProps) {
    const router = useRouter();
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

    async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSaving(true);
        const formData = new FormData(event.currentTarget);
        const result = await updateSupplierProfile(formData);

        if (result.success) {
            toast.success("Profile updated successfully");
            setIsEditingProfile(false);
            router.refresh();
        } else {
            toast.error(result.error || "Failed to update profile");
        }
        setIsSaving(false);
    }

    async function handleFileUpload(type: string, file: File) {
        setUploadingDoc(type);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", type);

        const result = await uploadSupplierDocument(formData);
        if (result.success) {
            toast.success("Document updated successfully");
            router.refresh();
        } else {
            toast.error(result.error || "Upload failed");
        }
        setUploadingDoc(null);
    }

    const getDocStatus = (type: string) => {
        return supplier.documents.find(d => d.documentType === type) ? "UPLOADED" : "MISSING";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b pb-4">
                <h1 className="text-2xl font-bold">Profile & Compliance</h1>
                <p className="text-sm text-muted-foreground">Manage your organization details and compliance documents</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column - Account & Business Info */}
                <div className="space-y-4">
                    {/* Account Info */}
                    <Card className="border shadow-sm">
                        <CardHeader className="py-3 px-4 border-b">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-muted-foreground" weight="fill" />
                                Account
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 py-3 space-y-2">
                            <div className="flex items-center justify-between py-1.5 border-b border-dashed border-muted">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Name</span>
                                <span className="text-xs font-medium">{userName}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-dashed border-muted">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Email</span>
                                <span className="text-xs font-medium truncate max-w-[160px]">{userEmail}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
                                <Badge className="bg-green-100 text-green-700 text-[10px] font-medium">Verified</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Business Profile */}
                    <Card className="border shadow-sm">
                        <CardHeader className="py-3 px-4 border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <BuildingsIcon className="h-4 w-4 text-muted-foreground" weight="fill" />
                                    Business Profile
                                </CardTitle>
                                {!isEditingProfile && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => setIsEditingProfile(true)}
                                    >
                                        <PencilSimpleIcon className="h-3 w-3 mr-1" />
                                        Edit
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 py-3">
                            {isEditingProfile ? (
                                <form onSubmit={handleProfileSubmit} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="industry" className="text-xs">Industry</Label>
                                        <Input
                                            id="industry"
                                            name="industry"
                                            defaultValue={supplier.industry || ""}
                                            className="h-8 text-xs"
                                            placeholder="e.g. Civil Engineering"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="services" className="text-xs">Capabilities</Label>
                                        <Textarea
                                            id="services"
                                            name="services"
                                            defaultValue={supplier.services || ""}
                                            className="min-h-[80px] text-xs resize-none"
                                            placeholder="Describe your core services..."
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => setIsEditingProfile(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="h-7 text-xs"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <CircleNotchIcon className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <FloppyDiskIcon className="h-3 w-3 mr-1" />
                                                    Save
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-2">
                                    <div className="py-1.5 border-b border-dashed border-muted">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Industry</p>
                                        <p className="text-xs font-medium">{supplier.industry || "Not specified"}</p>
                                    </div>
                                    <div className="py-1.5">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Capabilities</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{supplier.services || "Not specified"}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Documents */}
                <div className="lg:col-span-2">
                    <Card className="border shadow-sm">
                        <CardHeader className="py-3 px-4 border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <FileTextIcon className="h-4 w-4 text-muted-foreground" weight="fill" />
                                    Compliance Documents
                                </CardTitle>
                                <Badge className="bg-green-100 text-green-700 text-[10px] font-medium">
                                    {supplier.documents.length}/{DOCS_CONFIG.length} Complete
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-muted/20">
                                {DOCS_CONFIG.map(doc => {
                                    const status = getDocStatus(doc.type);
                                    const isUploading = uploadingDoc === doc.type;
                                    const Icon = doc.icon;

                                    return (
                                        <div key={doc.type} className="flex items-center justify-between px-4 py-3 hover:bg-muted/5 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${status === "UPLOADED"
                                                    ? "bg-green-100 text-green-600"
                                                    : "bg-muted text-muted-foreground"
                                                    }`}>
                                                    <Icon className="h-4 w-4" weight="fill" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium">{doc.label}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {status === "UPLOADED" ? "Uploaded" : "Required"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {status === "UPLOADED" && (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-none">
                                                        <CheckCircleIcon className="h-3 w-3" weight="fill" />
                                                    </Badge>
                                                )}
                                                <input
                                                    type="file"
                                                    id={`upload-${doc.type}`}
                                                    className="hidden"
                                                    accept=".pdf,.jpg,.png"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleFileUpload(doc.type, file);
                                                    }}
                                                    disabled={isUploading}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    disabled={isUploading}
                                                    onClick={() => document.getElementById(`upload-${doc.type}`)?.click()}
                                                >
                                                    {isUploading ? (
                                                        <CircleNotchIcon className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <UploadIcon className="h-3 w-3 mr-1" />
                                                            {status === "UPLOADED" ? "Replace" : "Upload"}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
