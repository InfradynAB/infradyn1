/** Time-based delivery status — never percentage-based */
export type DeliveryStatus = "ON_TRACK" | "AT_RISK" | "LATE" | "NO_ROS";

const BUFFER_DAYS = 7;

/**
 * Compute time-driven delivery status for a single BOQ item.
 * Rules (in priority order):
 *  1. No ROS date set                       → NO_ROS
 *  2. ROS date exceeded, not fully delivered → LATE
 *  3. ROS date within buffer window          → AT_RISK
 *  4. Otherwise                              → ON_TRACK
 */
export function computeStatus(
    rosDate: Date | null,
    orderedQty: number,
    deliveredQty: number,
    today: Date = new Date(),
): { status: DeliveryStatus; lateDays: number } {
    if (!rosDate) return { status: "NO_ROS", lateDays: 0 };

    const rosDiff = Math.floor(
        (today.getTime() - rosDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (rosDiff > 0 && deliveredQty < orderedQty) {
        return { status: "LATE", lateDays: rosDiff };
    }

    const daysUntilRos = -rosDiff;
    if (daysUntilRos <= BUFFER_DAYS && deliveredQty < orderedQty) {
        return { status: "AT_RISK", lateDays: 0 };
    }

    return { status: "ON_TRACK", lateDays: 0 };
}

/** Roll up multiple item statuses → the worst wins */
export function worstStatus(statuses: DeliveryStatus[]): DeliveryStatus {
    if (statuses.includes("LATE")) return "LATE";
    if (statuses.includes("AT_RISK")) return "AT_RISK";
    if (statuses.every((s) => s === "NO_ROS")) return "NO_ROS";
    return "ON_TRACK";
}
