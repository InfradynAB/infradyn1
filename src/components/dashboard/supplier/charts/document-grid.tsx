"use client";

import { cn } from "@/lib/utils";
import { FileText, UploadSimple, WarningCircle, CheckCircle, Clock } from "@phosphor-icons/react";

export interface DocumentStatusItem {
    id: string;
    type: string;
    status: "valid" | "expiring" | "missing" | "expired";
    expiryDate?: string;
    uploadDate?: string;
}

const STATUS_CONFIG = {
    valid: { label: "Valid", icon: CheckCircle, border: "border-emerald-200 dark:border-emerald-800/40", bg: "bg-emerald-50/50 dark:bg-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    expiring: { label: "Expiring Soon", icon: Clock, border: "border-amber-200 dark:border-amber-800/40", bg: "bg-amber-50/50 dark:bg-amber-500/5", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    expired: { label: "Expired", icon: WarningCircle, border: "border-red-200 dark:border-red-800/40", bg: "bg-red-50/50 dark:bg-red-500/5", text: "text-red-600 dark:text-red-400", badge: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400" },
    missing: { label: "Missing", icon: UploadSimple, border: "border-red-200 dark:border-red-800/40", bg: "bg-red-50/50 dark:bg-red-500/5", text: "text-red-600 dark:text-red-400", badge: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400" },
};

export function DocumentGrid({ documents }: { documents: DocumentStatusItem[] }) {
    if (documents.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                No document requirements
            </div>
        );
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {documents.map(doc => {
                const config = STATUS_CONFIG[doc.status];
                const Icon = config.icon;
                return (
                    <div
                        key={doc.id}
                        className={cn(
                            "rounded-xl border p-4 transition-colors",
                            config.border,
                            config.bg,
                        )}
                    >
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <FileText className={cn("w-4 h-4 shrink-0", config.text)} weight="duotone" />
                                <span className="text-xs font-semibold leading-tight">{doc.type}</span>
                            </div>
                            <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider whitespace-nowrap", config.badge)}>
                                {config.label}
                            </span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-muted-foreground">
                            {doc.expiryDate && (
                                <p>Expires: {new Date(doc.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                            )}
                            {doc.uploadDate && (
                                <p>Uploaded: {new Date(doc.uploadDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                            )}
                            {doc.status === "missing" && (
                                <p className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <Icon className="w-3 h-3" weight="bold" />
                                    Upload required
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
