"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Paperclip, Mic, Lock, Clock, Image as ImageIcon, FileText, X, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { EvidenceUpload } from "./evidence-upload";
import { VoiceRecorder, VoiceNotePlayer } from "./voice-recorder";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UploadedFile {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
}

interface ReadByEntry {
    userId: string;
    readAt: string;
    role: string;
}

interface Comment {
    id: string;
    content: string | null;
    authorRole: string | null;
    attachmentUrls: string[] | null;
    voiceNoteUrl: string | null;
    isInternal: boolean | null;
    createdAt: string;
    user?: { name: string; id?: string } | null;
    userId?: string | null;
    readBy?: ReadByEntry[] | null;
}

interface NCRCommentThreadProps {
    ncrId: string;
    canComment?: boolean;
    userRole?: string;
    currentUserId?: string;
}

const ROLE_COLORS: Record<string, string> = {
    SUPPLIER: "bg-purple-500",
    QA: "bg-blue-500",
    PM: "bg-green-500",
    ADMIN: "bg-red-500",
    USER: "bg-gray-500",
};

// Utility to convert S3 URLs to proxy URLs
function getProxiedUrl(originalUrl: string): string {
    if (!originalUrl || originalUrl.startsWith("blob:") || originalUrl.startsWith("/api/")) {
        return originalUrl;
    }
    try {
        const urlObj = new URL(originalUrl);
        const key = urlObj.pathname.slice(1);
        if (key) return `/api/audio/${key}`;
    } catch {
        const match = originalUrl.match(/amazonaws\.com\/(.+)$/);
        if (match?.[1]) return `/api/audio/${match[1]}`;
    }
    return originalUrl;
}

