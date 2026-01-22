"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Paperclip, Mic, Lock, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Comment {
    id: string;
    content: string | null;
    authorRole: string | null;
    attachmentUrls: string[] | null;
    voiceNoteUrl: string | null;
    isInternal: boolean | null;
    createdAt: string;
    user?: { name: string } | null;
}

interface NCRCommentThreadProps {
    ncrId: string;
    canComment?: boolean;
    userRole?: string;
}

const ROLE_COLORS: Record<string, string> = {
    SUPPLIER: "bg-purple-500",
    QA: "bg-blue-500",
    PM: "bg-green-500",
    ADMIN: "bg-red-500",
    USER: "bg-gray-500",
};

export function NCRCommentThread({ ncrId, canComment = true, userRole = "USER" }: NCRCommentThreadProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [ncrId]);

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
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/ncr/${ncrId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newComment,
                    isInternal,
                }),
            });

            const result = await res.json();
            if (result.success) {
                setComments([result.data, ...comments]);
                setNewComment("");
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
                    <div className="space-y-2">
                        <Textarea
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={3}
                        />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" disabled>
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" disabled>
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
                                disabled={!newComment.trim() || submitting}
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
                        {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className={ROLE_COLORS[comment.authorRole || "USER"]}>
                                        {comment.user?.name?.[0] || comment.authorRole?.[0] || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
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
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                        </span>
                                    </div>
                                    <p className="text-sm">{comment.content}</p>

                                    {/* Attachments */}
                                    {comment.attachmentUrls && comment.attachmentUrls.length > 0 && (
                                        <div className="flex gap-2 mt-2">
                                            {comment.attachmentUrls.map((url, i) => (
                                                <a
                                                    key={i}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                                >
                                                    <Paperclip className="h-3 w-3" />
                                                    Attachment {i + 1}
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {/* Voice Note */}
                                    {comment.voiceNoteUrl && (
                                        <audio controls className="mt-2 h-8">
                                            <source src={comment.voiceNoteUrl} type="audio/webm" />
                                        </audio>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
