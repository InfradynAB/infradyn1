"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    type Icon,
    Wrench,
    Receipt,
    LockSimple,
    Bug,
    Database,
    Lightbulb,
    Question,
    DotsThree,
    Warning,
    ArrowLeft,
    Paperclip,
    X,
    Image as ImageIcon,
    ArrowRight,
} from "@phosphor-icons/react";
import { createSupportTicket } from "@/lib/actions/support-actions";
import { cn } from "@/lib/utils";

type TicketCategory =
    | "TECHNICAL"
    | "BILLING"
    | "ACCESS_ISSUE"
    | "BUG_REPORT"
    | "DATA_ISSUE"
    | "FEATURE_REQUEST"
    | "GENERAL"
    | "OTHER";

type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface CategoryOption {
    value: TicketCategory;
    label: string;
    description: string;
    icon: Icon;
    iconBg: string;
    iconColor: string;
}

const CATEGORIES: CategoryOption[] = [
    {
        value: "TECHNICAL",
        label: "Technical Issue",
        description: "Platform errors, crashes, or unexpected behaviour",
        icon: Wrench,
        iconBg: "bg-blue-500/10 border-blue-500/20",
        iconColor: "text-blue-500",
    },
    {
        value: "ACCESS_ISSUE",
        label: "Access / Permissions",
        description: "Can't log in, role not working, missing features",
        icon: LockSimple,
        iconBg: "bg-amber-500/10 border-amber-500/20",
        iconColor: "text-amber-600",
    },
    {
        value: "BUG_REPORT",
        label: "Bug Report",
        description: "Found something that doesn't work correctly",
        icon: Bug,
        iconBg: "bg-red-500/10 border-red-500/20",
        iconColor: "text-red-500",
    },
    {
        value: "DATA_ISSUE",
        label: "Data Issue",
        description: "Incorrect data, missing records, sync problems",
        icon: Database,
        iconBg: "bg-purple-500/10 border-purple-500/20",
        iconColor: "text-purple-600",
    },
    {
        value: "FEATURE_REQUEST",
        label: "Feature Request",
        description: "Suggest a new feature or improvement",
        icon: Lightbulb,
        iconBg: "bg-emerald-500/10 border-emerald-500/20",
        iconColor: "text-emerald-600",
    },
    {
        value: "BILLING",
        label: "Billing",
        description: "Invoices, subscriptions, or payment questions",
        icon: Receipt,
        iconBg: "bg-cyan-500/10 border-cyan-500/20",
        iconColor: "text-cyan-600",
    },
    {
        value: "GENERAL",
        label: "General Enquiry",
        description: "Any question that doesn't fit another category",
        icon: Question,
        iconBg: "bg-muted border-border",
        iconColor: "text-muted-foreground",
    },
    {
        value: "OTHER",
        label: "Other",
        description: "Something else entirely",
        icon: DotsThree,
        iconBg: "bg-muted border-border",
        iconColor: "text-muted-foreground",
    },
];

