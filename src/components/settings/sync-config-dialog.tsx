"use client";

/**
 * Sync Configuration Dialog
 * UI for setting up and managing Smartsheet/Excel integrations
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Check,
    X,
    SpinnerGap,
    Link as LinkIcon,
    Table,
    ArrowsClockwise,
    Warning,
} from "@phosphor-icons/react";

interface SyncConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (config: SyncConfig) => Promise<void>;
    existingConfig?: SyncConfig;
    projectId: string;
}

export interface SyncConfig {
    id?: string;
    provider: "SMARTSHEET" | "GOOGLE_SHEETS";
    name: string;
    apiKey: string;
    sheetId: string;
    syncFrequency: "MANUAL" | "HOURLY" | "DAILY";
    columnMappings?: Record<string, string>;
}

interface Sheet {
    id: string;
    name: string;
}

export function SyncConfigDialog({
    open,
    onOpenChange,
    onSave,
    existingConfig,
    projectId,
}: SyncConfigDialogProps) {
    const [provider, setProvider] = useState<SyncConfig["provider"]>(
        existingConfig?.provider || "SMARTSHEET"
    );
    const [name, setName] = useState(existingConfig?.name || "");
    const [apiKey, setApiKey] = useState(existingConfig?.apiKey || "");
    const [sheetId, setSheetId] = useState(existingConfig?.sheetId || "");
    const [syncFrequency, setSyncFrequency] = useState<SyncConfig["syncFrequency"]>(
        existingConfig?.syncFrequency || "MANUAL"
    );

    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"untested" | "success" | "failed">("untested");
    const [availableSheets, setAvailableSheets] = useState<Sheet[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const testConnection = async () => {
        if (!apiKey) {
            toast.error("Please enter an API key");
            return;
        }

        setIsTestingConnection(true);
        setConnectionStatus("untested");

        try {
            const response = await fetch("/api/sync/test-connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider, apiKey }),
            });

            const data = await response.json();

            if (data.success) {
                setConnectionStatus("success");
                setAvailableSheets(data.sheets || []);
                toast.success("Connection successful!");
            } else {
                setConnectionStatus("failed");
                toast.error(data.error || "Connection failed");
            }
        } catch (error) {
            setConnectionStatus("failed");
            toast.error("Failed to test connection");
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleSave = async () => {
        if (!name || !apiKey || !sheetId) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSaving(true);

        try {
            await onSave({
                id: existingConfig?.id,
                provider,
                name,
                apiKey,
                sheetId,
                syncFrequency,
            });
            toast.success("Sync configuration saved!");
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {existingConfig ? "Edit" : "Add"} External Sync
                    </DialogTitle>
                    <DialogDescription>
                        Connect a Smartsheet or Google Sheet to sync BOQ data automatically
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="SMARTSHEET">
                            <Table size={16} className="mr-2" />
                            Smartsheet
                        </TabsTrigger>
                        <TabsTrigger value="GOOGLE_SHEETS">
                            <Table size={16} className="mr-2" />
                            Google Sheets
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="SMARTSHEET" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Connection Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Project Alpha BOQ"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="apiKey">Smartsheet API Key</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="apiKey"
                                    type="password"
                                    placeholder="Enter your API access token"
                                    value={apiKey}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        setConnectionStatus("untested");
                                    }}
                                />
                                <Button
                                    variant="outline"
                                    onClick={testConnection}
                                    disabled={isTestingConnection || !apiKey}
                                >
                                    {isTestingConnection ? (
                                        <SpinnerGap size={16} className="animate-spin" />
                                    ) : connectionStatus === "success" ? (
                                        <Check size={16} className="text-green-600" />
                                    ) : connectionStatus === "failed" ? (
                                        <X size={16} className="text-red-600" />
                                    ) : (
                                        <LinkIcon size={16} />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Get your API key from Smartsheet → Account → API Access
                            </p>
                        </div>

                        {connectionStatus === "success" && availableSheets.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="sheetId">Select Sheet</Label>
                                <Select value={sheetId} onValueChange={setSheetId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a sheet" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSheets.map((sheet) => (
                                            <SelectItem key={sheet.id} value={sheet.id}>
                                                {sheet.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {connectionStatus !== "success" && (
                            <div className="space-y-2">
                                <Label htmlFor="sheetIdManual">Sheet ID</Label>
                                <Input
                                    id="sheetIdManual"
                                    placeholder="Enter sheet ID manually"
                                    value={sheetId}
                                    onChange={(e) => setSheetId(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Or test connection above to select from available sheets
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="GOOGLE_SHEETS" className="space-y-4 mt-4">
                        <div className="flex items-center gap-2 p-4 bg-amber-50 text-amber-800 rounded-lg">
                            <Warning size={20} />
                            <span className="text-sm">
                                Google Sheets integration coming soon. Use Smartsheet for now.
                            </span>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="space-y-2">
                    <Label>Sync Frequency</Label>
                    <Select
                        value={syncFrequency}
                        onValueChange={(v) => setSyncFrequency(v as typeof syncFrequency)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MANUAL">Manual only</SelectItem>
                            <SelectItem value="HOURLY">Every hour</SelectItem>
                            <SelectItem value="DAILY">Once daily</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex gap-2 mt-2">
                        {syncFrequency === "MANUAL" && (
                            <Badge variant="secondary">You'll trigger syncs manually</Badge>
                        )}
                        {syncFrequency === "HOURLY" && (
                            <Badge variant="secondary">
                                <ArrowsClockwise size={12} className="mr-1" />
                                Auto-syncs every hour
                            </Badge>
                        )}
                        {syncFrequency === "DAILY" && (
                            <Badge variant="secondary">
                                <ArrowsClockwise size={12} className="mr-1" />
                                Auto-syncs at 2 AM UTC
                            </Badge>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !name || !apiKey || !sheetId}
                    >
                        {isSaving && <SpinnerGap size={16} className="mr-2 animate-spin" />}
                        {existingConfig ? "Update" : "Create"} Sync
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
