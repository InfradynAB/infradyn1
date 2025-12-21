"use client";

import { useState } from "react";
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
} from "@phosphor-icons/react/dist/ssr";

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

    const totalPercentage = milestones.reduce(
        (sum, m) => sum + (m.paymentPercentage || 0),
        0
    );

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
        const updated = [...milestones];
        updated[editingIndex] = editForm;
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
                        <div className="flex justify-end pt-2 border-t">
                            <div
                                className={`text-sm font-medium ${totalPercentage === 100
                                        ? "text-green-600"
                                        : totalPercentage > 100
                                            ? "text-destructive"
                                            : "text-amber-600"
                                    }`}
                            >
                                Total: {totalPercentage}%
                                {totalPercentage !== 100 && (
                                    <span className="ml-2 text-xs">
                                        (should equal 100%)
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
