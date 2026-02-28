"use client";

import { useMemo, useState } from "react";
import { format as formatDateValue } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BatchStatus = "PENDING" | "IN_TRANSIT" | "PARTIALLY_DELIVERED" | "DELIVERED" | "LATE" | "CANCELLED";

export type BatchModalMode = "create" | "duplicate" | "status";

interface BatchModalValues {
  batchLabel: string;
  expectedDate: string;
  actualDate: string;
  quantityExpected: number;
  quantityDelivered: number;
  status: BatchStatus;
}

interface BatchModalProps {
  open: boolean;
  mode: BatchModalMode;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BatchModalValues) => Promise<void>;
  saving?: boolean;
  initialValues?: Partial<BatchModalValues>;
}

const STORAGE_KEY = "boq_tracker_batch_modal_defaults";

const EMPTY_VALUES: BatchModalValues = {
  batchLabel: "",
  expectedDate: "",
  actualDate: "",
  quantityExpected: 0,
  quantityDelivered: 0,
  status: "PENDING",
};

function parseIsoDate(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`);
}

function buildInitialValues(mode: BatchModalMode, initialValues?: Partial<BatchModalValues>): BatchModalValues {
  let remembered: Partial<BatchModalValues> = {};

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) remembered = JSON.parse(raw) as Partial<BatchModalValues>;
    } catch {
      remembered = {};
    }
  }

  return {
    ...EMPTY_VALUES,
    ...remembered,
    ...initialValues,
    batchLabel: initialValues?.batchLabel ?? remembered.batchLabel ?? (mode === "status" ? "" : "New delivery batch"),
    status: (initialValues?.status ?? remembered.status ?? "PENDING") as BatchStatus,
    quantityExpected: Number(initialValues?.quantityExpected ?? remembered.quantityExpected ?? 0),
    quantityDelivered: Number(initialValues?.quantityDelivered ?? remembered.quantityDelivered ?? 0),
    expectedDate: initialValues?.expectedDate ?? remembered.expectedDate ?? "",
    actualDate: initialValues?.actualDate ?? remembered.actualDate ?? "",
  };
}

export function BoqBatchModal({
  open,
  mode,
  onOpenChange,
  onSubmit,
  saving = false,
  initialValues,
}: BatchModalProps) {
  const [values, setValues] = useState<BatchModalValues>(() => buildInitialValues(mode, initialValues));

  const title = useMemo(() => {
    if (mode === "create") return "Add Delivery Batch";
    if (mode === "duplicate") return "Duplicate Delivery Batch";
    return "Update Batch Status";
  }, [mode]);

  const description = useMemo(() => {
    if (mode === "create") return "Create a new time-based delivery batch for this BOQ item.";
    if (mode === "duplicate") return "Duplicate an existing batch to split deliveries by month or window.";
    return "Update delivery status and actual quantity/date for this batch.";
  }, [mode]);

  function update<K extends keyof BatchModalValues>(key: K, value: BatchModalValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (mode !== "status" && !values.batchLabel.trim()) return;

    await onSubmit(values);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          batchLabel: values.batchLabel,
          expectedDate: values.expectedDate,
          quantityExpected: values.quantityExpected,
          status: values.status,
        }),
      );
    } catch {
      // ignore storage failures
    }
  }

  const showDeliveryFields = mode === "status" && values.status === "DELIVERED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode !== "status" && (
            <div className="space-y-2">
              <Label htmlFor="batch-label">Batch label</Label>
              <Input
                id="batch-label"
                value={values.batchLabel}
                onChange={(event) => update("batchLabel", event.target.value)}
                placeholder="February delivery"
              />
            </div>
          )}

          {(mode === "create" || mode === "duplicate") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="batch-expected-date">Expected date</Label>
                <DatePicker
                  id="batch-expected-date"
                  value={parseIsoDate(values.expectedDate)}
                  onChange={(date) => update("expectedDate", date ? formatDateValue(date, "yyyy-MM-dd") : "")}
                  placeholder="yyyy/mm/dd"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-qty-expected">Expected quantity</Label>
                <Input
                  id="batch-qty-expected"
                  type="number"
                  min={0}
                  value={Number.isFinite(values.quantityExpected) ? values.quantityExpected : 0}
                  onChange={(event) => update("quantityExpected", Number(event.target.value) || 0)}
                />
              </div>
            </>
          )}

          {mode === "status" && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={values.status} onValueChange={(value) => update("status", value as BatchStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="IN_TRANSIT">IN_TRANSIT</SelectItem>
                  <SelectItem value="PARTIALLY_DELIVERED">PARTIALLY_DELIVERED</SelectItem>
                  <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                  <SelectItem value="LATE">LATE</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {showDeliveryFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="batch-actual-date">Actual delivered date</Label>
                <DatePicker
                  id="batch-actual-date"
                  value={parseIsoDate(values.actualDate)}
                  onChange={(date) => update("actualDate", date ? formatDateValue(date, "yyyy-MM-dd") : "")}
                  placeholder="yyyy/mm/dd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-qty-delivered">Delivered quantity</Label>
                <Input
                  id="batch-qty-delivered"
                  type="number"
                  min={0}
                  value={Number.isFinite(values.quantityDelivered) ? values.quantityDelivered : 0}
                  onChange={(event) => update("quantityDelivered", Number(event.target.value) || 0)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
