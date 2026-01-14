"use client";

/**
 * Phase 6J: Supplier Accuracy Settings
 * 
 * Admin component to view and manage supplier accuracy metrics
 * and auto-accept policies.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Building2, TrendingUp, TrendingDown, CheckCircle,
    XCircle, Settings, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SupplierAccuracy {
    id: string;
    supplierId: string;
    supplier?: {
        name: string;
        email?: string | null;
    };
    totalShipments: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    accuracyScore: number;
    autoAcceptEnabled: boolean;
    autoAcceptThreshold: number;
    lastCalculatedAt?: Date | string | null;
}

interface SupplierAccuracySettingsProps {
    organizationId?: string;
}

export function SupplierAccuracySettings({
    organizationId,
}: SupplierAccuracySettingsProps) {
    const [suppliers, setSuppliers] = useState<SupplierAccuracy[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierAccuracy | null>(null);
    const [saving, setSaving] = useState(false);

    // Edit form state
    const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
    const [autoAcceptThreshold, setAutoAcceptThreshold] = useState("90");

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (organizationId) params.set("organizationId", organizationId);

            const response = await fetch(`/api/supplier-accuracy?${params}`);
            const data = await response.json();
            if (data.suppliers) {
                setSuppliers(data.suppliers);
            }
        } catch (error) {
            console.error("Failed to fetch suppliers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, [organizationId]);

    const openEditDialog = (supplier: SupplierAccuracy) => {
        setSelectedSupplier(supplier);
        setAutoAcceptEnabled(supplier.autoAcceptEnabled);
        setAutoAcceptThreshold(supplier.autoAcceptThreshold.toString());
    };

    const handleSave = async () => {
        if (!selectedSupplier) return;

        setSaving(true);
        try {
            const response = await fetch("/api/supplier-accuracy", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplierId: selectedSupplier.supplierId,
                    autoAcceptEnabled,
                    autoAcceptThreshold: Number(autoAcceptThreshold),
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Supplier settings updated");
                setSelectedSupplier(null);
                fetchSuppliers();
            } else {
                throw new Error(data.error || "Failed to update");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-green-600";
        if (score >= 70) return "text-yellow-600";
        return "text-red-600";
    };

    const getScoreBadge = (score: number) => {
        if (score >= 90) return { label: "Excellent", color: "bg-green-500" };
        if (score >= 70) return { label: "Good", color: "bg-yellow-500" };
        if (score >= 50) return { label: "Fair", color: "bg-orange-500" };
        return { label: "Poor", color: "bg-red-500" };
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Supplier Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Supplier Accuracy & Policies
                            </CardTitle>
                            <CardDescription>
                                View supplier delivery performance and configure auto-accept policies
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchSuppliers}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {suppliers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p className="font-medium">No supplier data</p>
                            <p className="text-sm">Accuracy metrics will appear after deliveries</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead className="text-center">Shipments</TableHead>
                                    <TableHead className="text-center">On-Time</TableHead>
                                    <TableHead className="text-center">Late</TableHead>
                                    <TableHead className="text-center">Score</TableHead>
                                    <TableHead className="text-center">Auto-Accept</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {suppliers.map((supplier) => {
                                    const scoreBadge = getScoreBadge(supplier.accuracyScore);

                                    return (
                                        <TableRow key={supplier.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">
                                                        {supplier.supplier?.name || "Unknown Supplier"}
                                                    </p>
                                                    {supplier.supplier?.email && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {supplier.supplier.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {supplier.totalShipments}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="flex items-center justify-center gap-1 text-green-600">
                                                    <CheckCircle className="h-4 w-4" />
                                                    {supplier.onTimeDeliveries}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="flex items-center justify-center gap-1 text-red-600">
                                                    <XCircle className="h-4 w-4" />
                                                    {supplier.lateDeliveries}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={cn("font-bold", getScoreColor(supplier.accuracyScore))}>
                                                        {supplier.accuracyScore.toFixed(0)}%
                                                    </span>
                                                    <Badge className={cn("text-white text-xs", scoreBadge.color)}>
                                                        {scoreBadge.label}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {supplier.autoAcceptEnabled ? (
                                                    <Badge variant="outline" className="text-green-600">
                                                        Enabled ({supplier.autoAcceptThreshold}%)
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground">
                                                        Disabled
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditDialog(supplier)}
                                                >
                                                    <Settings className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Edit Policy: {selectedSupplier?.supplier?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Score Summary */}
                        {selectedSupplier && (
                            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Accuracy Score</span>
                                    <span className={cn("text-2xl font-bold", getScoreColor(selectedSupplier.accuracyScore))}>
                                        {selectedSupplier.accuracyScore.toFixed(1)}%
                                    </span>
                                </div>
                                <Progress value={selectedSupplier.accuracyScore} className="h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{selectedSupplier.onTimeDeliveries} on-time</span>
                                    <span>{selectedSupplier.lateDeliveries} late</span>
                                </div>
                            </div>
                        )}

                        {/* Auto-Accept Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label>Auto-Accept Shipments</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically accept shipments from this supplier if score meets threshold
                                </p>
                            </div>
                            <Switch
                                checked={autoAcceptEnabled}
                                onCheckedChange={setAutoAcceptEnabled}
                            />
                        </div>

                        {/* Threshold Setting */}
                        {autoAcceptEnabled && (
                            <div className="space-y-2">
                                <Label>Minimum Score Threshold</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={autoAcceptThreshold}
                                        onChange={(e) => setAutoAcceptThreshold(e.target.value)}
                                        min={50}
                                        max={100}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">%</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Shipments will auto-accept only if supplier's current score is above this threshold
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedSupplier(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save Policy"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
