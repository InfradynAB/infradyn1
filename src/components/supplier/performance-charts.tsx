"use client";

interface BarChartProps {
    data: { label: string; value: number; color: string }[];
    height?: number;
}

export function PerformanceBarChart({ data, height = 180 }: BarChartProps) {
    const maxVal = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="flex items-end justify-between gap-3 px-2" style={{ height }}>
            {data.map((item, i) => {
                const barH = Math.max(4, (item.value / maxVal) * (height - 30));
                return (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1">
                        <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                            {item.value}%
                        </span>
                        <div
                            className="w-full rounded-t-md transition-all duration-700 ease-out min-w-5 max-w-9 mx-auto"
                            style={{
                                height: barH,
                                background: `linear-gradient(to top, ${item.color}, ${item.color}dd)`,
                            }}
                        />
                        <span className="text-[10px] font-medium text-muted-foreground truncate max-w-full">
                            {item.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

interface DonutChartProps {
    score: number;
    size?: number;
    label?: string;
    segments?: { value: number; color: string; label: string }[];
}

export function PerformanceDonut({ score, size = 140, label, segments }: DonutChartProps) {
    const center = size / 2;
    const strokeWidth = 14;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    if (segments && segments.length > 0) {
        const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
        // Pre-compute cumulative offsets
        const offsets = segments.reduce<number[]>((acc, seg, i) => {
            if (i === 0) return [0];
            const prevLen = (segments[i - 1].value / total) * circumference;
            return [...acc, acc[acc.length - 1] + prevLen];
        }, [0]);

        return (
            <div className="flex flex-col items-center gap-4">
                <div className="relative" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="-rotate-90">
                        <circle
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={strokeWidth}
                            className="text-muted/30"
                        />
                        {segments.map((seg, i) => {
                            const segLen = (seg.value / total) * circumference;
                            const offset = offsets[i];
                            return (
                                <circle
                                    key={i}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="none"
                                    stroke={seg.color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${segLen} ${circumference - segLen}`}
                                    strokeDashoffset={-offset}
                                    strokeLinecap="round"
                                    className="transition-all duration-700"
                                />
                            );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">{score}%</span>
                        {label && <span className="text-[10px] text-muted-foreground font-medium">{label}</span>}
                    </div>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                    {segments.map((seg, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
                            <span className="text-[11px] text-muted-foreground">{seg.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const dashOffset = ((100 - score) / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/30"
                />
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{score}%</span>
                {label && <span className="text-[10px] text-muted-foreground font-medium">{label}</span>}
            </div>
        </div>
    );
}
