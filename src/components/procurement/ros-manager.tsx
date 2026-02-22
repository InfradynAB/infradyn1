"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
    FileArrowUpIcon,
    GoogleLogoIcon,
    TableIcon,
    SpinnerIcon,
    DownloadSimpleIcon,
    DotsSixVertical,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
    DISCIPLINES,
    DISCIPLINE_LABELS,
    MATERIAL_CLASS_MAP,
    normalizeDisciplineKey,
    normalizeMaterialClass,
} from "@/lib/constants/material-categories";

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
    discipline?: string | null;
    materialClass?: string | null;
}

interface ROSManagerProps {
    boqItems: BOQItemWithROS[];
    onChange: (items: BOQItemWithROS[]) => void;
    currency?: string;
    orgId?: string;
    projectId?: string;
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

function reorderCols(
    arr: string[],
    from: string,
    to: string,
    setter: (val: string[]) => void
) {
    const next = [...arr];
    const fi = next.indexOf(from);
    const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return;
    next.splice(fi, 1);
    next.splice(ti, 0, from);
    setter(next);
}

export function ROSManager({ boqItems, onChange, currency = "USD", orgId, projectId }: ROSManagerProps) {
    const [globalRosDate, setGlobalRosDate] = useState<string>("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<BOQItemWithROS>(EMPTY_ITEM);

    // Import states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [sheetsDialogOpen, setSheetsDialogOpen] = useState(false);
    const [sheetsUrl, setSheetsUrl] = useState("");
    const [importConfirmOpen, setImportConfirmOpen] = useState(false);
    const [pendingItems, setPendingItems] = useState<BOQItemWithROS[]>([]);
    const [rosCols, setRosCols] = useState(["itemNum", "description", "qty", "unitPrice", "total", "discipline", "materialClass", "rosDate", "status"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    // Calculate totals
    const boqTotal = boqItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    // Normalize legacy/dirty discipline/materialClass values so cascaded selects always work.
    // This prevents cases where discipline was stored as a label (e.g. "Envelope") or the
    // materialClass doesn't exactly match the canonical taxonomy.
    useEffect(() => {
        let changed = false;
        const normalized = boqItems.map((item) => {
            const discipline = normalizeDisciplineKey(item.discipline ?? null);
            const materialClass = normalizeMaterialClass(discipline, item.materialClass ?? null);

            const prevDiscipline = item.discipline ?? null;
            const prevMaterialClass = item.materialClass ?? null;

            if (discipline !== prevDiscipline || materialClass !== prevMaterialClass) {
                changed = true;
                return { ...item, discipline, materialClass };
            }

            return item;
        });

        if (changed) onChange(normalized);
    }, [boqItems, onChange]);

    // Handle Excel/PDF file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            // Upload file first
            const formData = new FormData();
            formData.append("file", file);

            const presignRes = await fetch("/api/upload/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || "application/octet-stream",
                    docType: "boq",
                    orgId,
                    projectId,
                }),
            });

            if (!presignRes.ok) throw new Error("Failed to get upload URL");
            const { uploadUrl, fileUrl } = await presignRes.json();

            await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
            });

            // Extract BOQ items
            const extractRes = await fetch("/api/boq/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileUrl }),
            });

            const result = await extractRes.json();

            if (result.success && result.items?.length > 0) {
                const newItems: BOQItemWithROS[] = result.items.map((item: any) => ({
                    itemNumber: item.itemNumber || "",
                    description: item.description || "",
                    unit: item.unit || "EA",
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0,
                    isCritical: false,
                    rosStatus: "NOT_SET" as const,
                    discipline: item.discipline ?? null,
                    materialClass: item.materialClass ?? null,
                }));

                if (boqItems.length > 0) {
                    setPendingItems(newItems);
                    setImportConfirmOpen(true);
                } else {
                    onChange(newItems);
                    toast.success(`Imported ${newItems.length} BOQ items`);
                }
            } else {
                toast.error(result.error || "No valid BOQ data found in the imported file");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to import BOQ from file");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Handle Google Sheets import
    const handleSheetsImport = async () => {
        if (!sheetsUrl.trim()) {
            toast.error("Please enter a Google Sheets URL");
            return;
        }

        setIsImporting(true);
        try {
            const res = await fetch("/api/boq/import-sheets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ spreadsheetUrl: sheetsUrl }),
            });

            const result = await res.json();

            if (result.success && result.items?.length > 0) {
                const newItems: BOQItemWithROS[] = result.items.map((item: any) => ({
                    itemNumber: item.itemNumber || "",
                    description: item.description || "",
                    unit: item.unit || "EA",
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0,
                    isCritical: false,
                    rosStatus: "NOT_SET" as const,
                    discipline: item.discipline ?? null,
                    materialClass: item.materialClass ?? null,
                }));

                if (boqItems.length > 0) {
                    setPendingItems(newItems);
                    setImportConfirmOpen(true);
                    setSheetsDialogOpen(false);
                    setSheetsUrl("");
                } else {
                    onChange(newItems);
                    toast.success(`Imported ${newItems.length} items from Google Sheets`);
                    setSheetsDialogOpen(false);
                    setSheetsUrl("");
                }
            } else {
                toast.error(result.error || "No valid BOQ data found in the sheet");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to import from Google Sheets");
        } finally {
            setIsImporting(false);
        }
    };

    const handleImportConfirm = (mode: "append" | "replace") => {
        if (mode === "replace") {
            onChange(pendingItems);
            toast.success(`Replaced with ${pendingItems.length} imported items`);
        } else {
            onChange([...boqItems, ...pendingItems]);
            toast.success(`Appended ${pendingItems.length} imported items`);
        }
        setPendingItems([]);
        setImportConfirmOpen(false);
    };

    const updateItem = (index: number, updates: Partial<BOQItemWithROS>) => {
        const updated = [...boqItems];

        const merged = { ...updated[index], ...updates };
        const normalizedDiscipline = normalizeDisciplineKey(merged.discipline ?? null);
        const normalizedMaterialClass = normalizeMaterialClass(
            normalizedDiscipline,
            merged.materialClass ?? null,
        );

        updated[index] = {
            ...merged,
            discipline: normalizedDiscipline,
            materialClass: normalizedDiscipline ? normalizedMaterialClass : null,
        };

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

    const ROS_DEF: Record<string, { label: string; hCls?: string; cell: (item: BOQItemWithROS, idx: number) => ReactNode }> = {
        itemNum:       { label: "Item #",          hCls: "w-[60px]",              cell: (item) => <span className="font-mono text-sm">{item.itemNumber}</span> },
        description:   { label: "Description",                                    cell: (item) => <span className="max-w-[150px] truncate block">{item.description}</span> },
        qty:           { label: "Qty",             hCls: "w-20 text-right",       cell: (item) => <span className="font-mono text-sm block text-right">{item.quantity}</span> },
        unitPrice:     { label: "Unit Price",      hCls: "w-[100px] text-right",  cell: (item) => <span className="font-mono text-sm block text-right">{(item.unitPrice ?? 0).toLocaleString()}</span> },
        total:         { label: "Total",           hCls: "w-[100px] text-right",  cell: (item) => <span className="font-mono text-sm font-medium block text-right">{(item.totalPrice ?? 0).toLocaleString()}</span> },
        discipline:    { label: "Discipline",      hCls: "w-[130px]",             cell: (item, idx) => (
            <Select value={item.discipline ?? "__none"} onValueChange={(v) => updateItem(idx, { discipline: v === "__none" ? null : v, materialClass: null })}>
                <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="— none —" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="__none">— none —</SelectItem>
                    {DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>)}
                </SelectContent>
            </Select>
        ) },
        materialClass: { label: "Material Class",  hCls: "w-[140px]",            cell: (item, idx) => (
            <Select value={item.materialClass ?? "__none"} disabled={!item.discipline} onValueChange={(v) => updateItem(idx, { materialClass: v === "__none" ? null : v })}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="— select —" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="__none">— none —</SelectItem>
                    {(item.discipline ? (MATERIAL_CLASS_MAP[item.discipline as keyof typeof MATERIAL_CLASS_MAP] ?? []) : []).map((mc: string) => <SelectItem key={mc} value={mc}>{mc}</SelectItem>)}
                </SelectContent>
            </Select>
        ) },
        rosDate:       { label: "ROS Date",        hCls: "w-[130px]",             cell: (item, idx) => <Input type="date" value={item.rosDate || ""} onChange={(e) => updateItem(idx, { rosDate: e.target.value || undefined })} disabled={item.rosStatus === "TBD"} className="h-8" /> },
        status:        { label: "Status",          hCls: "w-[90px]",              cell: (item, idx) => (
            <Select value={item.rosStatus} onValueChange={(value) => { if (value === "TBD") { setTBD(idx); } else if (value === "NOT_SET") { updateItem(idx, { rosDate: undefined, rosStatus: "NOT_SET" }); } }}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="NOT_SET">--</SelectItem>
                    <SelectItem value="SET">Set</SelectItem>
                    <SelectItem value="TBD">TBD</SelectItem>
                </SelectContent>
            </Select>
        ) },
    };

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
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                />

                {/* Import Options */}
                <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300 mr-2">
                        Import BOQ:
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="gap-1.5"
                    >
                        {isImporting ? (
                            <SpinnerIcon className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileArrowUpIcon className="h-4 w-4" />
                        )}
                        Excel
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSheetsDialogOpen(true)}
                        disabled={isImporting}
                        className="gap-1.5"
                    >
                        <GoogleLogoIcon className="h-4 w-4" />
                        Google Sheets
                    </Button>
                    <a href="/api/boq/extract" download className="inline-flex">
                        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                            <DownloadSimpleIcon className="h-4 w-4" />
                            Template
                        </Button>
                    </a>
                </div>

                {/* Google Sheets Import Dialog */}
                <Dialog open={sheetsDialogOpen} onOpenChange={setSheetsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <GoogleLogoIcon className="h-5 w-5" />
                                Import from Google Sheets
                            </DialogTitle>
                            <DialogDescription>
                                Paste your Google Sheets URL. Make sure the sheet is shared with the app.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Spreadsheet URL</Label>
                                <Input
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    value={sheetsUrl}
                                    onChange={(e) => setSheetsUrl(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p><strong>Expected columns:</strong></p>
                                <ul className="list-disc list-inside text-xs space-y-1">
                                    <li>Description (required)</li>
                                    <li>Quantity, Unit Price, Total</li>
                                    <li>Item #, Unit</li>
                                </ul>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSheetsDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSheetsImport}
                                disabled={isImporting}
                            >
                                {isImporting ? (
                                    <>
                                        <SpinnerIcon className="h-4 w-4 mr-2 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    "Import"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Import Override Confirmation Dialog */}
                <Dialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Import BOQ Items</DialogTitle>
                            <DialogDescription>
                                You already have {boqItems.length} items in your list. How would you like to handle the {pendingItems.length} new items?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                                Choosing **Replace** will remove all current items and use the new ones. **Append** will add the new items to the bottom of your current list.
                            </p>
                        </div>
                        <DialogFooter className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setImportConfirmOpen(false);
                                    setPendingItems([]);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => handleImportConfirm("append")}
                            >
                                Append Items
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => handleImportConfirm("replace")}
                            >
                                Replace Existing
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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
                    <div className="border rounded-lg">
                        <div className="max-h-[400px] overflow-auto">
                            <Table className="min-w-[1100px]">

                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Critical</TableHead>
                                        {rosCols.map((col) => (
                                            <TableHead
                                                key={col}
                                                draggable
                                                onDragStart={() => setDragCol(col)}
                                                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                                onDragEnd={() => { reorderCols(rosCols, dragCol!, dragOverCol!, setRosCols); setDragCol(null); setDragOverCol(null); }}
                                                className={[
                                                    "cursor-grab active:cursor-grabbing select-none",
                                                    ROS_DEF[col].hCls ?? "",
                                                    dragCol === col ? "opacity-40 bg-muted/60" : "",
                                                    dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : "",
                                                ].join(" ")}
                                            >
                                                <span className="flex items-center gap-1">
                                                    <DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                                    {ROS_DEF[col].label}
                                                </span>
                                            </TableHead>
                                        ))}
                                        <TableHead className="w-20" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {boqItems.map((item, index) => (
                                        <TableRow
                                            key={index}
                                            className={
                                                item.isCritical && item.rosStatus === "NOT_SET"
                                                    ? "bg-amber-50/50 dark:bg-amber-950/20"
                                                    : ""
                                            }
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={item.isCritical}
                                                    onCheckedChange={(checked) =>
                                                        updateItem(index, { isCritical: checked === true })
                                                    }
                                                />
                                            </TableCell>
                                            {rosCols.map((col) => (
                                                <TableCell key={col}>{ROS_DEF[col].cell(item, index)}</TableCell>
                                            ))}
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8"
                                                        onClick={() => openEditDialog(index)}
                                                    >
                                                        <PencilSimpleIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => deleteItem(index)}
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
                            {/* Categorisation */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Discipline</Label>
                                    <Select
                                        value={editForm.discipline ?? "__none"}
                                        onValueChange={(v) => {
                                            handleFormChange('discipline', v === '__none' ? null : v);
                                            handleFormChange('materialClass', null);
                                        }}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="— none —" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none">— none —</SelectItem>
                                            {DISCIPLINES.map((d) => (
                                                <SelectItem key={d} value={d}>
                                                    {DISCIPLINE_LABELS[d]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Material Class</Label>
                                    <Select
                                        value={editForm.materialClass ?? "__none"}
                                        disabled={!editForm.discipline}
                                        onValueChange={(v) =>
                                            handleFormChange('materialClass', v === '__none' ? null : v)
                                        }
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="— select discipline first —" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none">— none —</SelectItem>
                                            {(editForm.discipline ? (MATERIAL_CLASS_MAP[editForm.discipline as keyof typeof MATERIAL_CLASS_MAP] ?? []) : []).map((mc: string) => (
                                                <SelectItem key={mc} value={mc}>{mc}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
