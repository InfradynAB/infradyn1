"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ChartBar, Rows, X,
} from "@phosphor-icons/react";
import type { POStatusData } from "./charts/po-status-radial";
import type { DeliveryTimelineItem } from "./charts/delivery-gantt";
import type { InvoiceCyclePoint } from "./charts/invoice-cycle-line";
import type { ComplianceData } from "./charts/compliance-gauge";
import type { NCRMonthData } from "./charts/ncr-stacked-bars";
import type { DocumentStatusItem } from "./charts/document-grid";

// ============================================
// RE-EXPORT CHART TYPES
// ============================================
export type { POStatusData, DeliveryTimelineItem, InvoiceCyclePoint, ComplianceData, NCRMonthData, DocumentStatusItem };

// ============================================
// TYPES
// ============================================
export interface SupplierKPIs {
    totalActivePOs: number;
    pendingDeliveries: number;
    invoicesPendingApproval: number;
    ncrsAssigned: number;
    onTimeDeliveryScore: number;
    averagePaymentCycle: number;
    upcomingDeliveriesThisWeek: number;
    documentComplianceScore: number;
    milestonesPendingApproval: number;
    totalPaymentsReceived: number;
    totalPOValue: number;
    currency: string;
}

export interface POItem {
    id: string;
    poNumber: string;
    project: string;
    totalValue: number;
    currency: string;
    status: string;
    createdAt: string;
    deliveryProgress: number;
}

export interface InvoiceItem {
    id: string;
    invoiceNumber: string;
    poNumber: string;
    amount: number;
    status: string;
    submittedDate: string;
    dueDate: string;
    paidAt: string | null;
}

export interface MilestoneItem {
    id: string;
    title: string;
    poNumber: string;
    expectedDate: string;
    amount: number;
    status: string;
    paymentPercentage: number;
}

export interface NCRItem {
    id: string;
    ncrNumber: string;
    title: string;
    severity: string;
    status: string;
    reportedAt: string;
    slaDueAt: string | null;
}

// ============================================
// HELPERS
// ============================================
export const fmt = (value: number | undefined | null, currency = "$") => {
    const num = Number(value) || 0;
    if (num >= 1_000_000) return `${currency}${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${currency}${(num / 1_000).toFixed(1)}K`;
    return `${currency}${num.toFixed(0)}`;
};
export const pct = (v: number | undefined | null, d = 1) => `${(Number(v) || 0).toFixed(d)}%`;

// ============================================
// MOCK DATA
// ============================================
export function mockKPIs(): SupplierKPIs {
    return {
        totalActivePOs: 4, pendingDeliveries: 3, invoicesPendingApproval: 2,
        ncrsAssigned: 1, onTimeDeliveryScore: 87, averagePaymentCycle: 18,
        upcomingDeliveriesThisWeek: 2, documentComplianceScore: 85,
        milestonesPendingApproval: 3, totalPaymentsReceived: 145000,
        totalPOValue: 520000, currency: "USD",
    };
}

export function mockPOs(): POItem[] {
    return [
        { id: "1", poNumber: "PO-2024-001", project: "Al Wakra Highway", totalValue: 180000, currency: "USD", status: "ACCEPTED", createdAt: "2025-11-05", deliveryProgress: 65 },
        { id: "2", poNumber: "PO-2024-002", project: "Lusail Station", totalValue: 220000, currency: "USD", status: "ACCEPTED", createdAt: "2025-12-10", deliveryProgress: 30 },
        { id: "3", poNumber: "PO-2024-003", project: "Industrial City", totalValue: 75000, currency: "USD", status: "PENDING_RESPONSE", createdAt: "2026-01-15", deliveryProgress: 0 },
        { id: "4", poNumber: "PO-2024-004", project: "Al Wakra Highway", totalValue: 45000, currency: "USD", status: "COMPLETED", createdAt: "2025-08-20", deliveryProgress: 100 },
    ];
}

