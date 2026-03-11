"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
    Bell,
    BellRinging,
    Warning,
    ArrowsClockwise,
    Check,
    Info,
    Receipt,
    Clock,
    FileText,
    CheckCircle,
    X,
} from "@phosphor-icons/react";

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: Date | string;
    readAt?: Date | string | null;
    linkUrl?: string | null;
    source?: "db" | "live";
}

interface NotificationCenterProps {
    userId: string;
}

// ── Icon + colour config per notification type ────────────────────────────────

interface TypeConfig {
    icon: React.ReactNode;
    dot: string;    // Tailwind bg colour for the dot
    badge: string;  // Tailwind bg + text colour for the type pill
}

function getTypeConfig(type: string): TypeConfig {
    switch (type) {
        case "ESCALATION":
            return {
                icon: <Warning size={16} weight="fill" className="text-red-500" />,
                dot: "bg-red-500",
                badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
            };
        case "NCR_CRITICAL":
            return {
                icon: <Warning size={16} weight="fill" className="text-red-500" />,
                dot: "bg-red-500",
                badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
            };
        case "OVERDUE_PAYMENT":
            return {
                icon: <Receipt size={16} weight="fill" className="text-red-500" />,
                dot: "bg-red-500",
                badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
            };
        case "NCR_SLA":
        case "NCR_SLA_ESCALATION":
        case "NCR_SLA_CRITICAL":
            return {
                icon: <Clock size={16} weight="fill" className="text-red-500" />,
                dot: "bg-red-500",
                badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
            };
        case "CONFLICT":
        case "URGENT":
        case "WARNING":
        case "OVERDUE_MILESTONE":
            return {
                icon: <Warning size={16} weight="bold" className="text-amber-500" />,
                dot: "bg-amber-500",
                badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
            };
        case "PENDING_INVOICE":
        case "PAYMENT_ESCALATION":
        case "PAYMENT_REMINDER":
            return {
                icon: <Receipt size={16} className="text-amber-500" />,
                dot: "bg-amber-500",
                badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
            };
        case "PENDING_CO":
        case "CO_ESCALATION":
        case "CO_REMINDER":
        case "CHASE_REMINDER":
            return {
                icon: <ArrowsClockwise size={16} className="text-amber-500" />,
                dot: "bg-amber-500",
                badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
            };
        case "DRAFT_PO":
        case "VALIDATION_REMINDER":
            return {
                icon: <FileText size={16} className="text-blue-500" />,
                dot: "bg-blue-500",
                badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
            };
        case "NCR_SLA_REMINDER":
            return {
                icon: <Clock size={16} className="text-blue-500" />,
                dot: "bg-blue-500",
                badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
            };
        default:
            return {
                icon: <Info size={16} className="text-blue-500" />,
                dot: "bg-blue-500",
                badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
            };
    }
}

