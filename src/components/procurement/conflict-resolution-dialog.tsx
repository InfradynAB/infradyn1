"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    WarningCircle,
    CheckCircle,
    ArrowRight,
    Calculator,
    PencilSimple,
} from "@phosphor-icons/react";

export interface ConflictDetails {
    id: string;
    type: "critical" | "warning" | "info";
    title: string;
    description: string;
    currentValue?: string | number;
    expectedValue?: string | number;
    step?: string;
    fixType?: "navigate" | "edit_value" | "auto_fix" | "info_only";
    fixLabel?: string;
    field?: string;
}

interface ConflictResolutionDialogProps {
    conflict: ConflictDetails | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNavigateToStep?: (step: string) => void;
    onUpdateValue?: (field: string, value: string | number) => void;
    onAutoFix?: (conflictId: string) => void;
}

export function ConflictResolutionDialog({
    conflict,
    open,
    onOpenChange,
    onNavigateToStep,
    onUpdateValue,
    onAutoFix,
}: ConflictResolutionDialogProps) {
    const [editValue, setEditValue] = useState<string>("");

    if (!conflict) return null;

    const handleNavigate = () => {
        if (conflict.step && onNavigateToStep) {
            onNavigateToStep(conflict.step);
            onOpenChange(false);
        }
    };

    const handleUpdateValue = () => {
        if (conflict.field && onUpdateValue) {
            const numValue = parseFloat(editValue);
            onUpdateValue(conflict.field, isNaN(numValue) ? editValue : numValue);
            onOpenChange(false);
        }
    };

    const handleAutoFix = () => {
        if (onAutoFix) {
            onAutoFix(conflict.id);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        {conflict.type === "critical" ? (
                            <div className="p-2 rounded-full bg-red-100">
                                <WarningCircle className="h-6 w-6 text-red-600" weight="fill" />
                            </div>
                        ) : conflict.type === "warning" ? (
                            <div className="p-2 rounded-full bg-amber-100">
                                <WarningCircle className="h-6 w-6 text-amber-600" weight="fill" />
                            </div>
                        ) : (
                            <div className="p-2 rounded-full bg-blue-100">
                                <CheckCircle className="h-6 w-6 text-blue-600" weight="fill" />
                            </div>
                        )}
                        <div>
                            <DialogTitle className="text-lg">{conflict.title}</DialogTitle>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${conflict.type === "critical" ? "bg-red-100 text-red-700" :
                                    conflict.type === "warning" ? "bg-amber-100 text-amber-700" :
                                        "bg-blue-100 text-blue-700"
                                }`}>
                                {conflict.type}
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <DialogDescription className="text-sm text-foreground">
                        {conflict.description}
                    </DialogDescription>

                    {/* Show value comparison if available */}
                    {(conflict.currentValue !== undefined || conflict.expectedValue !== undefined) && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Current Value:</span>
                                <span className="font-mono font-bold text-red-600">
                                    {typeof conflict.currentValue === "number"
                                        ? conflict.currentValue.toLocaleString()
                                        : conflict.currentValue ?? "Not set"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Expected Value:</span>
                                <span className="font-mono font-bold text-green-600">
                                    {typeof conflict.expectedValue === "number"
                                        ? conflict.expectedValue.toLocaleString()
                                        : conflict.expectedValue ?? "Not set"}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Quick fix options based on conflict type */}
                    {conflict.fixType === "edit_value" && conflict.field && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Quick Fix: Update Value</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder={`Enter new ${conflict.field}`}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="flex-1"
                                />
                                <Button onClick={handleUpdateValue} size="sm">
                                    <PencilSimple className="h-4 w-4 mr-1" />
                                    Update
                                </Button>
                            </div>
                        </div>
                    )}

                    {conflict.fixType === "auto_fix" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-800 flex items-center gap-2">
                                <Calculator className="h-4 w-4" />
                                <span className="font-medium">Auto-fix available!</span>
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                                {conflict.fixLabel || "We can automatically correct this value for you."}
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>

                    {conflict.fixType === "navigate" && conflict.step && (
                        <Button onClick={handleNavigate}>
                            Go to {conflict.step === "details" ? "PO Details" :
                                conflict.step === "boq" ? "BOQ & ROS" :
                                    conflict.step === "milestones" ? "Milestones" :
                                        conflict.step}
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}

                    {conflict.fixType === "auto_fix" && (
                        <Button onClick={handleAutoFix} className="bg-green-600 hover:bg-green-700">
                            <Calculator className="h-4 w-4 mr-1" />
                            Apply Auto-Fix
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