export function mockPOStatus(): POStatusData {
    return {
        delivered: { count: 1, value: 45000 },
        inProgress: { count: 2, value: 400000 },
        pending: { count: 1, value: 75000 },
        overdue: { count: 0, value: 0 },
        total: { count: 4, value: 520000 },
    };
}

export function mockDeliveryTimeline(): DeliveryTimelineItem[] {
    return [
        { id: "d1", poNumber: "PO-2024-001", description: "Steel reinforcement bars", stages: [
            { name: "dispatch", date: "2026-01-20", status: "completed" }, { name: "transit", date: "2026-01-25", status: "completed" },
            { name: "delivered", date: "2026-02-01", status: "completed" }, { name: "inspected", date: null, status: "in-progress" },
        ]},
        { id: "d2", poNumber: "PO-2024-001", description: "Concrete mix grade C40", stages: [
            { name: "dispatch", date: "2026-02-03", status: "completed" }, { name: "transit", date: "2026-02-05", status: "in-progress" },
            { name: "delivered", date: null, status: "pending" }, { name: "inspected", date: null, status: "pending" },
        ]},
        { id: "d3", poNumber: "PO-2024-002", description: "HVAC ductwork", stages: [
            { name: "dispatch", date: "2026-01-28", status: "completed" }, { name: "transit", date: "2026-02-01", status: "delayed" },
            { name: "delivered", date: null, status: "pending" }, { name: "inspected", date: null, status: "pending" },
        ]},
    ];
}

export function mockInvoiceCycle(): InvoiceCyclePoint[] {
    return [
        { id: "i1", invoiceNumber: "INV-001", submittedDate: "2025-09-15", daysToApproval: 8, amount: 22500, status: "PAID" },
        { id: "i2", invoiceNumber: "INV-002", submittedDate: "2025-10-20", daysToApproval: 12, amount: 18000, status: "PAID" },
        { id: "i3", invoiceNumber: "INV-003", submittedDate: "2025-11-10", daysToApproval: 16, amount: 35000, status: "APPROVED" },
        { id: "i4", invoiceNumber: "INV-004", submittedDate: "2025-12-05", daysToApproval: 10, amount: 28000, status: "PAID" },
        { id: "i5", invoiceNumber: "INV-005", submittedDate: "2026-01-15", daysToApproval: 20, amount: 41500, status: "PENDING_APPROVAL" },
    ];
}

export function mockInvoices(): InvoiceItem[] {
    return [
        { id: "i1", invoiceNumber: "INV-001", poNumber: "PO-2024-004", amount: 22500, status: "PAID", submittedDate: "2025-09-15", dueDate: "2025-10-15", paidAt: "2025-09-23" },
        { id: "i2", invoiceNumber: "INV-002", poNumber: "PO-2024-004", amount: 18000, status: "PAID", submittedDate: "2025-10-20", dueDate: "2025-11-20", paidAt: "2025-11-01" },
        { id: "i3", invoiceNumber: "INV-003", poNumber: "PO-2024-001", amount: 35000, status: "APPROVED", submittedDate: "2025-11-10", dueDate: "2025-12-10", paidAt: null },
        { id: "i4", invoiceNumber: "INV-004", poNumber: "PO-2024-001", amount: 28000, status: "PAID", submittedDate: "2025-12-05", dueDate: "2026-01-05", paidAt: "2025-12-15" },
        { id: "i5", invoiceNumber: "INV-005", poNumber: "PO-2024-002", amount: 41500, status: "PENDING_APPROVAL", submittedDate: "2026-01-15", dueDate: "2026-02-15", paidAt: null },
    ];
}

export function mockComplianceData(): ComplianceData {
    return {
        overallScore: 85,
        documents: [
            { type: "Trade License", status: "valid", expiryDate: "2027-03-15", uploadDate: "2025-04-01" },
            { type: "ISO 9001 Certificate", status: "valid", expiryDate: "2026-12-31", uploadDate: "2025-01-15" },
            { type: "Insurance Policy", status: "expiring", expiryDate: "2026-03-10", uploadDate: "2025-03-10" },
            { type: "Tax Registration", status: "valid", uploadDate: "2025-06-20" },
            { type: "Safety Compliance Cert", status: "missing" },
            { type: "Environmental Permit", status: "valid", expiryDate: "2027-06-30", uploadDate: "2025-07-01" },
        ],
    };
}

