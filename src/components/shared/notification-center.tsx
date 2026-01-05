"use client";

/**
 * Notification Center Component
 * Bell icon with dropdown showing recent notifications
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
    Bell,
    BellRinging,
    Warning,
    ArrowsClockwise,
    Check,
    Info,
} from "@phosphor-icons/react";

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: Date | string;
    readAt?: Date | string | null;
    purchaseOrderId?: string;
}

interface NotificationCenterProps {
    userId: string;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.readAt).length;

    const fetchNotifications = async () => {
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
    };

    const markAsRead = async (ids: string[]) => {
        try {
            await fetch("/api/notifications/mark-read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationIds: ids }),
            });
            setNotifications(prev =>
                prev.map(n =>
                    ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n
                )
            );
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [userId]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "ESCALATION":
                return <Warning size={16} className="text-red-500" weight="fill" />;
            case "CHASE_REMINDER":
                return <ArrowsClockwise size={16} className="text-amber-500" />;
            case "CONFLICT":
                return <Warning size={16} className="text-amber-500" />;
            default:
                return <Info size={16} className="text-blue-500" />;
        }
    };

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
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => markAsRead(notifications.filter(n => !n.readAt).map(n => n.id))}
                        >
                            <Check size={14} className="mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {isLoading && notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell size={32} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">
                                No notifications yet
                            </p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={cn(
                                    "flex gap-3 border-b p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                                    !notification.readAt && "bg-primary/5"
                                )}
                                onClick={() => {
                                    if (!notification.readAt) {
                                        markAsRead([notification.id]);
                                    }
                                    if (notification.purchaseOrderId) {
                                        setIsOpen(false);
                                    }
                                }}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-sm",
                                        !notification.readAt && "font-medium"
                                    )}>
                                        {notification.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                                {!notification.readAt && (
                                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                                )}
                            </div>
                        ))
                    )}
                </div>
                <div className="border-t p-2">
                    <Link href="/dashboard/settings/notifications">
                        <Button variant="ghost" className="w-full text-sm">
                            View all notifications
                        </Button>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
