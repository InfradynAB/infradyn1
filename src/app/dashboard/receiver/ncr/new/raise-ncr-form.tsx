"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ShieldWarning, Warning } from "@phosphor-icons/react";
import { raiseReceiverNCR } from "@/lib/actions/receiver-actions";
import { cn } from "@/lib/utils";

interface PO {
    id: string;
    poNumber: string;
    supplierName: string;
}

interface BOQItem {
    id: string;
    description: string;
    itemNumber: string;
}

interface RaiseNCRFormProps {
    pos: PO[];
    boqItemsByPO: Record<string, BOQItem[]>;
}

const ISSUE_TYPES = [
    { value: "DAMAGED", label: "Damaged Material" },
    { value: "WRONG_SPEC", label: "Wrong Specification" },
    { value: "DOC_MISSING", label: "Documents Missing" },
    { value: "QUANTITY_SHORT", label: "Quantity Short" },
    { value: "QUALITY_DEFECT", label: "Quality Defect" },
    { value: "OTHER", label: "Other" },
];

const SEVERITY_OPTIONS = [
    { value: "MINOR", label: "Minor", desc: "Low impact, no schedule risk" },
    { value: "MAJOR", label: "Major", desc: "Project impact, correction needed" },
    { value: "CRITICAL", label: "Critical", desc: "Work stopped, urgent escalation" },
];

export function RaiseNCRForm({ pos, boqItemsByPO }: RaiseNCRFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectedPO, setSelectedPO] = useState<string>("");
    const [selectedBoqItem, setSelectedBoqItem] = useState<string>("");
    const [severity, setSeverity] = useState<string>("MINOR");
    const [issueType, setIssueType] = useState<string>("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const currentBoqItems = selectedPO ? (boqItemsByPO[selectedPO] ?? []) : [];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedPO || !title || !severity || !issueType) {
            toast.error("Please fill in all required fields.");
            return;
        }

        const formData = new FormData();
        formData.set("purchaseOrderId", selectedPO);
        formData.set("title", title);
        formData.set("description", description);
        formData.set("severity", severity);
        formData.set("issueType", issueType);
        if (selectedBoqItem) formData.set("affectedBoqItemId", selectedBoqItem);

        startTransition(async () => {
            const result = await raiseReceiverNCR(formData);
            if (result.success) {
                toast.success("NCR raised successfully. The quality team has been notified.");
                router.push("/dashboard/receiver/ncr");
            } else {
                toast.error(result.error || "Failed to raise NCR");
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* PO Selection */}
            <Card>
                <CardContent className="py-5 space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Delivery Reference
                    </h2>

                    <div className="space-y-2">
                        <Label htmlFor="po">Purchase Order *</Label>
                        <Select
                            value={selectedPO}
                            onValueChange={(v) => {
                                setSelectedPO(v);
                                setSelectedBoqItem("");
                            }}
                        >
                            <SelectTrigger id="po">
                                <SelectValue placeholder="Select a PO…" />
                            </SelectTrigger>
                            <SelectContent>
                                {pos.map((po) => (
                                    <SelectItem key={po.id} value={po.id}>
                                        {po.poNumber} — {po.supplierName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {currentBoqItems.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="boqItem">Affected Material Item (optional)</Label>
                            <Select value={selectedBoqItem} onValueChange={setSelectedBoqItem}>
                                <SelectTrigger id="boqItem">
                                    <SelectValue placeholder="Select item…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {currentBoqItems.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            #{item.itemNumber} — {item.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Severity */}
            <Card>
                <CardContent className="py-5 space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Severity *
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {SEVERITY_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setSeverity(opt.value)}
                                className={cn(
                                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                                    severity === opt.value
                                        ? opt.value === "CRITICAL"
                                            ? "border-red-500 bg-red-500/10 ring-1 ring-red-500"
                                            : opt.value === "MAJOR"
                                            ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                                            : "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500"
                                        : "border-border hover:border-border/80 hover:bg-muted/40"
                                )}
                            >
                                <span className={cn("text-sm font-semibold",
                                    severity === opt.value
                                        ? opt.value === "CRITICAL" ? "text-red-600" : opt.value === "MAJOR" ? "text-amber-600" : "text-cyan-600"
                                        : "text-foreground"
                                )}>
                                    {opt.label}
                                </span>
                                <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Issue Details */}
            <Card>
                <CardContent className="py-5 space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Issue Details
                    </h2>

                    <div className="space-y-2">
                        <Label htmlFor="issueType">Issue Type *</Label>
                        <Select value={issueType} onValueChange={setIssueType}>
                            <SelectTrigger id="issueType">
                                <SelectValue placeholder="Select issue type…" />
                            </SelectTrigger>
                            <SelectContent>
                                {ISSUE_TYPES.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">NCR Title *</Label>
                        <Input
                            id="title"
                            placeholder="Brief description of the issue…"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Full Description</Label>
                        <Textarea
                            id="description"
                            rows={4}
                            placeholder="Describe the non-conformance in detail — what was expected, what was found, quantity affected, batch / serial numbers if known…"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Warning banner */}
            {severity === "CRITICAL" && (
                <Card className="border-red-500/20 bg-red-500/5">
                    <CardContent className="py-3 flex items-center gap-3">
                        <Warning className="h-5 w-5 text-red-500 shrink-0" weight="fill" />
                        <p className="text-sm text-red-700 dark:text-red-400">
                            Critical NCR will immediately notify the Project Manager and QA team.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Button type="submit" disabled={isPending} className="bg-cyan-600 hover:bg-cyan-700">
                    {isPending ? "Raising NCR…" : (
                        <>
                            <ShieldWarning className="mr-2 h-4 w-4" />
                            Raise NCR
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