export function NCRCommentThread({ ncrId, canComment = true, userRole = "USER", currentUserId }: NCRCommentThreadProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const hasMarkedRead = useRef(false);

    // Attachment states
    const [showAttachments, setShowAttachments] = useState(false);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<UploadedFile[]>([]);
    const [pendingVoiceNote, setPendingVoiceNote] = useState<string | null>(null);

    // Check if a comment is read by the current user
    const isReadByCurrentUser = useCallback((comment: Comment): boolean => {
        if (!currentUserId) return true; // If no user ID, assume read
        if (comment.userId === currentUserId) return true; // Own comments are always "read"
        const readBy = comment.readBy || [];
        return readBy.some(r => r.userId === currentUserId);
    }, [currentUserId]);

    // Check if a comment is read by others (for the author to see)
    const getReadStatus = useCallback((comment: Comment): { isRead: boolean; readBy: ReadByEntry[] } => {
        const readBy = comment.readBy || [];
        const othersWhoRead = readBy.filter(r => r.userId !== comment.userId);
        return {
            isRead: othersWhoRead.length > 0,
            readBy: othersWhoRead,
        };
    }, []);

    // Mark comments as read
    const markCommentsAsRead = useCallback(async (commentIds: string[]) => {
        if (!currentUserId || commentIds.length === 0) return;
        
        try {
            const res = await fetch(`/api/ncr/${ncrId}/comments/read`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commentIds }),
            });
            
            if (res.ok) {
                // Update local state to reflect read status
                setComments(prev => prev.map(comment => {
                    if (commentIds.includes(comment.id)) {
                        const currentReadBy = comment.readBy || [];
                        if (!currentReadBy.some(r => r.userId === currentUserId)) {
                            return {
                                ...comment,
                                readBy: [
                                    ...currentReadBy,
                                    { userId: currentUserId, readAt: new Date().toISOString(), role: userRole }
                                ]
                            };
                        }
                    }
                    return comment;
                }));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error("Failed to mark comments as read:", error);
        }
    }, [ncrId, currentUserId, userRole]);

    useEffect(() => {
        fetchComments();
    }, [ncrId]);

    // Auto-mark comments as read when component mounts/comments load
    useEffect(() => {
        if (!loading && comments.length > 0 && currentUserId && !hasMarkedRead.current) {
            const unreadCommentIds = comments
                .filter(c => !isReadByCurrentUser(c))
                .map(c => c.id);
            
            if (unreadCommentIds.length > 0) {
                hasMarkedRead.current = true;
                markCommentsAsRead(unreadCommentIds);
            }
        }
    }, [loading, comments, currentUserId, isReadByCurrentUser, markCommentsAsRead]);

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/ncr/${ncrId}/comments`);
            const result = await res.json();
            if (result.success) {
                setComments(result.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch comments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComment = async () => {
        if (!newComment.trim() && pendingAttachments.length === 0 && !pendingVoiceNote) {
            toast.error("Please add a comment, attachment, or voice note");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/ncr/${ncrId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newComment || null,
                    isInternal,
                    attachmentUrls: pendingAttachments.map(f => f.url),
                    voiceNoteUrl: pendingVoiceNote,
                }),
            });

            const result = await res.json();
            if (result.success) {
                setComments([result.data, ...comments]);
                setNewComment("");
                setPendingAttachments([]);
                setPendingVoiceNote(null);
                setShowAttachments(false);
                setShowVoiceRecorder(false);
                toast.success("Comment added");
            } else {
                toast.error(result.error || "Failed to add comment");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFilesUploaded = (files: UploadedFile[]) => {
        setPendingAttachments(files);
    };

    const handleVoiceRecorded = (url: string) => {
        setPendingVoiceNote(url);
        setShowVoiceRecorder(false);
    };

    const removeAttachment = (index: number) => {
        setPendingAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) {
            return <ImageIcon className="h-4 w-4 text-blue-500" />;
        }
        return <FileText className="h-4 w-4 text-orange-500" />;
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    Discussion Thread
                    <Badge variant="secondary" className="text-xs">
                        {comments.length} {comments.length === 1 ? "comment" : "comments"}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* New Comment Input */}
                {canComment && (
                    <div className="space-y-3">
                        <Textarea
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={3}
                        />

                        {/* Pending Attachments */}
                        {pendingAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {pendingAttachments.map((file, index) => (
                                    <Badge key={file.id} variant="secondary" className="flex items-center gap-1 pr-1">
                                        {getFileIcon(file.type)}
                                        <span className="max-w-[100px] truncate">{file.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 ml-1"
                                            onClick={() => removeAttachment(index)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Pending Voice Note */}
                        {pendingVoiceNote && (
                            <div className="flex items-center gap-2">
                                <VoiceNotePlayer url={pendingVoiceNote} />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPendingVoiceNote(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {/* Evidence Upload Panel */}
                        {showAttachments && (
                            <EvidenceUpload
                                ncrId={ncrId}
                                onUploadComplete={handleFilesUploaded}
                            />
                        )}

                        {/* Voice Recorder Panel */}
                        {showVoiceRecorder && !pendingVoiceNote && (
                            <VoiceRecorder
                                ncrId={ncrId}
                                onRecordingComplete={handleVoiceRecorded}
                            />
                        )}

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={showAttachments ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => {
                                        setShowAttachments(!showAttachments);
                                        setShowVoiceRecorder(false);
                                    }}
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={showVoiceRecorder ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => {
                                        setShowVoiceRecorder(!showVoiceRecorder);
                                        setShowAttachments(false);
                                    }}
                                    disabled={!!pendingVoiceNote}
                                >
                                    <Mic className="h-4 w-4" />
                                </Button>
                                {userRole !== "SUPPLIER" && (
                                    <Button
                                        variant={isInternal ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => setIsInternal(!isInternal)}
                                        className="text-xs"
                                    >
                                        <Lock className="h-3 w-3 mr-1" />
                                        Internal
                                    </Button>
                                )}
                            </div>
                            <Button
                                onClick={handleSubmitComment}
                                disabled={(!newComment.trim() && pendingAttachments.length === 0 && !pendingVoiceNote) || submitting}
                                size="sm"
                            >
                                <Send className="h-4 w-4 mr-1" />
                                Send
                            </Button>
                        </div>
                        {isInternal && (
                            <p className="text-xs text-muted-foreground">
                                🔒 This comment will be hidden from the supplier
                            </p>
                        )}
                    </div>
                )}

                <Separator />

                {/* Comments List */}
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse flex gap-3">
                                <div className="h-10 w-10 rounded-full bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-1/4" />
                                    <div className="h-12 bg-muted rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <p>No comments yet. Start the discussion!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => {
                            const isOwnComment = comment.userId === currentUserId;
                            const readStatus = getReadStatus(comment);
                            const isUnread = !isReadByCurrentUser(comment);
                            
                            return (
                                <div 
                                    key={comment.id} 
                                    className={`flex gap-3 p-2 rounded-lg transition-colors ${
                                        isUnread ? "bg-blue-50/50 dark:bg-blue-950/20 border-l-2 border-blue-400" : ""
                                    }`}
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className={ROLE_COLORS[comment.authorRole || "USER"]}>
                                            {comment.user?.name?.[0] || comment.authorRole?.[0] || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm">
                                                {comment.user?.name || comment.authorRole || "Unknown"}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {comment.authorRole}
                                            </Badge>
                                            {comment.isInternal && (
                                                <Badge variant="secondary" className="text-xs">
                                                    <Lock className="h-2 w-2 mr-1" />
                                                    Internal
                                                </Badge>
                                            )}
                                            {isUnread && (
                                                <Badge variant="default" className="text-xs bg-blue-500 hover:bg-blue-500">
                                                    New
                                                </Badge>
                                            )}
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                            </span>
                                            
                                            {/* Read status indicator for own messages */}
                                            {isOwnComment && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="flex items-center ml-auto">
                                                                {readStatus.isRead ? (
                                                                    <CheckCheck className="h-4 w-4 text-blue-500" />
                                                                ) : (
                                                                    <Check className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="left" className="max-w-xs">
                                                            {readStatus.isRead ? (
                                                                <div className="space-y-1">
                                                                    <p className="font-medium">Read by:</p>
                                                                    {readStatus.readBy.map((r, i) => (
                                                                        <p key={i} className="text-xs">
                                                                            {r.role} • {format(new Date(r.readAt), "MMM d, h:mm a")}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p>Message sent, awaiting read</p>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                        {comment.content && <p className="text-sm">{comment.content}</p>}

                                        {/* Attachments */}
                                        {comment.attachmentUrls && comment.attachmentUrls.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {comment.attachmentUrls.map((url, i) => (
                                                    <a
                                                        key={i}
                                                        href={getProxiedUrl(url)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                                                    >
                                                        <Paperclip className="h-3 w-3" />
                                                        Attachment {i + 1}
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        {/* Voice Note */}
                                        {comment.voiceNoteUrl && (
                                            <div className="mt-2">
                                                <VoiceNotePlayer url={comment.voiceNoteUrl} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