export function mockDocuments(): DocumentStatusItem[] {
    return [
        { id: "doc1", type: "Trade License", status: "valid", expiryDate: "2027-03-15", uploadDate: "2025-04-01" },
        { id: "doc2", type: "ISO 9001 Certificate", status: "valid", expiryDate: "2026-12-31", uploadDate: "2025-01-15" },
        { id: "doc3", type: "Insurance Policy", status: "expiring", expiryDate: "2026-03-10", uploadDate: "2025-03-10" },
        { id: "doc4", type: "Tax Registration", status: "valid", uploadDate: "2025-06-20" },
        { id: "doc5", type: "Safety Compliance Cert", status: "missing" },
        { id: "doc6", type: "Environmental Permit", status: "valid", expiryDate: "2027-06-30", uploadDate: "2025-07-01" },
    ];
}

export function mockNCRMonthly(): NCRMonthData[] {
    return [
        { month: "Sep 25", accepted: 1, rejected: 0, awaiting: 0 },
        { month: "Oct 25", accepted: 0, rejected: 1, awaiting: 0 },
        { month: "Nov 25", accepted: 1, rejected: 0, awaiting: 1 },
        { month: "Dec 25", accepted: 2, rejected: 0, awaiting: 0 },
        { month: "Jan 26", accepted: 0, rejected: 0, awaiting: 1 },
        { month: "Feb 26", accepted: 0, rejected: 0, awaiting: 0 },
    ];
}

export function mockNCRs(): NCRItem[] {
    return [
        { id: "n1", ncrNumber: "NCR-001", title: "Damaged steel bars on delivery", severity: "MAJOR", status: "OPEN", reportedAt: "2026-01-20", slaDueAt: "2026-02-03" },
        { id: "n2", ncrNumber: "NCR-002", title: "Wrong spec concrete mix", severity: "MINOR", status: "SUPPLIER_RESPONDED", reportedAt: "2025-12-15", slaDueAt: null },
    ];
}

export function mockMilestones(): MilestoneItem[] {
    return [
        { id: "m1", title: "Material Procurement Complete", poNumber: "PO-2024-001", expectedDate: "2026-01-30", amount: 36000, status: "COMPLETED", paymentPercentage: 20 },
        { id: "m2", title: "First Delivery Batch", poNumber: "PO-2024-001", expectedDate: "2026-02-15", amount: 54000, status: "SUBMITTED", paymentPercentage: 30 },
        { id: "m3", title: "Installation Phase 1", poNumber: "PO-2024-001", expectedDate: "2026-03-30", amount: 90000, status: "PENDING", paymentPercentage: 50 },
        { id: "m4", title: "Initial Delivery", poNumber: "PO-2024-002", expectedDate: "2026-02-28", amount: 66000, status: "PENDING", paymentPercentage: 30 },
        { id: "m5", title: "Quality Inspection", poNumber: "PO-2024-002", expectedDate: "2026-03-15", amount: 44000, status: "PENDING", paymentPercentage: 20 },
    ];
}

