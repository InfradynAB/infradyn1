"use client";

/**
 * Phase 6J: Threshold Config Panel
 * 
 * Admin component to manage system configuration thresholds
 * for logistics, conflicts, and delivery policies.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Settings, Save, RotateCcw, Clock,
    AlertTriangle, Truck, DollarSign, Bell
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Config {
    id: string;
    configKey: string;
    configValue: string;
    configType: string;
    description?: string | null;
}

interface ConfigGroup {
    title: string;
    icon: React.ReactNode;
    configs: {
        key: string;
        label: string;
        description: string;
        type: "NUMBER" | "BOOLEAN" | "STRING";
        unit?: string;
        min?: number;
        max?: number;
    }[];
}

const CONFIG_GROUPS: ConfigGroup[] = [
    {
        title: "Delay Thresholds",
        icon: <Clock className="h-4 w-4" />,
        configs: [
            {
                key: "delay_tolerance_days",
                label: "Delay Tolerance",
                description: "Days after ROS before flagging as late",
                type: "NUMBER",
                unit: "days",
                min: 0,
                max: 14,
            },
            {
                key: "high_delay_threshold_days",
                label: "Critical Delay",
                description: "Days after ROS for immediate PM alert",
                type: "NUMBER",
                unit: "days",
                min: 1,
                max: 30,
            },
        ],
    },
    {
        title: "Quantity & Variance",
        icon: <AlertTriangle className="h-4 w-4" />,
        configs: [
            {
                key: "quantity_variance_threshold",
                label: "Quantity Variance",
                description: "Percentage variance before flagging conflict",
                type: "NUMBER",
                unit: "%",
                min: 1,
                max: 25,
            },
            {
                key: "auto_accept_variance_threshold",
                label: "Auto-Accept Variance",
                description: "Variance percentage that still auto-accepts",
                type: "NUMBER",
                unit: "%",
                min: 0,
                max: 10,
            },
        ],
    },
    {
        title: "Invoice Policies",
        icon: <DollarSign className="h-4 w-4" />,
        configs: [
            {
                key: "high_value_invoice_threshold",
                label: "High Value Threshold",
                description: "Amount above which requires extra verification",
                type: "NUMBER",
                unit: "$",
                min: 1000,
                max: 100000,
            },
            {
                key: "invoice_duplicate_window_days",
                label: "Duplicate Window",
                description: "Days to check for duplicate invoices",
                type: "NUMBER",
                unit: "days",
                min: 1,
                max: 90,
            },
        ],
    },
    {
        title: "Logistics API",
        icon: <Truck className="h-4 w-4" />,
        configs: [
            {
                key: "logistics_poll_frequency_hours",
                label: "Poll Frequency",
                description: "Hours between AfterShip API polls",
                type: "NUMBER",
                unit: "hours",
                min: 1,
                max: 24,
            },
            {
                key: "aftership_api_enabled",
                label: "AfterShip Enabled",
                description: "Enable AfterShip tracking integration",
                type: "BOOLEAN",
            },
        ],
    },
    {
        title: "Notifications",
        icon: <Bell className="h-4 w-4" />,
        configs: [
            {
                key: "conflict_digest_enabled",
                label: "Daily Digest",
                description: "Send daily conflict digest emails",
                type: "BOOLEAN",
            },
            {
                key: "immediate_alert_severity",
                label: "Immediate Alert Level",
                description: "Minimum severity for immediate alerts",
                type: "STRING",
            },
        ],
    },
];

export function ThresholdConfigPanel() {
    const [configs, setConfigs] = useState<Record<string, string>>({});
    const [originalConfigs, setOriginalConfigs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/config");
            const data = await response.json();
            if (data.configs) {
                const configMap: Record<string, string> = {};
                for (const config of data.configs) {
                    configMap[config.configKey] = config.configValue;
                }
                setConfigs(configMap);
                setOriginalConfigs(configMap);
            }
        } catch (error) {
            console.error("Failed to fetch configs:", error);
            toast.error("Failed to load configuration");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    useEffect(() => {
        setHasChanges(JSON.stringify(configs) !== JSON.stringify(originalConfigs));
    }, [configs, originalConfigs]);

    const handleChange = (key: string, value: string) => {
        setConfigs((prev) => ({ ...prev, [key]: value }));
    };

    const handleToggle = (key: string, checked: boolean) => {
        setConfigs((prev) => ({ ...prev, [key]: checked.toString() }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save each changed config
            const changes = Object.entries(configs).filter(
                ([key, value]) => originalConfigs[key] !== value
            );

            for (const [key, value] of changes) {
                await fetch("/api/config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key, value }),
                });
            }

            setOriginalConfigs({ ...configs });
            toast.success(`Saved ${changes.length} configuration${changes.length !== 1 ? "s" : ""}`);
        } catch (error) {
            console.error("Failed to save configs:", error);
            toast.error("Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setConfigs({ ...originalConfigs });
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            System Configuration
                        </CardTitle>
                        <CardDescription>
                            Manage thresholds and policies for logistics and conflicts
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {hasChanges && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                            >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reset
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                        >
                            <Save className="h-4 w-4 mr-1" />
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <Tabs defaultValue="delay" className="space-y-4">
                    <TabsList className="grid grid-cols-5 w-full">
                        {CONFIG_GROUPS.map((group, idx) => (
                            <TabsTrigger
                                key={idx}
                                value={group.title.toLowerCase().replace(/\s+/g, "-")}
                                className="gap-1"
                            >
                                {group.icon}
                                <span className="hidden sm:inline">{group.title}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {CONFIG_GROUPS.map((group, idx) => (
                        <TabsContent
                            key={idx}
                            value={group.title.toLowerCase().replace(/\s+/g, "-")}
                            className="space-y-4"
                        >
                            {group.configs.map((config) => {
                                const value = configs[config.key] ?? "";
                                const hasChanged = value !== (originalConfigs[config.key] ?? "");

                                return (
                                    <div
                                        key={config.key}
                                        className={cn(
                                            "flex items-center justify-between p-4 border rounded-lg",
                                            hasChanged && "border-blue-300 bg-blue-50/50"
                                        )}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Label className="font-medium">{config.label}</Label>
                                                {hasChanged && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Modified
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {config.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {config.type === "BOOLEAN" ? (
                                                <Switch
                                                    checked={value === "true"}
                                                    onCheckedChange={(checked) =>
                                                        handleToggle(config.key, checked)
                                                    }
                                                />
                                            ) : (
                                                <>
                                                    <Input
                                                        type={config.type === "NUMBER" ? "number" : "text"}
                                                        value={value}
                                                        onChange={(e) =>
                                                            handleChange(config.key, e.target.value)
                                                        }
                                                        className="w-24"
                                                        min={config.min}
                                                        max={config.max}
                                                    />
                                                    {config.unit && (
                                                        <span className="text-sm text-muted-foreground">
                                                            {config.unit}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
}
