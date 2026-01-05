"use client";

/**
 * Email Inbox Component
 * Displays recent email ingestions with status and matched info
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
    EnvelopeSimple,
    CheckCircle,
    Clock,
    XCircle,
    Paperclip,
    ArrowsClockwise,
    TruckIcon,
    FileText,
} from "@phosphor-icons/react";

export interface EmailIngestionItem {
    id: string;
    fromEmail: string;
    subject: string;
    status: string;
    matchedSupplierName?: string;
    matchedPoNumber?: string;
    attachmentCount: number;
    createdAt: string;
    processedAt?: string;
}

interface EmailInboxProps {
    emails: EmailIngestionItem[];
    onRefresh?: () => void;
    isLoading?: boolean;
    className?: string;
}

function getStatusConfig(status: string) {
    switch (status) {
        case "PROCESSED":
            return { icon: CheckCircle, color: "text-green-600 bg-green-100", label: "Processed" };
        case "PENDING":
        case "PROCESSING":
            return { icon: Clock, color: "text-amber-600 bg-amber-100", label: status === "PROCESSING" ? "Processing" : "Pending" };
        case "FAILED":
            return { icon: XCircle, color: "text-red-600 bg-red-100", label: "Failed" };
        case "IGNORED":
            return { icon: XCircle, color: "text-gray-600 bg-gray-100", label: "Ignored" };
        default:
            return { icon: Clock, color: "text-gray-600 bg-gray-100", label: status };
    }
}

export function EmailInbox({ emails, onRefresh, isLoading, className }: EmailInboxProps) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <EnvelopeSimple size={20} />
                        Email Inbox
                    </CardTitle>
                    <CardDescription>
                        Recent emails received via ingestion
                    </CardDescription>
                </div>
                {onRefresh && (
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                        <ArrowsClockwise size={16} className={cn(isLoading && "animate-spin")} />
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {emails.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <EnvelopeSimple size={40} className="mx-auto mb-3 opacity-50" />
                        <p>No emails received yet</p>
                        <p className="text-sm">
                            Forward documents to your ingestion email address
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {emails.map((email) => {
                            const statusConfig = getStatusConfig(email.status);
                            const StatusIcon = statusConfig.icon;

                            return (
                                <div
                                    key={email.id}
                                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        statusConfig.color
                                    )}>
                                        <StatusIcon size={16} weight="fill" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm truncate">
                                                {email.subject || "(No subject)"}
                                            </p>
                                            {email.attachmentCount > 0 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    <Paperclip size={10} className="mr-1" />
                                                    {email.attachmentCount}
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-xs text-muted-foreground truncate">
                                            From: {email.fromEmail}
                                        </p>

                                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                                            {email.matchedSupplierName && (
                                                <span className="flex items-center gap-1 text-primary">
                                                    <TruckIcon size={12} />
                                                    {email.matchedSupplierName}
                                                </span>
                                            )}
                                            {email.matchedPoNumber && (
                                                <span className="flex items-center gap-1 text-primary">
                                                    <FileText size={12} />
                                                    {email.matchedPoNumber}
                                                </span>
                                            )}
                                            {!email.matchedSupplierName && !email.matchedPoNumber && (
                                                <span className="text-muted-foreground italic">
                                                    No matches found
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                                        <p>{formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}</p>
                                        <Badge variant="outline" className={cn("mt-1", statusConfig.color)}>
                                            {statusConfig.label}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Compact email stats for dashboard widgets
 */
export function EmailStats({
    total,
    pending,
    processed
}: {
    total: number;
    pending: number;
    processed: number;
}) {
    return (
        <div className="grid grid-cols-3 gap-4 text-center">
            <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-green-600">{processed}</p>
                <p className="text-xs text-muted-foreground">Processed</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-amber-600">{pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
            </div>
        </div>
    );
}
