"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    ArrowLeft,
    Ticket,
    User,
    HeadsetIcon,
    Paperclip,
    X,
    Image as ImageIcon,
    LockSimple,
    Eye,
    PaperPlaneRight,
    Headset,
} from "@phosphor-icons/react";
import {
    addTicketReply,
    updateTicketStatus,
} from "@/lib/actions/support-actions";
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS } from "@/lib/actions/support-constants";
import { extractS3KeyFromUrl } from "@/lib/services/s3";
import type { TicketWithThread } from "@/lib/actions/support-actions";
import type { TicketStatus } from "@/lib/actions/support-constants";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<TicketStatus, string> = {
    OPEN: "bg-red-500/10 text-red-600 border-red-500/20",
    IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    AWAITING_USER: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    RESOLVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    CLOSED: "bg-muted text-muted-foreground border-border",
};

interface Props {
    ticket: TicketWithThread;
    isSuperAdmin: boolean;
    currentUserId: string;
}

export function TicketThreadClient({ ticket, isSuperAdmin, currentUserId }: Props) {
    const [isPending, startTransition] = useTransition();
    const [reply, setReply] = useState("");
    const [isInternal, setIsInternal] = useState(false);

    // File upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const currentStatus = (ticket.status ?? "OPEN") as TicketStatus;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setUploadedFileUrl(null);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        try {
            const res = await fetch("/api/support/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName: selectedFile.name, contentType: selectedFile.type }),
            });
            const data = await res.json();
            if (!data.uploadUrl) throw new Error("Failed to get upload URL");
            await fetch(data.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": selectedFile.type },
                body: selectedFile,
            });
            setUploadedFileUrl(data.fileUrl);
            toast.success("File uploaded.");
        } catch {
            toast.error("Upload failed.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSendReply = () => {
        if (!reply.trim()) { toast.error("Message cannot be empty."); return; }
        startTransition(async () => {
            const fd = new FormData();
            fd.set("ticketId", ticket.id);
            fd.set("content", reply.trim());
            fd.set("isInternal", String(isInternal));
            if (uploadedFileUrl && selectedFile) {
                fd.set("attachmentUrl", uploadedFileUrl);
                fd.set("attachmentName", selectedFile.name);
                fd.set("attachmentType", selectedFile.type);
            }
            const result = await addTicketReply(fd);
            if (result.success) {
                setReply("");
                setSelectedFile(null);
                setUploadedFileUrl(null);
                setIsInternal(false);
                toast.success("Reply sent.");
            } else {
                toast.error(result.error ?? "Failed to send reply.");
            }
        });
    };

    const handleStatusChange = (newStatus: TicketStatus) => {
        startTransition(async () => {
            const result = await updateTicketStatus(ticket.id, newStatus);
            if (result.success) toast.success(`Ticket marked as ${STATUS_LABELS[newStatus]}`);
            else toast.error(result.error ?? "Failed to update status.");
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-5 pb-16">
            {/* Back + header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild className="-ml-2">
                    <Link href="/dashboard/support">
                        <ArrowLeft className="h-4 w-4 mr-1.5" /> Support
                    </Link>
                </Button>
            </div>

            {/* Ticket header card */}
            <Card className="border-border/70">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                                <Ticket className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {ticket.ticketNumber}
                                    </span>
                                    <span
                                        className={cn(
                                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                            STATUS_STYLE[currentStatus]
                                        )}
                                    >
                                        {STATUS_LABELS[currentStatus]}
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                        {PRIORITY_LABELS[(ticket.priority ?? "MEDIUM") as keyof typeof PRIORITY_LABELS]}
                                    </span>
                                </div>
                                <CardTitle className="text-base mt-1">{ticket.subject}</CardTitle>
                            </div>
                        </div>

                        {/* Super admin: status updater */}
                        {isSuperAdmin && (
                            <Select value={currentStatus} onValueChange={(v) => handleStatusChange(v as TicketStatus)}>
                                <SelectTrigger className="h-8 w-[160px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
                                        <SelectItem key={s} value={s} className="text-xs">
                                            {STATUS_LABELS[s]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                        <div>
                            <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px] mb-0.5">Category</p>
                            <p className="text-foreground">{CATEGORY_LABELS[(ticket.category ?? "GENERAL") as keyof typeof CATEGORY_LABELS]}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px] mb-0.5">Raised By</p>
                            <p className="text-foreground">{ticket.raiser?.name ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px] mb-0.5">Opened</p>
                            <p className="text-foreground">
                                {format(new Date(ticket.createdAt), "dd MMM yyyy")}
                                <span className="text-muted-foreground ml-1">
                                    ({formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })})
                                </span>
                            </p>
                        </div>
                        {ticket.assignee && isSuperAdmin && (
                            <div>
                                <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px] mb-0.5">Assigned To</p>
                                <p className="text-foreground">{ticket.assignee.name}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Message thread */}
            <div className="space-y-3">
                {/* Original description as first message */}
                <MessageBubble
                    senderName={ticket.raiser?.name ?? "User"}
                    content={ticket.description}
                    timestamp={ticket.createdAt}
                    isFromSupport={false}
                    isInternal={false}
                    isMe={ticket.raisedBy === currentUserId}
                    attachmentUrl={null}
                    attachmentName={null}
                />

                {(ticket.messages ?? []).map((msg: any) => (
                    <MessageBubble
                        key={msg.id}
                        senderName={msg.sender?.name ?? "?"}
                        content={msg.content}
                        timestamp={msg.createdAt}
                        isFromSupport={msg.isFromSupport}
                        isInternal={msg.isInternal}
                        isMe={msg.senderId === currentUserId}
                        attachmentUrl={msg.attachmentUrl}
                        attachmentName={msg.attachmentName}
                    />
                ))}
            </div>

            {/* Reply box — hidden for CLOSED/RESOLVED unless super admin */}
            {(currentStatus !== "CLOSED" || isSuperAdmin) && (
                <Card className="border-border/70">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">
                                {isSuperAdmin ? "Send Reply" : "Reply to Support"}
                            </p>
                            {isSuperAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setIsInternal(!isInternal)}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                                        isInternal
                                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                                            : "border-border text-muted-foreground hover:border-border/80"
                                    )}
                                >
                                    {isInternal ? (
                                        <><LockSimple className="h-3 w-3" /> Internal note</>
                                    ) : (
                                        <><Eye className="h-3 w-3" /> Public reply</>
                                    )}
                                </button>
                            )}
                        </div>

                        {isInternal && (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700">
                                Internal note — not visible to the user who raised this ticket.
                            </div>
                        )}

                        <Textarea
                            placeholder={isInternal ? "Add an internal note for the support team…" : "Write your reply…"}
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            rows={4}
                            className="resize-none"
                        />

                        {/* Attachment */}
                        <div>
                            {selectedFile ? (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 rounded-lg bg-muted border border-border px-2.5 py-1.5 text-xs">
                                        <ImageIcon className="h-3.5 w-3.5 text-primary" />
                                        <span className="max-w-[180px] truncate">{selectedFile.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedFile(null); setUploadedFileUrl(null); }}
                                            className="ml-1 hover:text-destructive"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                    {!uploadedFileUrl ? (
                                        <Button size="sm" variant="outline" onClick={handleUpload} disabled={isUploading} className="text-xs h-7">
                                            {isUploading ? "Uploading…" : "Upload"}
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-emerald-600 font-medium">✓ Uploaded</span>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Paperclip className="h-3.5 w-3.5" /> Attach file
                                </button>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={handleSendReply}
                                disabled={isPending || !reply.trim()}
                                className="bg-primary hover:bg-primary/90 gap-2"
                            >
                                <PaperPlaneRight className="h-4 w-4" />
                                {isPending ? "Sending…" : "Send Reply"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStatus === "CLOSED" && !isSuperAdmin && (
                <p className="text-center text-sm text-muted-foreground py-4">
                    This ticket is closed. Raise a&nbsp;
                    <Link href="/dashboard/support/new" className="text-primary hover:underline font-medium">new ticket</Link>
                    &nbsp;if you need further help.
                </p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({
    senderName,
    content,
    timestamp,
    isFromSupport,
    isInternal,
    isMe,
    attachmentUrl,
    attachmentName,
}: {
    senderName: string;
    content: string;
    timestamp: Date | string;
    isFromSupport: boolean;
    isInternal: boolean;
    isMe: boolean;
    attachmentUrl: string | null;
    attachmentName: string | null;
}) {
    return (
        <div
            className={cn(
                "flex gap-3",
                isFromSupport ? "flex-row-reverse" : "flex-row"
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isFromSupport
                        ? "bg-primary/10 border border-primary/20 text-primary"
                        : "bg-muted border border-border text-muted-foreground"
                )}
            >
                {isFromSupport ? (
                    <Headset className="h-4 w-4" />
                ) : (
                    <User className="h-4 w-4" />
                )}
            </div>

            {/* Bubble */}
            <div
                className={cn(
                    "max-w-[80%] space-y-1",
                    isFromSupport ? "items-end" : "items-start"
                )}
            >
                {isInternal && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold mb-1">
                        <LockSimple className="h-3 w-3" /> Internal note
                    </div>
                )}
                <div
                    className={cn(
                        "rounded-2xl px-4 py-3 text-sm",
                        isFromSupport
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : isInternal
                                ? "bg-amber-500/10 border border-amber-500/20 text-foreground rounded-tl-sm"
                                : "bg-muted border border-border text-foreground rounded-tl-sm"
                    )}
                >
                    <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
                    {attachmentUrl && (
                        <a
                            href={
                                attachmentUrl.includes("amazonaws.com")
                                    ? `/api/audio/${extractS3KeyFromUrl(attachmentUrl)}`
                                    : attachmentUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                "mt-2 flex items-center gap-1.5 text-xs underline underline-offset-2",
                                isFromSupport ? "text-primary-foreground/80" : "text-primary"
                            )}
                        >
                            <Paperclip className="h-3 w-3" />
                            {attachmentName ?? "Attachment"}
                        </a>
                    )}
                </div>
                <div
                    className={cn(
                        "flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground",
                        isFromSupport ? "justify-end flex-row-reverse" : "justify-start"
                    )}
                >
                    <span className="font-medium">{isFromSupport ? "Support Team" : senderName}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</span>
                </div>
            </div>
        </div>
    );
}
