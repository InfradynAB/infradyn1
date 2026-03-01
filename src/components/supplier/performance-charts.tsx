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

        // Padding for labels
        const labelRadius = radius + 15;

        return (
            <div className="flex flex-col items-center gap-4">
                <div className="relative" style={{ width: size + 80, height: size + 40 }}>
                    <svg width={size + 80} height={size + 40} className="overflow-visible">
                        <g transform={`translate(${center + 40}, ${center + 20}) rotate(-90)`}>
                            <circle
                                cx={0}
                                cy={0}
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
                                        cx={0}
                                        cy={0}
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
                        </g>

                        {/* Annotations */}
                        {segments.map((seg, i) => {
                            const segLen = (seg.value / total) * circumference;
                            const offset = offsets[i];
                            const midAngle = ((offset + segLen / 2) / circumference) * 2 * Math.PI - Math.PI / 2;
                            const x = (center + 40) + labelRadius * Math.cos(midAngle);
                            const y = (center + 20) + labelRadius * Math.sin(midAngle);

                            // Only show labels for segments with values
                            if (seg.value === 0) return null;

                            const isRightSide = x > (center + 40);

                            return (
                                <g key={`label-${i}`} className="transition-opacity duration-300">
                                    <text
                                        x={x}
                                        y={y}
                                        textAnchor={isRightSide ? "start" : "end"}
                                        className="fill-foreground text-[10px] font-bold"
                                        dominantBaseline="middle"
                                    >
                                        {seg.value}
                                    </text>
                                    <text
                                        x={x}
                                        y={y + 10}
                                        textAnchor={isRightSide ? "start" : "end"}
                                        className="fill-muted-foreground text-[8px] font-medium"
                                        dominantBaseline="middle"
                                    >
                                        {seg.label}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                    <div
                        className="absolute flex flex-col items-center justify-center text-center"
                        style={{
                            left: 40,
                            top: 20,
                            width: size,
                            height: size
                        }}
                    >
                        <span className="text-2xl font-bold text-foreground tabular-nums">{score}%</span>
                        {label && <span className="text-[10px] text-muted-foreground font-medium leading-tight max-w-[80px]">{label}</span>}
                    </div>
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