function typeLabel(type: string): string {
    const map: Record<string, string> = {
        ESCALATION: "Escalation",
        NCR_CRITICAL: "Critical NCR",
        NCR_SLA: "SLA Breach",
        NCR_SLA_ESCALATION: "NCR Escalation",
        NCR_SLA_CRITICAL: "Critical NCR",
        NCR_SLA_REMINDER: "NCR Reminder",
        OVERDUE_PAYMENT: "Overdue",
        OVERDUE_MILESTONE: "Overdue",
        PENDING_INVOICE: "Invoice",
        PENDING_CO: "Change Order",
        DRAFT_PO: "Draft PO",
        PAYMENT_ESCALATION: "Payment",
        PAYMENT_REMINDER: "Payment",
        CO_ESCALATION: "Change Order",
        CO_REMINDER: "Change Order",
        CHASE_REMINDER: "Reminder",
        CONFLICT: "Conflict",
        URGENT: "Urgent",
        WARNING: "Warning",
        VALIDATION_REMINDER: "Validation",
        INFO: "Info",
    };
    return map[type] ?? "Notification";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationCenter({ userId }: NotificationCenterProps) {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Live items are identified by id starting with "live_" — they can't be marked read via DB
    const isLive = (n: NotificationItem) => n.source === "live" || n.id.startsWith("live_");

    // Unread count: DB unread + all live alerts
    const unreadCount = notifications.filter((n) => !n.readAt).length;

    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/notifications?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    const markAsRead = async (ids: string[]) => {
        // Only DB notifications can be marked read
        const dbIds = ids.filter((id) => !id.startsWith("live_"));
        if (dbIds.length === 0) return;
        try {
            await fetch("/api/notifications/mark-read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationIds: dbIds }),
            });
            setNotifications((prev) =>
                prev.map((n) =>
                    dbIds.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n
                )
            );
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleNotificationClick = (notification: NotificationItem) => {
        // Mark DB notifications as read
        if (!notification.readAt && !isLive(notification)) {
            markAsRead([notification.id]);
        }
        // Navigate if there's a link
        if (notification.linkUrl) {
            setIsOpen(false);
            router.push(notification.linkUrl);
        }
    };

    const handleMarkAllRead = () => {
        const unreadDbIds = notifications
            .filter((n) => !n.readAt && !isLive(n))
            .map((n) => n.id);
        if (unreadDbIds.length > 0) {
            markAsRead(unreadDbIds);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="Notifications"
                >
                    {unreadCount > 0 ? (
                        <BellRinging size={20} weight="fill" className="text-primary" />
                    ) : (
                        <Bell size={20} />
                    )}
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[380px] p-0" align="end">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold">Notifications</h4>
                        {unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground"
                                onClick={handleMarkAllRead}
                            >
                                <Check size={12} className="mr-1" />
                                Mark all read
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => setIsOpen(false)}
                        >
                            <X size={14} />
                        </Button>
                    </div>
                </div>

                {/* List */}
                <div className="max-h-[228px] overflow-y-auto scroll-smooth"
                    style={{ scrollbarWidth: "thin" }}
                >
                    {isLoading && notifications.length === 0 ? (
                        <div className="space-y-2 p-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/40" />
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
                                <CheckCircle size={24} className="opacity-50" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">All caught up</p>
                                <p className="text-xs opacity-70">No pending alerts or notifications</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/60">
                            {notifications.map((item) => {
                                const config = getTypeConfig(item.type);
                                const isUnread = !item.readAt;
                                const hasLink = !!item.linkUrl;

                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "flex gap-3 px-4 py-3 transition-colors",
                                            isUnread && "bg-primary/4",
                                            hasLink && "cursor-pointer hover:bg-muted/50",
                                        )}
                                        onClick={() => handleNotificationClick(item)}
                                        role={hasLink ? "button" : undefined}
                                        tabIndex={hasLink ? 0 : undefined}
                                        onKeyDown={(e) => {
                                            if (hasLink && (e.key === "Enter" || e.key === " ")) {
                                                handleNotificationClick(item);
                                            }
                                        }}
                                    >
                                        {/* Icon */}
                                        <div className="mt-0.5 shrink-0">
                                            {config.icon}
                                        </div>

                                        {/* Content */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-sm leading-snug",
                                                    isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                                                )}>
                                                    {item.title}
                                                </p>
                                                {/* Type pill */}
                                                <span className={cn(
                                                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                                    config.badge,
                                                )}>
                                                    {typeLabel(item.type)}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                                {item.message}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="text-[10px] text-muted-foreground/70">
                                                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                                </span>
                                                {hasLink && (
                                                    <span className="text-[10px] font-medium text-primary/80">
                                                        View →
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Unread dot */}
                                        {isUnread && (
                                            <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", config.dot)} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="border-t px-4 py-2.5 text-center">
                        <button
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => {
                                setIsOpen(false);
                                router.push("/dashboard/procurement");
                            }}
                        >
                            View all activity in Procurement →
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
