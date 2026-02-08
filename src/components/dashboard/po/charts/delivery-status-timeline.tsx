"use client";

import { cn } from "@/lib/utils";

export interface DeliveryEvent {
  id: string;
  label: string;
  date: string | null;
  status: "completed" | "in-progress" | "pending" | "delayed";
}

export interface DeliveryTimelineRow {
  shipmentId: string;
  trackingNumber: string;
  boqDescription: string;
  events: DeliveryEvent[];
}

const statusColor: Record<DeliveryEvent["status"], string> = {
  completed: "bg-emerald-500",
  "in-progress": "bg-blue-500 animate-pulse",
  pending: "bg-gray-300 dark:bg-gray-600",
  delayed: "bg-red-500",
};

const statusLine: Record<DeliveryEvent["status"], string> = {
  completed: "bg-emerald-400",
  "in-progress": "bg-blue-400",
  pending: "bg-gray-200 dark:bg-gray-700",
  delayed: "bg-red-400",
};

const statusText: Record<DeliveryEvent["status"], string> = {
  completed: "text-emerald-600 dark:text-emerald-400",
  "in-progress": "text-blue-600 dark:text-blue-400",
  pending: "text-muted-foreground",
  delayed: "text-red-600 dark:text-red-400",
};

export function DeliveryStatusTimeline({
  rows,
}: {
  rows: DeliveryTimelineRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No shipments to display.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div
          key={row.shipmentId}
          className="rounded-xl border bg-card/50 p-4 space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                {row.trackingNumber || row.shipmentId.slice(0, 8)}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-sm font-medium truncate max-w-[260px]">
                {row.boqDescription}
              </span>
            </div>
            {/* Overall row status */}
            {row.events.some((e) => e.status === "delayed") && (
              <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                Delayed
              </span>
            )}
          </div>

          {/* Timeline stages */}
          <div className="flex items-center gap-0">
            {row.events.map((event, idx) => (
              <div key={event.id} className="flex items-center flex-1 last:flex-initial">
                {/* Node */}
                <div className="flex flex-col items-center gap-1 min-w-[80px]">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full border-2 border-background shadow-sm",
                      statusColor[event.status]
                    )}
                  />
                  <span className="text-[10px] font-medium">{event.label}</span>
                  <span className={cn("text-[10px]", statusText[event.status])}>
                    {event.date
                      ? new Date(event.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "—"}
                  </span>
                </div>
                {/* Connector line */}
                {idx < row.events.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 rounded-full mx-1",
                      statusLine[event.status]
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
