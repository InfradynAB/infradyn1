"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    PlusIcon,
    TrashIcon,
    PencilSimpleIcon,
    CheckIcon,
    XIcon,
    FileArrowUpIcon,
    SpinnerIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export interface MilestoneData {
    id?: string;
    title: string;
    description?: string;
    expectedDate?: string;
    paymentPercentage: number;
    sequenceOrder: number;
}

interface MilestoneManagerProps {
    milestones: MilestoneData[];
    onChange: (milestones: MilestoneData[]) => void;
    totalValue?: number;
    currency?: string;
}

const DEFAULT_MILESTONES: Partial<MilestoneData>[] = [
    { title: "Engineering", paymentPercentage: 20 },
    { title: "Fabrication", paymentPercentage: 30 },
    { title: "Delivery", paymentPercentage: 30 },
    { title: "Site Acceptance", paymentPercentage: 20 },
];

export function MilestoneManager({
    milestones,
    onChange,
    totalValue = 0,
    currency = "USD",
}: MilestoneManagerProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<MilestoneData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    const totalPercentage = milestones.reduce(
        (sum, m) => sum + (m.paymentPercentage || 0),
        0
    );

    // Handle file import
    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            // Upload file first
            const presignRes = await fetch("/api/upload/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || "application/octet-stream",
                    docType: "milestone",
                }),
            });

            if (!presignRes.ok) throw new Error("Failed to get upload URL");
            const { uploadUrl, fileUrl } = await presignRes.json();

            await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
            });

            // Extract milestones
            const extractRes = await fetch("/api/milestones/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileUrl }),
            });

            const result = await extractRes.json();

            if (result.success && result.milestones?.length > 0) {
                const newMilestones: MilestoneData[] = result.milestones.map((m: any, i: number) => ({
                    title: m.title || m.name || "",
                    description: m.description || "",
                    expectedDate: m.expectedDate || "",
                    paymentPercentage: m.paymentPercentage || 0,
                    sequenceOrder: milestones.length + i,
                }));
                onChange([...milestones, ...newMilestones]);
                toast.success(`Imported ${newMilestones.length} milestones`);
            } else {
                toast.error(result.error || "No milestones found in file");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to import milestones from file");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const addMilestone = () => {
        const newMilestone: MilestoneData = {
            title: "",
            paymentPercentage: 0,
            sequenceOrder: milestones.length,
        };
        onChange([...milestones, newMilestone]);
        setEditingIndex(milestones.length);
        setEditForm(newMilestone);
    };

    const applyDefaultMilestones = () => {
        const defaults = DEFAULT_MILESTONES.map((m, i) => ({
            ...m,
            sequenceOrder: i,
        })) as MilestoneData[];
        onChange(defaults);
    };

    const removeMilestone = (index: number) => {
        const updated = milestones.filter((_, i) => i !== index);
        onChange(
            updated.map((m, i) => ({ ...m, sequenceOrder: i }))
        );
    };

    const startEdit = (index: number) => {
        setEditingIndex(index);
        setEditForm({ ...milestones[index] });
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditForm(null);
        // Remove empty new milestone
        if (milestones[milestones.length - 1]?.title === "") {
            onChange(milestones.slice(0, -1));
        }
    };

    const saveEdit = () => {
        if (editingIndex === null || !editForm) return;

        const currentTotalOther = milestones.reduce((sum, m, i) => i === editingIndex ? sum : sum + m.paymentPercentage, 0);
        const newTotal = currentTotalOther + editForm.paymentPercentage;

        if (newTotal > 100) {
            toast.error(`Total percentage cannot exceed 100%. Currently at ${newTotal}%`, {
                description: "Manual adjustment required to balance."
            });
            return;
        }

        const updated = [...milestones];
        updated[editingIndex] = editForm;

        // Auto-balance logic for remaining milestones
        if (newTotal < 100 && editingIndex < milestones.length - 1) {
            const remainingTarget = 100 - newTotal;
            const subsequentMilestones = updated.slice(editingIndex + 1);
            const currentSubsequentTotal = subsequentMilestones.reduce((sum, m) => sum + m.paymentPercentage, 0);

            if (currentSubsequentTotal > 0) {
                // Pro-rata distribution
                const factor = remainingTarget / currentSubsequentTotal;
                for (let i = editingIndex + 1; i < updated.length; i++) {
                    updated[i].paymentPercentage = Math.round((updated[i].paymentPercentage * factor) * 100) / 100;
                }
            } else {
                // If subsequent are 0, just dump it in the next one
                updated[editingIndex + 1].paymentPercentage = remainingTarget;
            }
        }

        onChange(updated);
        setEditingIndex(null);
        setEditForm(null);
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Payment Milestones</CardTitle>
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.pdf"
                            onChange={handleFileImport}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                        >
                            {isImporting ? (
                                <SpinnerIcon className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <FileArrowUpIcon className="h-4 w-4 mr-1" />
                            )}
                            Import
                        </Button>
                        {milestones.length === 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={applyDefaultMilestones}
                            >
                                Apply Defaults
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addMilestone}
                        >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add Milestone
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No milestones defined. Add milestones or apply defaults.
                    </p>
                ) : (
                    <>
                        {milestones.map((milestone, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                            >
                                <span className="text-sm font-medium text-muted-foreground w-6">
                                    {index + 1}.
                                </span>

                                {editingIndex === index && editForm ? (
                                    <div className="flex-1 grid grid-cols-12 gap-2">
                                        <div className="col-span-4">
                                            <Input
                                                placeholder="Title"
                                                value={editForm.title}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        title: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <Input
                                                type="date"
                                                value={editForm.expectedDate || ""}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        expectedDate: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <div className="flex items-center">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={editForm.paymentPercentage}
                                                    onChange={(e) =>
                                                        setEditForm({
                                                            ...editForm,
                                                            paymentPercentage:
                                                                Number(e.target.value) || 0,
                                                        })
                                                    }
                                                    className="pr-6"
                                                />
                                                <span className="ml-[-24px] text-muted-foreground">
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-3 flex gap-1">
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={saveEdit}
                                            >
                                                <CheckIcon className="h-4 w-4 text-green-600" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={cancelEdit}
                                            >
                                                <XIcon className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1">
                                            <p className="font-medium">
                                                {milestone.title || "Untitled"}
                                            </p>
                                            {milestone.expectedDate && (
                                                <p className="text-xs text-muted-foreground">
                                                    Due:{" "}
                                                    {new Date(
                                                        milestone.expectedDate
                                                    ).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-medium">
                                                {milestone.paymentPercentage}%
                                            </p>
                                            {totalValue > 0 && (
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    {currency}{" "}
                                                    {(
                                                        ((totalValue ?? 0) *
                                                            (milestone.paymentPercentage ?? 0)) /
                                                        100
                                                    ).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => startEdit(index)}
                                            >
                                                <PencilSimpleIcon className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => removeMilestone(index)}
                                            >
                                                <TrashIcon className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {/* Total */}
                        <div className="pt-4 border-t space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Budget Allocation</p>
                                    <div
                                        className={`text-lg font-black ${totalPercentage === 100
                                            ? "text-green-600"
                                            : totalPercentage > 100
                                                ? "text-destructive"
                                                : "text-amber-600"
                                            }`}
                                    >
                                        Total: {totalPercentage}%
                                        {totalPercentage !== 100 && (
                                            <span className="ml-2 text-[10px] font-bold uppercase tracking-tighter">
                                                (Must equal 100%)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {totalValue > 0 && (
                                    <div className="text-right">
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Projected Spend</p>
                                        <p className="text-lg font-black">{currency} {totalValue.toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                            <Progress
                                value={totalPercentage}
                                className={`h-2 rounded-full bg-muted shadow-inner ${totalPercentage > 100 ? "bg-red-100" : ""}`}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                style={{ "--progress-foreground": totalPercentage === 100 ? "#10b981" : totalPercentage > 100 ? "#ef4444" : "#f59e0b" } as any}
                            />
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
