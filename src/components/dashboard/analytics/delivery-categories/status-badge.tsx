import type { DeliveryStatus } from "@/lib/actions/delivery-analytics";

const CONFIG: Record<
    DeliveryStatus,
    { label: string; className: string; dot: string }
> = {
    ON_TRACK: {
        label: "On Track",
        className: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
        dot: "bg-emerald-400",
    },
    AT_RISK: {
        label: "At Risk",
        className: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
        dot: "bg-amber-400",
    },
    LATE: {
        label: "Late",
        className: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
        dot: "bg-red-400",
    },
    NO_ROS: {
        label: "No ROS Date",
        className: "bg-muted text-muted-foreground ring-1 ring-border",
        dot: "bg-muted-foreground",
    },
};

interface Props {
    status: DeliveryStatus;
    lateDays?: number;
    /** Apply compact sizing for table cells */
    compact?: boolean;
}

export function StatusBadge({ status, lateDays, compact = false }: Props) {
    const cfg = CONFIG[status];
    const showDays = status === "LATE" && lateDays && lateDays > 0;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${cfg.className} ${compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
                }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
            {showDays && (
                <span className="opacity-70">· {lateDays}d</span>
            )}
        </span>
    );
}
