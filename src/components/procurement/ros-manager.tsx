"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    WarningCircleIcon,
    PlusIcon,
    PencilSimpleIcon,
    TrashIcon,
} from "@phosphor-icons/react/dist/ssr";

export interface BOQItemWithROS {
    id?: string;
    itemNumber: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    rosDate?: string;
    isCritical: boolean;
    rosStatus: "NOT_SET" | "SET" | "TBD";
}

interface ROSManagerProps {
    boqItems: BOQItemWithROS[];
    onChange: (items: BOQItemWithROS[]) => void;
    currency?: string;
}

const EMPTY_ITEM: BOQItemWithROS = {
    itemNumber: "",
    description: "",
    unit: "EA",
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    isCritical: false,
    rosStatus: "NOT_SET",
};

export function ROSManager({ boqItems, onChange, currency = "USD" }: ROSManagerProps) {
    const [globalRosDate, setGlobalRosDate] = useState<string>("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<BOQItemWithROS>(EMPTY_ITEM);

    // Calculate totals
    const boqTotal = boqItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    const updateItem = (index: number, updates: Partial<BOQItemWithROS>) => {
        const updated = [...boqItems];
        updated[index] = { ...updated[index], ...updates };

        // Update ROS status based on rosDate
        if (updates.rosDate !== undefined) {
            if (updates.rosDate) {
                updated[index].rosStatus = "SET";
            } else if (updated[index].rosStatus !== "TBD") {
                updated[index].rosStatus = "NOT_SET";
            }
        }

        onChange(updated);
    };

    const applyGlobalRosDate = () => {
        if (!globalRosDate) return;
        const updated = boqItems.map((item) => ({
            ...item,
            rosDate: globalRosDate,
            rosStatus: "SET" as const,
        }));
        onChange(updated);
    };

    const setTBD = (index: number) => {
        updateItem(index, { rosDate: undefined, rosStatus: "TBD" });
    };

    // Add/Edit handlers
    const openAddDialog = () => {
        setEditingIndex(null);
        setEditForm({
            ...EMPTY_ITEM,
            itemNumber: String(boqItems.length + 1),
        });
        setEditDialogOpen(true);
    };

    const openEditDialog = (index: number) => {
        setEditingIndex(index);
        setEditForm({ ...boqItems[index] });
        setEditDialogOpen(true);
    };

    const handleFormChange = (field: keyof BOQItemWithROS, value: any) => {
        const updated = { ...editForm, [field]: value };
        // Auto-calculate total price
        if (field === "quantity" || field === "unitPrice") {
            updated.totalPrice = updated.quantity * updated.unitPrice;
        }
        setEditForm(updated);
    };

    const saveItem = () => {
        if (editingIndex !== null) {
            // Edit existing
            const updated = [...boqItems];
            updated[editingIndex] = editForm;
            onChange(updated);
        } else {
            // Add new
            onChange([...boqItems, editForm]);
        }
        setEditDialogOpen(false);
    };

    const deleteItem = (index: number) => {
        if (confirm("Delete this BOQ item?")) {
            onChange(boqItems.filter((_, i) => i !== index));
        }
    };

    const criticalWithoutROS = boqItems.filter(
        (item) => item.isCritical && item.rosStatus === "NOT_SET"
    );

    const tbdCount = boqItems.filter((item) => item.rosStatus === "TBD").length;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">
                            BOQ Items & ROS Dates
                        </CardTitle>
                        <CardDescription>
                            Manage line items and set Required On Site dates.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">BOQ Total</p>
                            <p className="font-mono font-bold text-lg">
                                {currency} {(boqTotal ?? 0).toLocaleString()}
                            </p>
                        </div>
                        <Button type="button" onClick={openAddDialog}>
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add Item
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Global ROS Date */}
                <div className="flex items-end gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                        <label className="text-sm font-medium">
                            Apply same date to all items
                        </label>
                        <Input
                            type="date"
                            value={globalRosDate}
                            onChange={(e) => setGlobalRosDate(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={applyGlobalRosDate}
                        disabled={!globalRosDate}
                    >
                        Apply to All
                    </Button>
                </div>

                {/* Warnings */}
                {criticalWithoutROS.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <WarningCircleIcon className="h-5 w-5 text-amber-600" />
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                            {criticalWithoutROS.length} critical item(s) need
                            ROS dates
                        </p>
                    </div>
                )}

                {tbdCount > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                            {tbdCount} item(s) marked TBD - reminder tasks will
                            be created
                        </p>
                    </div>
                )}

                {/* BOQ Table */}
                {boqItems.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        Critical
                                    </TableHead>
                                    <TableHead className="w-[60px]">
                                        Item #
                                    </TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[80px] text-right">
                                        Qty
                                    </TableHead>
                                    <TableHead className="w-[100px] text-right">
                                        Unit Price
                                    </TableHead>
                                    <TableHead className="w-[100px] text-right">
                                        Total
                                    </TableHead>
                                    <TableHead className="w-[130px]">
                                        ROS Date
                                    </TableHead>
                                    <TableHead className="w-[90px]">
                                        Status
                                    </TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {boqItems.map((item, index) => (
                                    <TableRow
                                        key={index}
                                        className={
                                            item.isCritical &&
                                                item.rosStatus === "NOT_SET"
                                                ? "bg-amber-50/50 dark:bg-amber-950/20"
                                                : ""
                                        }
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={item.isCritical}
                                                onCheckedChange={(checked) =>
                                                    updateItem(index, {
                                                        isCritical:
                                                            checked === true,
                                                    })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {item.itemNumber}
                                        </TableCell>
                                        <TableCell className="max-w-[150px] truncate">
                                            {item.description}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {item.quantity}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {(item.unitPrice ?? 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-medium">
                                            {(item.totalPrice ?? 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="date"
                                                value={item.rosDate || ""}
                                                onChange={(e) =>
                                                    updateItem(index, {
                                                        rosDate:
                                                            e.target.value ||
                                                            undefined,
                                                    })
                                                }
                                                disabled={
                                                    item.rosStatus === "TBD"
                                                }
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={item.rosStatus}
                                                onValueChange={(value) => {
                                                    if (value === "TBD") {
                                                        setTBD(index);
                                                    } else if (
                                                        value === "NOT_SET"
                                                    ) {
                                                        updateItem(index, {
                                                            rosDate: undefined,
                                                            rosStatus:
                                                                "NOT_SET",
                                                        });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-8 w-[80px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="NOT_SET">
                                                        --
                                                    </SelectItem>
                                                    <SelectItem value="SET">
                                                        Set
                                                    </SelectItem>
                                                    <SelectItem value="TBD">
                                                        TBD
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() =>
                                                        openEditDialog(index)
                                                    }
                                                >
                                                    <PencilSimpleIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={() =>
                                                        deleteItem(index)
                                                    }
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <p className="text-sm text-muted-foreground mb-4">
                            No BOQ items yet. Add items to match the PO total value.
                        </p>
                        <Button type="button" variant="outline" onClick={openAddDialog}>
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add First Item
                        </Button>
                    </div>
                )}

                {/* Add/Edit Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingIndex !== null ? "Edit BOQ Item" : "Add BOQ Item"}
                            </DialogTitle>
                            <DialogDescription>
                                Enter the item details. Total will calculate automatically.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <Label>Item #</Label>
                                    <Input
                                        value={editForm.itemNumber}
                                        onChange={(e) =>
                                            handleFormChange("itemNumber", e.target.value)
                                        }
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label>Description</Label>
                                    <Input
                                        value={editForm.description}
                                        onChange={(e) =>
                                            handleFormChange("description", e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <Label>Unit</Label>
                                    <Select
                                        value={editForm.unit}
                                        onValueChange={(v) => handleFormChange("unit", v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EA">EA (Each)</SelectItem>
                                            <SelectItem value="KG">KG</SelectItem>
                                            <SelectItem value="M">M (Meter)</SelectItem>
                                            <SelectItem value="L">L (Liter)</SelectItem>
                                            <SelectItem value="SET">SET</SelectItem>
                                            <SelectItem value="LOT">LOT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Quantity</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={editForm.quantity}
                                        onChange={(e) =>
                                            handleFormChange("quantity", Number(e.target.value))
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Unit Price</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editForm.unitPrice}
                                        onChange={(e) =>
                                            handleFormChange("unitPrice", Number(e.target.value))
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Total</Label>
                                    <Input
                                        type="number"
                                        value={editForm.totalPrice}
                                        onChange={(e) =>
                                            handleFormChange("totalPrice", Number(e.target.value))
                                        }
                                        className="font-mono font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="button" onClick={saveItem}>
                                {editingIndex !== null ? "Save Changes" : "Add Item"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