// ============================================
// HELPER COMPONENTS
// ============================================
export function SectionHeader({
    icon: Icon, iconBg, iconColor, title, subtitle, badge, rightContent,
}: {
    icon: React.ElementType; iconBg: string; iconColor: string; title: string; subtitle: string;
    badge?: { label: string; variant: "default" | "destructive" | "outline" };
    rightContent?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center", iconBg)}>
                    <Icon className={cn("w-5.5 h-5.5", iconColor)} weight="duotone" />
                </div>
                <div>
                    <h2 className="text-lg font-bold tracking-tight">{title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {badge && <Badge variant={badge.variant} className="text-[10px] font-bold animate-pulse px-2.5 py-1 rounded-lg">{badge.label}</Badge>}
                {rightContent}
            </div>
        </div>
    );
}

export function KPICard({ label, value, icon: Icon, color, subtitle, alert }: {
    label: string; value: string; icon: React.ElementType; color: "blue" | "emerald" | "amber" | "violet" | "red"; subtitle?: string; alert?: boolean;
}) {
    const fg = {
        blue: "text-blue-600 dark:text-blue-400",
        emerald: "text-emerald-600 dark:text-emerald-400",
        amber: "text-amber-600 dark:text-amber-400",
        violet: "text-violet-600 dark:text-violet-400",
        red: "text-red-600 dark:text-red-400",
    }[color];
    return (
        <div className={cn("rounded-2xl border border-border/60 bg-card p-4", alert && "border-red-200/80 dark:border-red-800/40")}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("w-4 h-4", fg)} weight="duotone" />
                <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold font-mono tabular-nums">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
    );
}

export function StatCard({ label, value, color, alert }: { label: string; value: string; color: "blue" | "emerald" | "amber" | "violet" | "red"; alert?: boolean }) {
    const palette = {
        blue: "text-blue-600 dark:text-blue-400",
        emerald: "text-emerald-600 dark:text-emerald-400",
        amber: "text-amber-600 dark:text-amber-400",
        violet: "text-violet-600 dark:text-violet-400",
        red: "text-red-600 dark:text-red-400",
    }[color];
    return (
        <div className={cn("rounded-xl border border-border/40 p-3 text-center bg-card/50", alert && "border-red-200/80 dark:border-red-800/40")}>
            <p className={cn("text-lg font-bold font-mono tabular-nums", palette)}>{value}</p>
            <p className="text-[9px] text-muted-foreground font-medium">{label}</p>
        </div>
    );
}

export function ViewToggle({ section, current, onChange }: { section: string; current: "chart" | "table"; onChange: (section: string, mode: "chart" | "table") => void }) {
    return (
        <div className="flex items-center rounded-xl border border-border/60 bg-muted/30 p-0.5">
            <button onClick={() => onChange(section, "chart")}
                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200",
                    current === "chart" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                <ChartBar className="w-3.5 h-3.5" weight="duotone" />Charts
            </button>
            <button onClick={() => onChange(section, "table")}
                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200",
                    current === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                <Rows className="w-3.5 h-3.5" weight="duotone" />Table
            </button>
        </div>
    );
}

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
            {label}
            <button onClick={onRemove} className="hover:text-indigo-900 dark:hover:text-indigo-100 ml-0.5">
                <X className="w-3 h-3" />
            </button>
        </span>
    );
}

export function StatusPill({ status }: { status: string }) {
    const styles: Record<string, string> = {
        "delivered": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "completed": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "accepted": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "approved": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "paid": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "valid": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "passed": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "in-progress": "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
        "submitted": "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
        "pending-response": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
        "pending-approval": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
        "pending": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
        "expiring": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
        "supplier-responded": "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
        "open": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "delayed": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "overdue": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "missing": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "expired": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "rejected": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "draft": "bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300",
    };
    return (
        <span className={cn(
            "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
            styles[status] || "bg-muted text-muted-foreground"
        )}>
            {status.replace(/-/g, " ")}
        </span>
    );
}

export function SeverityBadge({ severity }: { severity: string }) {
    const styles: Record<string, string> = {
        CRITICAL: "bg-red-600 text-white",
        MAJOR: "bg-amber-500 text-white",
        MINOR: "bg-blue-500 text-white",
    };
    return (
        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", styles[severity] || "bg-muted text-muted-foreground")}>
            {severity}
        </span>
    );
}

export function AnalyticsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                <Skeleton className="h-80 rounded-2xl" />
                <Skeleton className="h-80 rounded-2xl" />
            </div>
        </div>
    );
}
