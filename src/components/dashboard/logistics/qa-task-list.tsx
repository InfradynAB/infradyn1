"use client";

/**
 * Phase 6: QA Task List
 * 
 * Displays pending QA inspection tasks for PM/QA review.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ClipboardCheck, Clock, CheckCircle, XCircle,
    AlertTriangle, Calendar, Package, User
} from "lucide-react";
import { format, formatDistanceToNow, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface QaTask {
    id: string;
    status: string;
    dueDate?: string | Date | null;
    completedAt?: string | Date | null;
    inspectionNotes?: string | null;
    passedItems?: number | null;
    failedItems?: number | null;
    ncrRequired?: boolean;
    createdAt: string | Date;
    purchaseOrder?: {
        poNumber: string;
    };
    deliveryReceipt?: {
        receivedQty: string;
        condition?: string | null;
    };
}

interface QaTaskListProps {
    purchaseOrderId?: string;
    showCompleted?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: "Pending", color: "bg-yellow-500", icon: <Clock className="h-4 w-4" /> },
    IN_PROGRESS: { label: "In Progress", color: "bg-blue-500", icon: <ClipboardCheck className="h-4 w-4" /> },
    PASSED: { label: "Passed", color: "bg-green-500", icon: <CheckCircle className="h-4 w-4" /> },
    FAILED: { label: "Failed", color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
    WAIVED: { label: "Waived", color: "bg-gray-500", icon: <AlertTriangle className="h-4 w-4" /> },
};

export function QaTaskList({
    purchaseOrderId,
    showCompleted = false,
}: QaTaskListProps) {
    const router = useRouter();
    const [tasks, setTasks] = useState<QaTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<QaTask | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state for task completion
    const [status, setStatus] = useState<string>("PASSED");
    const [passedItems, setPassedItems] = useState("");
    const [failedItems, setFailedItems] = useState("");
    const [notes, setNotes] = useState("");
    const [ncrRequired, setNcrRequired] = useState(false);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (purchaseOrderId) params.set("purchaseOrderId", purchaseOrderId);
            if (!showCompleted) params.set("status", "pending");

            const response = await fetch(`/api/qa-tasks?${params}`);
            const data = await response.json();
            if (data.tasks) {
                setTasks(data.tasks);
            }
        } catch (error) {
            console.error("Failed to fetch QA tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [purchaseOrderId, showCompleted]);

    const openTaskDialog = (task: QaTask) => {
        setSelectedTask(task);
        setStatus("PASSED");
        setPassedItems("");
        setFailedItems("");
        setNotes(task.inspectionNotes || "");
        setNcrRequired(task.ncrRequired || false);
    };

    const handleSubmit = async () => {
        if (!selectedTask) return;

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/qa-tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId: selectedTask.id,
                    status,
                    passedItems: passedItems ? Number(passedItems) : undefined,
                    failedItems: failedItems ? Number(failedItems) : undefined,
                    inspectionNotes: notes,
                    ncrRequired,
                }),
            });
            const data = await response.json();

            if (data.success) {
                toast.success(`QA task marked as ${status.toLowerCase()}`);
                setSelectedTask(null);
                fetchTasks();
            } else {
                throw new Error(data.error || "Failed to update task");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update task");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>QA Inspections</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const pendingTasks = tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS");
    const overdueTasks = pendingTasks.filter((t) => {
        if (!t.dueDate) return false;
        const due = typeof t.dueDate === "string" ? new Date(t.dueDate) : t.dueDate;
        return isAfter(new Date(), due);
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5" />
                                QA Inspections
                            </CardTitle>
                            <CardDescription>
                                {pendingTasks.length} pending inspection{pendingTasks.length !== 1 ? "s" : ""}
                                {overdueTasks.length > 0 && (
                                    <span className="text-red-500 ml-2">
                                        ({overdueTasks.length} overdue)
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchTasks}>
                            Refresh
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {tasks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                            <p className="font-medium">No pending inspections</p>
                            <p className="text-sm">All QA tasks have been completed</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tasks.map((task) => {
                                const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
                                const dueDate = task.dueDate
                                    ? typeof task.dueDate === "string" ? new Date(task.dueDate) : task.dueDate
                                    : null;
                                const isOverdue = dueDate && isAfter(new Date(), dueDate);

                                return (
                                    <div
                                        key={task.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-lg border",
                                            isOverdue && task.status === "PENDING" && "bg-red-50 border-red-200"
                                        )}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">
                                                    PO: {task.purchaseOrder?.poNumber || "—"}
                                                </span>
                                                <Badge className={cn("text-white text-xs", statusConfig.color)}>
                                                    {statusConfig.icon}
                                                    <span className="ml-1">{statusConfig.label}</span>
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                {task.deliveryReceipt && (
                                                    <span>
                                                        Qty: {task.deliveryReceipt.receivedQty}
                                                        {task.deliveryReceipt.condition && ` (${task.deliveryReceipt.condition})`}
                                                    </span>
                                                )}
                                                {dueDate && (
                                                    <span className={cn(
                                                        "flex items-center gap-1",
                                                        isOverdue && "text-red-600"
                                                    )}>
                                                        <Calendar className="h-3 w-3" />
                                                        Due: {format(dueDate, "MMM d, h:mm a")}
                                                        {isOverdue && " (Overdue)"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {(task.status === "PENDING" || task.status === "IN_PROGRESS") && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => openTaskDialog(task)}
                                                >
                                                    Complete
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Complete Task Dialog */}
            <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete QA Inspection</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Result</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PASSED">Passed</SelectItem>
                                    <SelectItem value="FAILED">Failed</SelectItem>
                                    <SelectItem value="WAIVED">Waived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Items Passed</Label>
                                <Input
                                    type="number"
                                    value={passedItems}
                                    onChange={(e) => setPassedItems(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Items Failed</Label>
                                <Input
                                    type="number"
                                    value={failedItems}
                                    onChange={(e) => setFailedItems(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Inspection Notes</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Enter inspection findings..."
                                rows={3}
                            />
                        </div>

                        {status === "FAILED" && (
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="ncr"
                                    checked={ncrRequired}
                                    onChange={(e) => setNcrRequired(e.target.checked)}
                                    className="rounded"
                                />
                                <Label htmlFor="ncr">Create NCR (Non-Conformance Report)</Label>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedTask(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Result"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
