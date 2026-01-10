"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UsageQuotaDashboard, type QuotaStatus } from "@/components/settings/usage-quota-dashboard";
import { SyncConfigDialog, type SyncConfig } from "@/components/settings/sync-config-dialog";
import { EmailInbox, type EmailIngestionItem } from "@/components/settings/email-inbox";
import { createExternalSync, updateExternalSync, deleteExternalSync } from "@/lib/actions/external-sync";
import { toast } from "sonner";
import {
    Plus,
    ArrowsClockwise,
    Check,
    X,
    SpinnerGap,
    Table,
    EnvelopeSimple,
    TrashSimple,
    PencilSimple,
    Clock,
    Warning,
} from "@phosphor-icons/react";

interface ExternalSyncItem {
    id: string;
    provider: string;
    name: string;
    sheetId?: string;
    syncFrequency: string | null;
    isActive: boolean | null;
    lastSyncAt?: string;
    lastSyncStatus?: string | null;
    lastSyncError?: string | null;
    itemsSynced?: number | null;
    targetProject?: { id: string; name: string } | null;
}

interface IntegrationsClientProps {
    quotaStatus: QuotaStatus;
    syncs: ExternalSyncItem[];
    emails: EmailIngestionItem[];
    organizationId: string;
}

export function IntegrationsClient({ quotaStatus, syncs, emails, organizationId }: IntegrationsClientProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSync, setEditingSync] = useState<SyncConfig | undefined>();
    const [syncsState, setSyncsState] = useState(syncs);
    const [triggeringId, setTriggeringId] = useState<string | null>(null);

    const handleSaveSync = async (config: SyncConfig) => {
        if (config.id) {
            // Update existing
            const result = await updateExternalSync(config.id, {
                name: config.name,
                apiKey: config.apiKey,
                sheetId: config.sheetId,
                syncFrequency: config.syncFrequency,
            });
            if (!result.success) {
                throw new Error(result.error);
            }
        } else {
            // Create new
            const result = await createExternalSync({
                provider: config.provider,
                name: config.name,
                apiKey: config.apiKey,
                sheetId: config.sheetId,
                syncFrequency: config.syncFrequency,
            });
            if (!result.success) {
                throw new Error(result.error);
            }
        }

        // Refresh the page to get updated data
        window.location.reload();
    };

    const handleDeleteSync = async (syncId: string) => {
        const confirmed = window.confirm("Are you sure you want to delete this sync configuration?");
        if (!confirmed) return;

        const result = await deleteExternalSync(syncId);
        if (result.success) {
            setSyncsState(s => s.filter(sync => sync.id !== syncId));
            toast.success("Sync configuration deleted");
        } else {
            toast.error(result.error || "Failed to delete");
        }
    };

    const handleTriggerSync = async (syncId: string) => {
        setTriggeringId(syncId);
        try {
            const response = await fetch("/api/sync/trigger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ syncId }),
            });
            const data = await response.json();

            if (data.success) {
                toast.success(`Synced ${data.itemsProcessed} items (${data.itemsCreated} new, ${data.itemsUpdated} updated)`);
                window.location.reload();
            } else {
                toast.error(data.error || "Sync failed");
            }
        } catch {
            toast.error("Sync request failed");
        } finally {
            setTriggeringId(null);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Usage Quotas Section */}
            <UsageQuotaDashboard quota={quotaStatus} className="lg:col-span-2" />

            {/* External Syncs Section */}
            <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">External Syncs</CardTitle>
                        <CardDescription>
                            Connect Smartsheet or other external sources to sync BOQ data
                        </CardDescription>
                    </div>
                    <Button onClick={() => {
                        setEditingSync(undefined);
                        setIsDialogOpen(true);
                    }}>
                        <Plus size={16} className="mr-2" />
                        Add Sync
                    </Button>
                </CardHeader>
                <CardContent>
                    {syncsState.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Table size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No external syncs configured yet</p>
                            <p className="text-sm">Click "Add Sync" to connect a Smartsheet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {syncsState.map(sync => (
                                <div
                                    key={sync.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Table size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{sync.name}</span>
                                                <Badge variant={sync.isActive ? "default" : "secondary"}>
                                                    {sync.isActive ? "Active" : "Paused"}
                                                </Badge>
                                                {sync.lastSyncStatus && (
                                                    <Badge
                                                        variant={
                                                            sync.lastSyncStatus === "SUCCESS"
                                                                ? "outline"
                                                                : sync.lastSyncStatus === "FAILED"
                                                                    ? "destructive"
                                                                    : "secondary"
                                                        }
                                                    >
                                                        {sync.lastSyncStatus === "SUCCESS" && (
                                                            <Check size={12} className="mr-1" />
                                                        )}
                                                        {sync.lastSyncStatus === "FAILED" && (
                                                            <Warning size={12} className="mr-1" />
                                                        )}
                                                        Last: {sync.lastSyncStatus}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                                                <span>{sync.provider}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {sync.syncFrequency}
                                                </span>
                                                {sync.itemsSynced != null && sync.itemsSynced > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{sync.itemsSynced} items</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTriggerSync(sync.id)}
                                            disabled={triggeringId === sync.id}
                                        >
                                            {triggeringId === sync.id ? (
                                                <SpinnerGap size={16} className="animate-spin" />
                                            ) : (
                                                <ArrowsClockwise size={16} />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingSync({
                                                    id: sync.id,
                                                    provider: sync.provider as SyncConfig["provider"],
                                                    name: sync.name,
                                                    apiKey: "", // Don't expose
                                                    sheetId: sync.sheetId || "",
                                                    syncFrequency: sync.syncFrequency as SyncConfig["syncFrequency"],
                                                });
                                                setIsDialogOpen(true);
                                            }}
                                        >
                                            <PencilSimple size={16} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteSync(sync.id)}
                                        >
                                            <TrashSimple size={16} className="text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Email Inbox - Recent Emails */}
            <EmailInbox
                emails={emails}
                onRefresh={() => window.location.reload()}
                onDelete={async (emailId) => {
                    try {
                        const response = await fetch(`/api/emails/${emailId}`, {
                            method: "DELETE",
                        });
                        if (!response.ok) throw new Error("Failed to delete");
                        toast.success("Email deleted");
                        window.location.reload();
                    } catch {
                        toast.error("Failed to delete email");
                    }
                }}
                onProcess={async (emailId) => {
                    try {
                        const response = await fetch(`/api/emails/${emailId}/process`, {
                            method: "POST",
                        });
                        if (!response.ok) throw new Error("Failed to process");
                        const result = await response.json();
                        toast.success(`Processed! ${result.extractionsCreated} extractions created`);
                        window.location.reload();
                    } catch {
                        toast.error("Failed to process email");
                    }
                }}
                className="lg:col-span-2"
            />

            {/* Email Ingestion Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <EnvelopeSimple size={20} className="text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Email Ingestion</CardTitle>
                            <CardDescription>Receive documents via email</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                        po-{organizationId.slice(0, 8)}...@ingest.infradyn.com
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Forward PO-related emails to this address. Attachments will be automatically
                        processed and matched to suppliers and POs.
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(`po-${organizationId}@ingest.infradyn.com`);
                                toast.success("Email address copied!");
                            }}
                        >
                            Copy Address
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">This Month</CardTitle>
                    <CardDescription>AI processing activity</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold">{quotaStatus.ocr.used}</p>
                            <p className="text-xs text-muted-foreground">OCR Pages</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{quotaStatus.aiParse.used}</p>
                            <p className="text-xs text-muted-foreground">AI Parsed</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{quotaStatus.emailIngest.used}</p>
                            <p className="text-xs text-muted-foreground">Emails</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sync Dialog */}
            <SyncConfigDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSaveSync}
                existingConfig={editingSync}
                projectId=""
            />
        </div>
    );
}
