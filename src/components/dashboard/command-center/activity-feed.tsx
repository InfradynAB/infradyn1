"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    FileText,
    Receipt,
    Warning,
    Truck,
    Package,
    Clock,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface ActivityItem {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    icon: string;
    href?: string;
}

interface ActivityFeedProps {
    activities: ActivityItem[];
    className?: string;
    maxHeight?: string;
}

const iconMap: Record<string, React.ElementType> = {
    "file-text": FileText,
    receipt: Receipt,
    "alert-triangle": Warning,
    truck: Truck,
    package: Package,
    default: Clock,
};

const typeColors: Record<string, string> = {
    po_created: "bg-emerald-500/10 text-emerald-500",
    invoice_received: "bg-blue-500/10 text-blue-500",
    ncr_raised: "bg-red-500/10 text-red-500",
    shipment_update: "bg-purple-500/10 text-purple-500",
    default: "bg-muted text-muted-foreground",
};

function ActivityItemComponent({ activity }: { activity: ActivityItem }) {
    const Icon = iconMap[activity.icon] || iconMap.default;
    const colorClass = typeColors[activity.type] || typeColors.default;

    const content = (
        <div
            className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-colors",
                activity.href && "hover:bg-muted/50 cursor-pointer"
            )}
        >
            <div className={cn("flex-shrink-0 p-2 rounded-lg", colorClass)}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                    {activity.description}
                </p>
            </div>
            <div className="flex-shrink-0">
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
            </div>
        </div>
    );

    if (activity.href) {
        return <Link href={activity.href}>{content}</Link>;
    }

    return content;
}

export function ActivityFeed({
    activities,
    className,
    maxHeight = "400px",
}: ActivityFeedProps) {
    if (activities.length === 0) {
        return (
            <Card className={cn("border-dashed", className)}>
                <CardContent className="py-8 text-center">
                    <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                        Activity will appear here as you work
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <ScrollArea className="pr-4" style={{ maxHeight }}>
                    <div className="space-y-1">
                        {activities.map((activity) => (
                            <ActivityItemComponent key={activity.id} activity={activity} />
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