const PRIORITIES: { value: TicketPriority; label: string; description: string; cls: string }[] = [
    { value: "LOW", label: "Low", description: "Not urgent, when convenient", cls: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 data-[selected=true]:border-emerald-500 data-[selected=true]:bg-emerald-500/10" },
    { value: "MEDIUM", label: "Medium", description: "Standard turnaround", cls: "border-amber-500/30 bg-amber-500/5 text-amber-700 data-[selected=true]:border-amber-500 data-[selected=true]:bg-amber-500/10" },
    { value: "HIGH", label: "High", description: "Blocking my work", cls: "border-orange-500/30 bg-orange-500/5 text-orange-700 data-[selected=true]:border-orange-500 data-[selected=true]:bg-orange-500/10" },
    { value: "URGENT", label: "Urgent", description: "Critical — system down", cls: "border-red-500/30 bg-red-500/5 text-red-700 data-[selected=true]:border-red-500 data-[selected=true]:bg-red-500/10" },
];

type Step = 1 | 2;

export function NewTicketForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Step state
    const [step, setStep] = useState<Step>(1);

    // Form state
    const [category, setCategory] = useState<TicketCategory | "">("");
    const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");

    // File upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "application/pdf"];
        if (!allowed.includes(file.type)) {
            toast.error("Only images (PNG, JPG, GIF, WebP) and PDFs are allowed.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File must be under 10 MB.");
            return;
        }
        setSelectedFile(file);
        setUploadedFileUrl(null);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        try {
            const res = await fetch("/api/support/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName: selectedFile.name, contentType: selectedFile.type }),
            });
            const data = await res.json();
            if (!data.uploadUrl) throw new Error("Failed to get upload URL");

            await fetch(data.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": selectedFile.type },
                body: selectedFile,
            });

            setUploadedFileUrl(data.fileUrl);
            toast.success("Screenshot uploaded.");
        } catch {
            toast.error("Upload failed. You can still submit without the attachment.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = () => {
        if (!category || !subject.trim() || !description.trim()) {
            toast.error("Please fill in all required fields.");
            return;
        }

        startTransition(async () => {
            const fd = new FormData();
            fd.set("category", category);
            fd.set("priority", priority);
            fd.set("subject", subject);
            fd.set("description", description);
            if (uploadedFileUrl && selectedFile) {
                fd.set("attachmentUrl", uploadedFileUrl);
                fd.set("attachmentName", selectedFile.name);
                fd.set("attachmentType", selectedFile.type);
            }

            const result = await createSupportTicket(fd);
            if (result.success) {
                toast.success("Ticket raised! Check your email for confirmation.");
                router.push(result.ticketId ? `/dashboard/support/${result.ticketId}` : "/dashboard/support");
            } else {
                toast.error(result.error ?? "Failed to create ticket.");
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Step 1 — Category */}
            {step === 1 && (
                <>
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <h2 className="text-base font-semibold mb-1">What type of issue is this?</h2>
                                <p className="text-sm text-muted-foreground">
                                    Choose the category that best describes your request.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                {CATEGORIES.map((cat) => {
                                    const isSelected = category === cat.value;
                                    return (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            onClick={() => setCategory(cat.value)}
                                            className={cn(
                                                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all hover:border-border w-full",
                                                isSelected
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                                    : "border-border/70 bg-background"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                                                    cat.iconBg
                                                )}
                                            >
                                                <cat.icon className={cn("h-4 w-4", cat.iconColor)} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold">{cat.label}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                    {cat.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Priority */}
                    <Card>
                        <CardContent className="p-6 space-y-3">
                            <div>
                                <h2 className="text-base font-semibold mb-1">How urgent is this?</h2>
                                <p className="text-sm text-muted-foreground">
                                    Select the priority level that reflects the impact.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {PRIORITIES.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        data-selected={priority === p.value}
                                        onClick={() => setPriority(p.value)}
                                        className={cn(
                                            "rounded-xl border p-3 text-left transition-all",
                                            priority === p.value
                                                ? p.cls.split(" ").filter(c => c.includes("data-[selected")).map(c => c.replace("data-[selected=true]:", "")).join(" ") + " " + p.cls.split(" ").filter(c => !c.includes("data-[selected")).join(" ")
                                                : "border-border/70 bg-background hover:border-border"
                                        )}
                                    >
                                        <p className="text-sm font-semibold">{p.label}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                                    </button>
                                ))}
                            </div>
                            {priority === "URGENT" && (
                                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                                    <Warning className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-red-600">
                                        Urgent tickets are escalated immediately. Please reserve this for genuine emergencies.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between">
                        <Button variant="ghost" asChild>
                            <a href="/dashboard/support">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </a>
                        </Button>
                        <Button
                            onClick={() => setStep(2)}
                            disabled={!category}
                            className="bg-primary hover:bg-primary/90"
                        >
                            Continue <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </>
            )}

            {/* Step 2 — Details */}
            {step === 2 && (
                <>
                    <Card>
                        <CardContent className="p-6 space-y-5">
                            <div>
                                <h2 className="text-base font-semibold mb-1">Describe your issue</h2>
                                <p className="text-sm text-muted-foreground">
                                    The more detail you provide, the faster we can help.
                                </p>
                            </div>

                            {/* Subject */}
                            <div className="space-y-1.5">
                                <Label htmlFor="subject" className="text-sm font-medium">
                                    Subject <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="subject"
                                    placeholder="Brief summary of your issue…"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    maxLength={120}
                                    className="h-10"
                                />
                                <p className="text-xs text-muted-foreground text-right">{subject.length}/120</p>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-sm font-medium">
                                    Description <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Please describe the issue in detail. Include steps to reproduce if it's a bug, what you expected to happen, and what actually happened…"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={7}
                                    className="resize-none"
                                />
                            </div>

                            {/* Screenshot / Attachment */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Screenshot or Attachment{" "}
                                    <span className="text-muted-foreground font-normal">(optional)</span>
                                </Label>
                                <div
                                    className={cn(
                                        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
                                        selectedFile
                                            ? "border-primary/40 bg-primary/5"
                                            : "border-border hover:border-border/80 hover:bg-muted/30"
                                    )}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {selectedFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-2 rounded-lg bg-background border border-border p-2.5 pr-3">
                                                <ImageIcon className="h-5 w-5 text-primary shrink-0" />
                                                <span className="text-sm font-medium truncate max-w-[200px]">
                                                    {selectedFile.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedFile(null);
                                                        setUploadedFileUrl(null);
                                                    }}
                                                    className="ml-1 rounded p-0.5 hover:bg-muted"
                                                >
                                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                                </button>
                                            </div>
                                            {!uploadedFileUrl && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpload();
                                                    }}
                                                    disabled={isUploading}
                                                    className="text-xs"
                                                >
                                                    {isUploading ? "Uploading…" : "Upload Screenshot"}
                                                </Button>
                                            )}
                                            {uploadedFileUrl && (
                                                <p className="text-xs text-emerald-600 font-medium">
                                                    ✓ Screenshot uploaded
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <Paperclip className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                            <p className="text-sm text-muted-foreground">
                                                Click to attach a screenshot or file
                                            </p>
                                            <p className="text-xs text-muted-foreground/60 mt-1">
                                                PNG, JPG, GIF, WebP, PDF — max 10 MB
                                            </p>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary chip */}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 font-medium">
                            {CATEGORIES.find((c) => c.value === category)?.label}
                        </span>
                        <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 font-medium">
                            {priority} priority
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={() => setStep(1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isPending || !subject.trim() || !description.trim()}
                            className="bg-primary hover:bg-primary/90 min-w-[140px]"
                        >
                            {isPending ? "Submitting…" : "Submit Ticket"}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
