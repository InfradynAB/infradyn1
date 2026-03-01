"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSupplierProfile, uploadSupplierDocument } from "@/lib/actions/compliance";
import { toast } from "sonner";
import {
    CircleNotchIcon,
    UploadIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    FileArrowUpIcon,
    ShieldCheckIcon,
    BuildingsIcon,
    SealCheckIcon,
    EnvelopeSimpleIcon
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

interface SupplierData {
    id: string;
    industry: string | null;
    services: string | null;
    documents: Array<{
        documentType: string;
        fileUrl: string;
        status: string | null;
    }>;
}

const REQUIRED_DOCS = [
    { type: "tax_id", label: "Tax Identification", description: "Tax Certificate and/or Company Registration Certificate." },
    { type: "insurance", label: "Liability Insurance", description: "Current public liability and professional indemnity." },
    { type: "iso_cert", label: "Quality Certification", description: "ISO Certification or relevant industry standard." }
];

export function OnboardingForm({ supplier }: { supplier: SupplierData }) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

    async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsProfileSaving(true);

        const formData = new FormData(event.currentTarget);
        const result = await updateSupplierProfile(formData);

        if (result.success) {
            toast.success("Identity profile established");
            setStep(2);
            router.refresh();
        } else {
            toast.error(result.error || "Profile update failed");
        }
        setIsProfileSaving(false);
    }

    async function handleFileUpload(type: string, file: File) {
        setUploadingDoc(type);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", type);

        const result = await uploadSupplierDocument(formData);

        if (result.success) {
            toast.success("Credential synchronization successful");
            router.refresh();
        } else {
            toast.error(result.error || "Synchronization failure");
        }
        setUploadingDoc(null);
    }

    const getDocStatus = (type: string) => {
        const doc = supplier.documents.find(d => d.documentType === type);
        if (!doc) return "MISSING";
        return "UPLOADED";
    };

    const allDocsUploaded = REQUIRED_DOCS.every(doc => getDocStatus(doc.type) === "UPLOADED");

    return (
        <div className="space-y-6">
            {/* Step Indicator - Compact */}
            <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/30 rounded-full border border-muted/50">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${step >= s
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                    }`}
                            >
                                {step > s ? <SealCheckIcon weight="fill" className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">{s}</span>}
                            </div>
                            {s < 3 && (
                                <div className={`w-8 h-0.5 mx-1 rounded-full transition-all ${step > s ? "bg-primary" : "bg-muted"}`} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Step {step} of 3: {step === 1 ? "Organization Identity" : step === 2 ? "Credential Ledger" : "Verification Complete"}
                </div>
            </div>

            <div className="transition-all duration-500 ease-in-out">
                {step === 1 && (
                    <div>
                        <Card>
                            <CardHeader>
                                <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary mb-2">
                                    <BuildingsIcon className="h-5 w-5" weight="duotone" />
                                </div>
                                <CardTitle>Business Identity</CardTitle>
                                <CardDescription>
                                    Establish your presence in the Infradyn supply chain.
                                </CardDescription>
                            </CardHeader>
                            <form onSubmit={handleProfileSubmit}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="industry">Industry Sector Focus</Label>
                                        <Input
                                            id="industry"
                                            name="industry"
                                            defaultValue={supplier.industry || ""}
                                            placeholder="e.g. Civil Engineering, HVAC Systems"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="services">Capability Statement</Label>
                                        <Textarea
                                            id="services"
                                            name="services"
                                            defaultValue={supplier.services || ""}
                                            placeholder="Synthesize your core products and specialization in 2-3 sentences..."
                                            className="min-h-[100px] resize-none"
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <ShieldCheckIcon className="h-3 w-3" />
                                            Used for Project Matching Analytics
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end">
                                    <Button type="submit" disabled={isProfileSaving}>
                                        {isProfileSaving ? (
                                            <>
                                                <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                Continue
                                                <ArrowRightIcon className="ml-2 h-4 w-4" weight="bold" />
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <Card>
                            <CardHeader>
                                <div className="p-2 w-fit rounded-lg bg-amber-500/10 text-amber-600 mb-2">
                                    <FileArrowUpIcon className="h-5 w-5" weight="duotone" />
                                </div>
                                <CardTitle>Credential Vault</CardTitle>
                                <CardDescription>
                                    Securely upload your compliance documentation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {REQUIRED_DOCS.map(doc => {
                                    const status = getDocStatus(doc.type);
                                    const isUploading = uploadingDoc === doc.type;

                                    return (
                                        <div key={doc.type} className={`flex items-center justify-between p-3 border rounded-lg transition-all ${status === "UPLOADED"
                                            ? "border-green-500/30 bg-green-500/5"
                                            : "border-muted hover:border-primary/30"
                                            }`}>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">{doc.label}</span>
                                                    {status === "UPLOADED" && (
                                                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none text-xs px-1.5 py-0">
                                                            <CheckCircleIcon className="h-3 w-3" weight="fill" />
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{doc.description}</p>
                                            </div>
                                            <div>
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
                                                    variant={status === "UPLOADED" ? "outline" : "default"}
                                                    size="sm"
                                                    disabled={isUploading}
                                                    onClick={() => document.getElementById(`upload-${doc.type}`)?.click()}
                                                >
                                                    {isUploading ? (
                                                        <CircleNotchIcon className="h-4 w-4 animate-spin" />
                                                    ) : status === "UPLOADED" ? (
                                                        "Update"
                                                    ) : (
                                                        <>
                                                            <UploadIcon className="mr-1.5 h-3.5 w-3.5" weight="bold" />
                                                            Upload
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                            <CardFooter className="flex justify-between gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep(1)}
                                >
                                    <ArrowLeftIcon className="mr-2 h-4 w-4" weight="bold" />
                                    Back
                                </Button>
                                <Button
                                    disabled={!allDocsUploaded}
                                    onClick={() => setStep(3)}
                                >
                                    Continue
                                    <ArrowRightIcon className="ml-2 h-4 w-4" weight="bold" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <Card className="text-center">
                            <CardHeader className="pt-8">
                                <div className="flex justify-center mb-4">
                                    <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                                        <ShieldCheckIcon className="h-8 w-8" weight="duotone" />
                                    </div>
                                </div>
                                <CardTitle className="text-xl">Synchronization Complete</CardTitle>
                                <CardDescription className="max-w-sm mx-auto">
                                    Your organization is now queued for Project Manager audit. Once verified, you will receive full access to project tenders.
                                </CardDescription>
                            </CardHeader>
                            <CardFooter className="flex flex-col gap-2 pb-6">
                                <Button
                                    className="w-full"
                                    onClick={() => router.push("/dashboard/supplier")}
                                >
                                    Go to Dashboard
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full text-muted-foreground"
                                    onClick={() => setStep(2)}
                                >
                                    Review Documents
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </div>

            <div className="flex justify-center gap-4 opacity-40">
                <div className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wider">
                    <ShieldCheckIcon className="h-3 w-3" />
                    AES-256 Encrypted
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wider">
                    <CheckCircleIcon className="h-3 w-3" />
                    GDPR Compliant
                </div>
            </div>
        </div>
    );
}
