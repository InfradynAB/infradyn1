"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSupplierProfile, uploadSupplierDocument } from "@/lib/actions/compliance";
import { toast } from "sonner";
import { CircleNotchIcon, UploadIcon, CheckCircleIcon, XCircleIcon, ArrowRightIcon, ArrowLeftIcon, IdentificationCardIcon, FileArrowUpIcon, ShieldCheckIcon } from "@phosphor-icons/react";
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
    { type: "tax_id", label: "Tax Identification Number", description: "Your official tax registration certificate." },
    { type: "insurance", label: "Liability Insurance", description: "Current public liability insurance policy." },
    { type: "iso_cert", label: "ISO 9001 Certificate", description: "Quality management system certification." }
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
            toast.success("Profile updated");
            setStep(2);
            router.refresh();
        } else {
            toast.error(result.error || "Failed to update profile");
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
            toast.success("Document uploaded");
            router.refresh();
        } else {
            toast.error(result.error || "Failed to upload document");
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
        <div className="max-w-3xl mx-auto space-y-10 py-10">
            {/* Step Indicator */}
            <div className="relative flex justify-between items-center px-2">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 -z-10" />
                <div
                    className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 -z-10 transition-all duration-500 ease-in-out"
                    style={{ width: `${((step - 1) / 2) * 100}%` }}
                />

                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${step >= s ? "bg-primary border-primary text-primary-foreground shadow-lg scale-110" : "bg-background border-muted text-muted-foreground"
                            }`}
                    >
                        {step > s ? <CheckCircleIcon weight="bold" /> : <span className="text-sm font-bold">{s}</span>}
                    </div>
                ))}
            </div>

            <div className="space-y-6">
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
                            <div className="h-2 bg-blue-500" />
                            <CardHeader className="pt-8 px-8">
                                <div className="p-3 w-fit rounded-2xl bg-blue-500/10 text-blue-500 mb-4">
                                    <IdentificationCardIcon className="h-8 w-8" weight="duotone" />
                                </div>
                                <CardTitle className="text-3xl font-bold tracking-tight">Business Profile</CardTitle>
                                <CardDescription className="text-lg">Tell us about your company and the expertise you bring.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleProfileSubmit}>
                                <CardContent className="space-y-6 px-8 py-8">
                                    <div className="grid gap-3">
                                        <Label htmlFor="industry" className="text-base font-semibold">Industry / Sector</Label>
                                        <Input
                                            id="industry"
                                            name="industry"
                                            defaultValue={supplier.industry || ""}
                                            placeholder="e.g. Construction Materials, Electrical, Plumbing"
                                            className="h-12 text-base px-4 bg-muted/30 border-muted focus:border-primary transition-all rounded-xl"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="services" className="text-base font-semibold">Products & Services</Label>
                                        <Textarea
                                            id="services"
                                            name="services"
                                            defaultValue={supplier.services || ""}
                                            placeholder="Briefly list your core products or specialized services..."
                                            className="min-h-[140px] text-base px-4 py-3 bg-muted/30 border-muted focus:border-primary transition-all rounded-xl resize-none"
                                            required
                                        />
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 opacity-70">
                                            This helps project managers find you for relevant bids.
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className="px-8 pb-8 flex justify-end">
                                    <Button type="submit" disabled={isProfileSaving} className="h-12 px-8 rounded-xl font-bold text-base bg-blue-600 hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/20">
                                        {isProfileSaving ? <CircleNotchIcon className="mr-2 h-5 w-5 animate-spin" /> : "Continue to Materials"}
                                        {!isProfileSaving && <ArrowRightIcon className="ml-2 h-4 w-4" />}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
                            <div className="h-2 bg-amber-500" />
                            <CardHeader className="pt-8 px-8">
                                <div className="p-3 w-fit rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
                                    <FileArrowUpIcon className="h-8 w-8" weight="duotone" />
                                </div>
                                <CardTitle className="text-3xl font-bold tracking-tight">Compliance & Qualification</CardTitle>
                                <CardDescription className="text-lg">Upload your official credentials to verify your business status.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 px-8 py-8">
                                {REQUIRED_DOCS.map(doc => {
                                    const status = getDocStatus(doc.type);
                                    const isUploading = uploadingDoc === doc.type;

                                    return (
                                        <div key={doc.type} className={`group flex flex-col md:flex-row md:items-center justify-between p-6 border-2 rounded-2xl transition-all duration-300 ${status === "UPLOADED" ? "border-green-500/20 bg-green-500/5 shadow-inner" : "border-muted/50 hover:border-amber-500/30 bg-muted/5"
                                            }`}>
                                            <div className="space-y-1 mb-4 md:mb-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-lg">{doc.label}</span>
                                                    {status === "UPLOADED" && <CheckCircleIcon className="h-5 w-5 text-green-500 animate-in zoom-in-50" weight="fill" />}
                                                </div>
                                                <p className="text-sm text-muted-foreground max-w-sm">{doc.description}</p>
                                            </div>
                                            <div className="shrink-0">
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
                                                    variant={status === "UPLOADED" ? "secondary" : "default"}
                                                    className={`h-11 px-6 rounded-xl font-semibold transition-all shadow-sm ${status === "UPLOADED" ? "bg-white text-slate-800" : "bg-slate-900 text-white hover:bg-slate-800"
                                                        }`}
                                                    disabled={isUploading}
                                                    onClick={() => document.getElementById(`upload-${doc.type}`)?.click()}
                                                >
                                                    {isUploading ? (
                                                        <CircleNotchIcon className="h-5 w-5 animate-spin" />
                                                    ) : status === "UPLOADED" ? (
                                                        "Replace Document"
                                                    ) : (
                                                        <>
                                                            <UploadIcon className="mr-2 h-4 w-4" />
                                                            Upload PDF
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                            <CardFooter className="px-8 pb-8 flex justify-between">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep(1)}
                                    className="h-12 px-6 rounded-xl font-semibold text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                                    Back to Profile
                                </Button>
                                <Button
                                    disabled={!allDocsUploaded}
                                    onClick={() => setStep(3)}
                                    className="h-12 px-8 rounded-xl font-bold text-base bg-amber-600 hover:bg-amber-700 transition-all shadow-lg"
                                >
                                    Complete Verification
                                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in zoom-in-95 duration-700">
                        <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden text-center py-16 px-10">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500" />
                            <div className="flex justify-center mb-8">
                                <div className="h-32 w-32 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 animate-pulse">
                                    <ShieldCheckIcon className="h-20 w-20" weight="duotone" />
                                </div>
                            </div>
                            <h2 className="text-4xl font-black tracking-tight mb-4">You&apos;re All Set!</h2>
                            <p className="text-xl text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
                                Your profile is complete and your verification documents have been received. Project managers can now assign you to active projects.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Button
                                    className="h-14 px-10 rounded-2xl font-black text-lg bg-slate-900 text-white hover:bg-slate-800 shadow-xl transition-all"
                                    onClick={() => router.push("/dashboard/supplier")}
                                >
                                    Go to My Dashboard
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-14 px-10 rounded-2xl font-black text-lg border-2"
                                    onClick={() => setStep(2)}
                                >
                                    Review Documents
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            <p className="text-center text-sm text-muted-foreground opacity-50 px-8">
                By completing this onboarding, you agree to our supplier code of conduct and verification standards.
            </p>
        </div>
    );
}
