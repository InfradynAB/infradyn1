"use client";

/**
 * Phase 6: Multi-Provider Logistics
 * 
 * Provider Selector component that allows users to choose
 * between different logistics providers (Maersk, DHL Express, DHL Freight).
 */

import { cn } from "@/lib/utils";
import { Ship, Plane, Truck, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type LogisticsProvider = "DHL_EXPRESS" | "DHL_FREIGHT" | "MAERSK" | "OTHER";

interface ProviderOption {
    id: LogisticsProvider;
    name: string;
    description: string;
    icon: React.ReactNode;
    trackingFormat: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

const providers: ProviderOption[] = [
    {
        id: "MAERSK",
        name: "Maersk Ocean",
        description: "Container shipping",
        icon: <Ship className="h-8 w-8" />,
        trackingFormat: "Container No. (e.g., MSKU1234567)",
        color: "text-blue-600",
        bgColor: "bg-blue-50 hover:bg-blue-100",
        borderColor: "border-blue-500",
    },
    {
        id: "DHL_EXPRESS",
        name: "DHL Express",
        description: "Air freight (1-3 days)",
        icon: <Plane className="h-8 w-8" />,
        trackingFormat: "10-digit waybill",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 hover:bg-yellow-100",
        borderColor: "border-yellow-500",
    },
    {
        id: "DHL_FREIGHT",
        name: "DHL Freight",
        description: "Ground shipping",
        icon: <Truck className="h-8 w-8" />,
        trackingFormat: "Alphanumeric waybill",
        color: "text-red-600",
        bgColor: "bg-red-50 hover:bg-red-100",
        borderColor: "border-red-500",
    },
    {
        id: "OTHER",
        name: "Other",
        description: "Any tracking number",
        icon: <Package className="h-8 w-8" />,
        trackingFormat: "Any tracking number",
        color: "text-gray-600",
        bgColor: "bg-gray-50 hover:bg-gray-100",
        borderColor: "border-gray-500",
    },
];

interface ProviderSelectorProps {
    value?: LogisticsProvider;
    onChange: (provider: LogisticsProvider) => void;
    className?: string;
}

export function ProviderSelector({
    value,
    onChange,
    className,
}: ProviderSelectorProps) {
    return (
        <div className={cn("space-y-3", className)}>
            <Label className="text-base font-medium">
                Select Shipping Provider
            </Label>
            <div className="grid grid-cols-2 gap-3">
                {providers.map((provider) => (
                    <Card
                        key={provider.id}
                        onClick={() => onChange(provider.id)}
                        className={cn(
                            "cursor-pointer transition-all duration-200",
                            provider.bgColor,
                            value === provider.id
                                ? `ring-2 ring-offset-2 ${provider.borderColor}`
                                : "border-transparent hover:border-gray-200"
                        )}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "p-2 rounded-lg bg-white/80",
                                    provider.color
                                )}>
                                    {provider.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-sm">
                                            {provider.name}
                                        </h3>
                                        {value === provider.id && (
                                            <Badge variant="secondary" className="text-xs">
                                                Selected
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {provider.description}
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                                        {provider.trackingFormat}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// Compact version for inline use
export function ProviderBadge({
    provider,
    size = "default",
}: {
    provider: LogisticsProvider | null | undefined;
    size?: "default" | "sm";
}) {
    if (!provider) return null;

    const config = providers.find((p) => p.id === provider);
    if (!config) return null;

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
            config.bgColor,
            size === "sm" && "px-2 py-0.5 text-xs"
        )}>
            <span className={cn(config.color, size === "sm" ? "scale-75" : "")}>
                {config.icon}
            </span>
            <span className={cn("font-medium", config.color, size === "sm" && "text-xs")}>
                {config.name}
            </span>
        </div>
    );
}
