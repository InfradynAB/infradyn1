"use client";

import { cn } from "@/lib/utils";

export interface FinancialFlowData {
  poValue: number;
  deliveredValue: number;
  invoicedValue: number;
  approvedValue: number;
  paidValue: number;
  retentionHeld: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

interface Stage {
  label: string;
  value: number;
  color: string;
  bg: string;
}

export function FinancialFlowChart({ data }: { data: FinancialFlowData }) {
  const stages: Stage[] = [
    {
      label: "PO Value",
      value: data.poValue,
      color: "text-slate-700 dark:text-slate-300",
      bg: "bg-slate-100 dark:bg-slate-800",
    },
    {
      label: "Delivered",
      value: data.deliveredValue,
      color: "text-blue-700 dark:text-blue-300",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Invoiced",
      value: data.invoicedValue,
      color: "text-violet-700 dark:text-violet-300",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      label: "Approved",
      value: data.approvedValue,
      color: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Paid",
      value: data.paidValue,
      color: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];

  const maxVal = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-6">
      {/* Sankey-style flow bars */}
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const widthPct = Math.max((stage.value / maxVal) * 100, 8);
          return (
            <div key={stage.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", stage.color)}>
                  {stage.label}
                </span>
                <span className="tabular-nums font-semibold text-sm">
                  {fmt(stage.value)}
                </span>
              </div>
              <div className="relative h-8 w-full rounded-lg bg-muted/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-lg transition-all duration-700 ease-out flex items-center px-3",
                    stage.bg
                  )}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className={cn("text-[10px] font-medium", stage.color)}>
                    {fmtFull(stage.value)}
                  </span>
                </div>
                {/* Arrow connector */}
                {idx < stages.length - 1 && (
                  <div className="absolute -bottom-2.5 left-1/4 text-muted-foreground/30">
                    <svg width="12" height="10" viewBox="0 0 12 10">
                      <path d="M6 10L0 0h12z" fill="currentColor" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Retention callout */}
      {data.retentionHeld > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-3">
          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">R</span>
          </div>
          <div>
            <div className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Retention Held
            </div>
            <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              {fmtFull(data.retentionHeld)}
            </div>
          </div>
        </div>
      )}

      {/* Conversion funnel summary */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
        <div className="rounded-lg bg-muted/30 p-2">
          <div className="font-semibold text-xs">
            {maxVal > 0
              ? Math.round((data.deliveredValue / data.poValue) * 100)
              : 0}
            %
          </div>
          <div className="text-muted-foreground">Delivered</div>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <div className="font-semibold text-xs">
            {maxVal > 0
              ? Math.round((data.invoicedValue / data.poValue) * 100)
              : 0}
            %
          </div>
          <div className="text-muted-foreground">Invoiced</div>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <div className="font-semibold text-xs">
            {maxVal > 0
              ? Math.round((data.approvedValue / data.poValue) * 100)
              : 0}
            %
          </div>
          <div className="text-muted-foreground">Approved</div>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <div className="font-semibold text-xs">
            {maxVal > 0
              ? Math.round((data.paidValue / data.poValue) * 100)
              : 0}
            %
          </div>
          <div className="text-muted-foreground">Paid</div>
        </div>
      </div>
    </div>
  );
}
