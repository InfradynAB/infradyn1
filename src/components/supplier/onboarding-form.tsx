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
    { type: "tax_id", label: "Tax Identification", description: "Official tax registration and KRA compliance." },
    { type: "insurance", label: "Liability Insurance", description: "Current public liability and professional indemnity." },
    { type: "iso_cert", label: "Quality Certification", description: "ISO 9001 or relevant industry standards." }
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
        <div className="max-w-4xl mx-auto space-y-12 py-10 px-4">
            {/* Step Indicator - Premium Style */}
            <div className="flex flex-col items-center space-y-4">
                <div className="relative flex items-center gap-4 px-6 py-2 bg-muted/30 rounded-full border border-muted/50 backdrop-blur-sm">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${step >= s
                                    ? "bg-slate-900 text-white shadow-lg"
                                    : "bg-white/50 text-muted-foreground"
                                    }`}
                            >
                                {step > s ? <SealCheckIcon weight="fill" className="h-5 w-5" /> : <span className="text-xs font-black">{s}</span>}
                            </div>
                            {s < 3 && (
                                <div className={`w-12 h-1 mx-2 rounded-full transition-all duration-700 ${step > s ? "bg-slate-900" : "bg-muted/50"}`} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Step {step} of 3: {step === 1 ? "Organization Identity" : step === 2 ? "Credential Ledger" : "Verification Complete"}
                </div>
            </div>

            <div className="transition-all duration-500 ease-in-out">
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] bg-card/60 backdrop-blur-xl overflow-hidden ring-1 ring-white/20">
                            <div className="h-2 bg-blue-600" />
                            <CardHeader className="pt-10 px-10">
                                <div className="p-4 w-fit rounded-2xl bg-blue-500/10 text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                    <BuildingsIcon className="h-10 w-10" weight="duotone" />
                                </div>
                                <CardTitle className="text-4xl font-black tracking-tighter">Business Identity</CardTitle>
                                <CardDescription className="text-xl font-medium leading-relaxed opacity-80">
                                    Establish your presence in the Infradyn supply chain.
                                </CardDescription>
                            </CardHeader>
                            <form onSubmit={handleProfileSubmit}>
                                <CardContent className="space-y-8 px-10 py-10">
                                    <div className="grid gap-4">
                                        <Label htmlFor="industry" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Industry Sector focus</Label>
                                        <Input
                                            id="industry"
                                            name="industry"
                                            defaultValue={supplier.industry || ""}
                                            placeholder="e.g. Civil Engineering, HVAC Systems"
                                            className="h-16 text-xl p-6 bg-muted/20 border-muted/50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all rounded-3xl font-bold"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-4">
                                        <Label htmlFor="services" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Capability Statement</Label>
                                        <Textarea
                                            id="services"
                                            name="services"
                                            defaultValue={supplier.services || ""}
                                            placeholder="Synthesize your core products and specialization in 2-3 sentences..."
                                            className="min-h-[180px] text-xl p-6 bg-muted/20 border-muted/50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all rounded-3xl font-medium resize-none leading-relaxed"
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground font-black uppercase tracking-wider flex items-center gap-2 opacity-60">
                                            <ShieldCheckIcon className="h-4 w-4" />
                                            Used for Project Matching Analytics
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className="px-10 pb-10 flex justify-end">
                                    <Button type="submit" disabled={isProfileSaving} className="h-16 px-12 rounded-2xl font-black text-lg bg-slate-900 hover:bg-slate-800 transition-all shadow-2xl hover:scale-[1.02] active:scale-[0.98]">
                                        {isProfileSaving ? (
                                            <>
                                                <CircleNotchIcon className="mr-3 h-6 w-6 animate-spin" />
                                                Persisting...
                                            </>
                                        ) : (
                                            <>
                                                Initialize Profiles
                                                <ArrowRightIcon className="ml-3 h-5 w-5" weight="bold" />
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                        <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] bg-card/60 backdrop-blur-xl overflow-hidden ring-1 ring-white/20">
                            <div className="h-2 bg-amber-500" />
                            <CardHeader className="pt-10 px-10">
                                <div className="p-4 w-fit rounded-2xl bg-amber-500/10 text-amber-600 mb-6">
                                    <FileArrowUpIcon className="h-10 w-10" weight="duotone" />
                                </div>
                                <CardTitle className="text-4xl font-black tracking-tighter">Credential Vault</CardTitle>
                                <CardDescription className="text-xl font-medium leading-relaxed opacity-80">
                                    Securely synchronize your compliance documentation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 px-10 py-10">
                                {REQUIRED_DOCS.map(doc => {
                                    const status = getDocStatus(doc.type);
                                    const isUploading = uploadingDoc === doc.type;

                                    return (
                                        <div key={doc.type} className={`group flex items-center justify-between p-8 border-2 rounded-3xl transition-all duration-500 ${status === "UPLOADED"
                                            ? "border-green-500/20 bg-green-500/5 shadow-inner"
                                            : "border-muted/50 hover:border-amber-500/30 bg-muted/5"
                                            }`}>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-2xl tracking-tighter">{doc.label}</span>
                                                    {status === "UPLOADED" && (
                                                        <Badge className="bg-green-500 text-white border-none px-2 py-0 animate-in zoom-in-50">
                                                            <CheckCircleIcon className="h-4 w-4" weight="fill" />
                                                        </Badge>

                                                    )}
                                                </div>
                                                <p className="text-base font-medium text-muted-foreground max-w-sm">{doc.description}</p>
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
                                                    variant={status === "UPLOADED" ? "secondary" : "default"}
                                                    className={`h-14 px-8 rounded-2xl font-black transition-all ${status === "UPLOADED"
                                                        ? "bg-white/80 hover:bg-white text-slate-900 border border-slate-200"
                                                        : "bg-slate-900 text-white hover:bg-slate-800"
                                                        }`}
                                                    disabled={isUploading}
                                                    onClick={() => document.getElementById(`upload-${doc.type}`)?.click()}
                                                >
                                                    {isUploading ? (
                                                        <CircleNotchIcon className="h-6 w-6 animate-spin" />
                                                    ) : status === "UPLOADED" ? (
                                                        "Update Entry"
                                                    ) : (
                                                        <>
                                                            <UploadIcon className="mr-3 h-5 w-5" weight="bold" />
                                                            Upload PDF
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                            <CardFooter className="px-10 pb-10 flex justify-between gap-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep(1)}
                                    className="h-16 px-8 rounded-2xl font-black text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                >
                                    <ArrowLeftIcon className="mr-3 h-5 w-5" weight="bold" />
                                    Prior Step
                                </Button>
                                <Button
                                    disabled={!allDocsUploaded}
                                    onClick={() => setStep(3)}
                                    className="h-16 px-12 rounded-2xl font-black text-lg bg-slate-900 hover:bg-slate-800 transition-all shadow-2xl disabled:opacity-30"
                                >
                                    Final Verification
                                    <ArrowRightIcon className="ml-3 h-5 w-5" weight="bold" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in zoom-in-95 duration-1000">
                        <Card className="border-none shadow-[0_48px_96px_-12px_rgba(0,0,0,0.15)] bg-card/60 backdrop-blur-xl overflow-hidden text-center py-20 px-12 ring-2 ring-green-500/10">
                            <div className="absolute top-0 left-0 w-full h-3 bg-blue-600" />
                            <div className="flex justify-center mb-10">
                                <div className="h-40 w-40 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 animate-pulse ring-1 ring-green-500/20">
                                    <ShieldCheckIcon className="h-24 w-24" weight="duotone" />
                                </div>
                            </div>
                            <h2 className="text-5xl font-black tracking-tighter mb-6">Synchronization Complete</h2>
                            <p className="text-2xl font-medium text-muted-foreground max-w-2xl mx-auto mb-14 leading-relaxed opacity-80">
                                Your organization is now queued for Project Manager audit. Once verified, you will receive full access to project tenders and material tracking.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-6">
                                <Button
                                    className="h-20 px-14 rounded-3xl font-black text-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transition-all hover:scale-[1.05] active:scale-[0.98]"
                                    onClick={() => router.push("/dashboard/supplier")}
                                >
                                    Access Terminal
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-20 px-14 rounded-3xl font-black text-2xl border-2 hover:bg-muted/30"
                                    onClick={() => setStep(2)}
                                >
                                    Audit Vault
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            <div className="flex justify-center gap-8 opacity-40 px-8">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheckIcon className="h-4 w-4" />
                    AES-256 Encrypted
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <CheckCircleIcon className="h-4 w-4" />
                    GDPR Compliant
                </div>
            </div>
        </div>
    );
}
