"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeftIcon,
    UploadSimpleIcon,
    SpinnerIcon,
    CheckCircleIcon,
    WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

// Form schema - uses coerce for HTML form inputs
const formSchema = z.object({
    projectId: z.string().uuid("Please select a project"),
    supplierId: z.string().uuid("Please select a supplier"),
    poNumber: z.string().min(1, "PO number is required"),
    totalValue: z.coerce.number().positive("Value must be positive"),
    currency: z.string().default("USD"),
    fileUrl: z.string().url().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Currencies
const currencies = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "KES", label: "KES - Kenyan Shilling" },
    { value: "AED", label: "AED - UAE Dirham" },
];

interface ProjectOption {
    id: string;
    name: string;
}

interface SupplierOption {
    id: string;
    name: string;
}

export default function NewPurchaseOrderPage({
    projects,
    suppliers,
}: {
    projects: ProjectOption[];
    suppliers: SupplierOption[];
}) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<
        "idle" | "uploading" | "done" | "error"
    >("idle");

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            currency: "USD",
        },
    });

    // Mock file upload handler (replace with real UploadThing integration)
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadProgress("uploading");

        // TODO: Replace with actual UploadThing upload
        // Simulating upload delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Mock URL - in production this comes from UploadThing
        const mockUrl = `https://utfs.io/f/${crypto.randomUUID()}.pdf`;
        setFileUrl(mockUrl);
        setUploadProgress("done");
    };

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const result = await createPurchaseOrder({
                ...data,
                fileUrl: fileUrl || undefined,
            });

            if (result.success) {
                router.push("/dashboard/procurement");
                router.refresh();
            } else {
                setSubmitError(result.error);
            }
        } catch (error) {
            setSubmitError("An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/procurement">
                        <ArrowLeftIcon className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        New Purchase Order
                    </h1>
                    <p className="text-muted-foreground">
                        Upload and register a new PO
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* File Upload Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Document</CardTitle>
                        <CardDescription>
                            Upload the PO document (PDF)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                            {uploadProgress === "idle" && (
                                <>
                                    <UploadSimpleIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Drag & drop or click to upload
                                    </p>
                                    <Input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="max-w-xs mx-auto"
                                    />
                                </>
                            )}
                            {uploadProgress === "uploading" && (
                                <div className="flex flex-col items-center gap-2">
                                    <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm">Uploading...</p>
                                </div>
                            )}
                            {uploadProgress === "done" && (
                                <div className="flex flex-col items-center gap-2 text-green-600">
                                    <CheckCircleIcon
                                        weight="fill"
                                        className="h-8 w-8"
                                    />
                                    <p className="text-sm font-medium">
                                        Upload complete
                                    </p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setFileUrl(null);
                                            setUploadProgress("idle");
                                        }}
                                    >
                                        Replace file
                                    </Button>
                                </div>
                            )}
                            {uploadProgress === "error" && (
                                <div className="flex flex-col items-center gap-2 text-destructive">
                                    <WarningCircleIcon
                                        weight="fill"
                                        className="h-8 w-8"
                                    />
                                    <p className="text-sm font-medium">
                                        Upload failed
                                    </p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setUploadProgress("idle")}
                                    >
                                        Try again
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Metadata Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">PO Details</CardTitle>
                        <CardDescription>
                            Enter the purchase order information
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* PO Number */}
                        <div className="space-y-2">
                            <Label htmlFor="poNumber">PO Number *</Label>
                            <Input
                                id="poNumber"
                                placeholder="e.g. PO-2024-001"
                                {...register("poNumber")}
                            />
                            {errors.poNumber && (
                                <p className="text-sm text-destructive">
                                    {errors.poNumber.message}
                                </p>
                            )}
                        </div>

                        {/* Project Select */}
                        <div className="space-y-2">
                            <Label>Project *</Label>
                            <Select
                                onValueChange={(v) => setValue("projectId", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.projectId && (
                                <p className="text-sm text-destructive">
                                    {errors.projectId.message}
                                </p>
                            )}
                        </div>

                        {/* Supplier Select */}
                        <div className="space-y-2">
                            <Label>Supplier *</Label>
                            <Select
                                onValueChange={(v) => setValue("supplierId", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.supplierId && (
                                <p className="text-sm text-destructive">
                                    {errors.supplierId.message}
                                </p>
                            )}
                        </div>

                        {/* Value & Currency */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="totalValue">Total Value *</Label>
                                <Input
                                    id="totalValue"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...register("totalValue")}
                                />
                                {errors.totalValue && (
                                    <p className="text-sm text-destructive">
                                        {errors.totalValue.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select
                                    defaultValue="USD"
                                    onValueChange={(v) => setValue("currency", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((c) => (
                                            <SelectItem
                                                key={c.value}
                                                value={c.value}
                                            >
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Submit Error */}
                {submitError && (
                    <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                        {submitError}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/procurement">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Purchase Order"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
