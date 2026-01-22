"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SupplierRating {
    name: string;
    count: number;
}

interface NCRSupplierHeatmapProps {
    supplierRatings: SupplierRating[];
    loading?: boolean;
}

export function NCRSupplierHeatmap({ supplierRatings, loading }: NCRSupplierHeatmapProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Supplier Quality</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse space-y-2">
                            <div className="h-4 bg-muted rounded w-32" />
                            <div className="h-2 bg-muted rounded" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!supplierRatings || supplierRatings.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Supplier Quality</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8 text-muted-foreground">
                    <p>No supplier NCR data available</p>
                </CardContent>
            </Card>
        );
    }

    // Find max for scaling
    const maxCount = Math.max(...supplierRatings.map(s => s.count));

    // Determine color based on NCR count
    const getColor = (count: number) => {
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        if (percentage > 66) return "bg-red-500";
        if (percentage > 33) return "bg-orange-500";
        return "bg-green-500";
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                    <span>Supplier Quality</span>
                    <span className="text-sm font-normal text-muted-foreground">
                        NCRs per supplier
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {supplierRatings.slice(0, 8).map((supplier, index) => (
                        <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium truncate max-w-[200px]">
                                    {supplier.name}
                                </span>
                                <span className={`font-semibold ${supplier.count > maxCount * 0.66 ? "text-red-500" :
                                        supplier.count > maxCount * 0.33 ? "text-orange-500" :
                                            "text-green-500"
                                    }`}>
                                    {supplier.count} NCR{supplier.count !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getColor(supplier.count)} transition-all duration-500`}
                                    style={{ width: `${maxCount > 0 ? (supplier.count / maxCount) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {supplierRatings.length > 8 && (
                    <p className="text-xs text-muted-foreground text-center mt-4">
                        +{supplierRatings.length - 8} more suppliers
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
