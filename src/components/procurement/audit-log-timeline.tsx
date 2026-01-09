import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPOAuditLogs } from "@/lib/actions/audit-log";
import { formatDistanceToNow } from "date-fns";
import {
    Check,
    X,
    Receipt,
    ArrowsClockwise,
    CurrencyDollar,
    Warning,
    ClockCounterClockwise,
    User,
} from "@phosphor-icons/react/dist/ssr";

interface AuditLogTimelineProps {
    purchaseOrderId: string;
}

const actionConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    CO_APPROVED: { icon: <Check className="h-4 w-4" />, color: "bg-green-100 text-green-700", label: "Change Order Approved" },
    CO_REJECTED: { icon: <X className="h-4 w-4" />, color: "bg-red-100 text-red-700", label: "Change Order Rejected" },
    CO_SUBMITTED: { icon: <ArrowsClockwise className="h-4 w-4" />, color: "bg-blue-100 text-blue-700", label: "Change Order Submitted" },
    INVOICE_CREATED: { icon: <Receipt className="h-4 w-4" />, color: "bg-amber-100 text-amber-700", label: "Invoice Created" },
    PAYMENT_RECORDED: { icon: <CurrencyDollar className="h-4 w-4" />, color: "bg-emerald-100 text-emerald-700", label: "Payment Recorded" },
    INVOICE_ESCALATION: { icon: <Warning className="h-4 w-4" />, color: "bg-orange-100 text-orange-700", label: "Invoice Escalated" },
    CO_ESCALATION: { icon: <Warning className="h-4 w-4" />, color: "bg-orange-100 text-orange-700", label: "CO Escalated" },
    PO_CREATED: { icon: <Receipt className="h-4 w-4" />, color: "bg-blue-100 text-blue-700", label: "PO Created" },
    PO_UPDATED: { icon: <ArrowsClockwise className="h-4 w-4" />, color: "bg-gray-100 text-gray-700", label: "PO Updated" },
    PROGRESS_LOGGED: { icon: <ClockCounterClockwise className="h-4 w-4" />, color: "bg-purple-100 text-purple-700", label: "Progress Logged" },
};

export async function AuditLogTimeline({ purchaseOrderId }: AuditLogTimelineProps) {
    const result = await getPOAuditLogs(purchaseOrderId);

    if (!result.success || !result.data || result.data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClockCounterClockwise className="h-5 w-5" />
                        Activity Log
                    </CardTitle>
                    <CardDescription>
                        No activity recorded yet
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const logs = result.data;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ClockCounterClockwise className="h-5 w-5" />
                    Activity Log
                </CardTitle>
                <CardDescription>
                    {logs.length} event{logs.length !== 1 ? "s" : ""} recorded
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

                    <div className="space-y-4">
                        {logs.map((log, index) => {
                            const config = actionConfig[log.action] || {
                                icon: <ArrowsClockwise className="h-4 w-4" />,
                                color: "bg-gray-100 text-gray-700",
                                label: log.action,
                            };

                            return (
                                <div key={log.id} className="relative pl-10">
                                    {/* Icon */}
                                    <div className={`absolute left-0 p-2 rounded-full ${config.color}`}>
                                        {config.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="bg-muted/30 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-sm">
                                                {config.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>

                                        {/* User */}
                                        {log.userName && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                                <User className="h-3 w-3" />
                                                {log.userName}
                                            </div>
                                        )}

                                        {/* Metadata details */}
                                        {log.metadata && (
                                            <div className="text-xs space-y-1">
                                                {log.action === "CO_APPROVED" && (
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="bg-green-50 text-green-700">
                                                            {Number(log.metadata.amountDelta) >= 0 ? "+" : ""}
                                                            ${Number(log.metadata.amountDelta).toLocaleString()}
                                                        </Badge>
                                                        <span className="text-muted-foreground">
                                                            New Total: ${Number(log.metadata.newTotal).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {log.action === "CO_REJECTED" && log.metadata.rejectionReason && (
                                                    <p className="text-muted-foreground italic">
                                                        "{log.metadata.rejectionReason}"
                                                    </p>
                                                )}
                                                {log.action === "PAYMENT_RECORDED" && (
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                                                            ${Number(log.metadata.amount).toLocaleString()} paid
                                                        </Badge>
                                                        {log.metadata.reference && (
                                                            <span className="text-muted-foreground">
                                                                Ref: {log.metadata.reference}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {log.action === "INVOICE_CREATED" && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono">
                                                            {log.metadata.invoiceNumber}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            ${Number(log.metadata.amount).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {(log.action === "INVOICE_ESCALATION" || log.action === "CO_ESCALATION") && (
                                                    <div className="text-orange-600">
                                                        Level {log.metadata.level} escalation • {log.metadata.daysOverdue || log.metadata.daysPending} days
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
