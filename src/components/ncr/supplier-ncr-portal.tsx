"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Upload,
    Send,
    FileText,
    Loader2,
    AlertCircle,
    Mic,
    Square,
    Play,
    Pause,
    Trash2,
    X,
    Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface NCRData {
    id: string;
    ncrNumber: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    issueType: string;
    createdAt: string;
    purchaseOrder?: { poNumber: string } | null;
    affectedBoqItem?: { description: string } | null;
    comments: Array<{
        id: string;
        content: string | null;
        authorRole: string | null;
        attachmentUrls: string[] | null;
        voiceNoteUrl: string | null;
        createdAt: string;
    }>;
}

interface SupplierNCRPortalProps {
    token: string;
}

const SEVERITY_CONFIG = {
    CRITICAL: { color: "bg-red-500", icon: AlertTriangle, label: "Critical" },
    MAJOR: { color: "bg-orange-500", icon: AlertCircle, label: "Major" },
    MINOR: { color: "bg-yellow-500", icon: Clock, label: "Minor" },
};

const STATUS_LABELS: Record<string, string> = {
    OPEN: "Awaiting Your Response",
    SUPPLIER_RESPONDED: "Response Received",
    REINSPECTION: "Under Re-inspection",
    REVIEW: "Under Review",
    REMEDIATION: "Remediation in Progress",
    CLOSED: "Resolved",
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

// Simple Voice Note Player for supplier portal
function SupplierVoiceNotePlayer({ url }: { url: string }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const audioSrc = getProxiedUrl(url);

    const togglePlay = async () => {
        if (!audioRef.current || error) return;
        
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            setIsLoading(true);
            try {
                await audioRef.current.play();
                setIsPlaying(true);
            } catch (err) {
                console.error("Playback error:", err);
                setError(true);
                toast.error("Could not play audio");
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (error) {
        return (
            <div className="inline-flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full">
                <span className="text-xs text-red-600">Audio unavailable</span>
            </div>
        );
    }

    return (
        <div className="inline-flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full">
            <audio 
                ref={audioRef} 
                src={audioSrc} 
                preload="metadata"
                onEnded={() => setIsPlaying(false)}
                onError={() => setError(true)}
            />
            <Button 
                onClick={togglePlay} 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : isPlaying ? (
                    <Pause className="h-3 w-3" />
                ) : (
                    <Play className="h-3 w-3" />
                )}
            </Button>
            <span className="text-xs text-purple-700">Voice Note</span>
        </div>
    );
}

export function SupplierNCRPortal({ token }: SupplierNCRPortalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ncrData, setNcrData] = useState<NCRData | null>(null);
    const [response, setResponse] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    
    // File upload states
    const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; type: string }>>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Voice recording states
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [uploadingVoice, setUploadingVoice] = useState(false);
    const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchNCR();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [token]);

    const fetchNCR = async () => {
        try {
            const res = await fetch(`/api/ncr/reply?token=${token}`);
            const result = await res.json();

            if (result.success) {
                setNcrData(result.data);
            } else {
                setError(result.error || "Invalid or expired link");
            }
        } catch {
            setError("Failed to load NCR details");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitResponse = async () => {
        if (!response.trim() && !voiceNoteUrl && uploadedFiles.length === 0) {
            toast.error("Please enter a response, upload files, or record a voice note");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/ncr/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    content: response || (voiceNoteUrl ? "Voice note attached" : "Files attached"),
                    attachmentUrls: uploadedFiles.map(f => f.url),
                    voiceNoteUrl,
                }),
            });

            const result = await res.json();
            if (result.success) {
                toast.success("Response submitted successfully");
                setSubmitted(true);
                setResponse("");
                setUploadedFiles([]);
                setVoiceNoteUrl(null);
                discardRecording();
                // Refresh NCR data to show new comment
                fetchNCR();
            } else {
                toast.error(result.error || "Failed to submit response");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    // Voice Recording Functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            
            let mimeType = "audio/webm;codecs=opus";
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/webm";
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/mp4";
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";

            const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
            const mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const actualMimeType = mediaRecorder.mimeType || "audio/webm";
                const blob = new Blob(chunksRef.current, { type: actualMimeType });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(1000);
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
        } catch {
            toast.error("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const discardRecording = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingDuration(0);
    };

    const uploadVoiceNote = async () => {
        if (!audioBlob) return;
        setUploadingVoice(true);
        try {
            const mimeType = audioBlob.type || "audio/webm";
            const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "webm";
            const fileName = `voice-note-${Date.now()}.${ext}`;

            const presignRes = await fetch("/api/ncr/reply/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, fileName, fileType: mimeType, fileSize: audioBlob.size }),
            });

            if (!presignRes.ok) throw new Error("Failed to get upload URL");
            const { uploadUrl, fileUrl, contentType } = await presignRes.json();
            if (!uploadUrl) throw new Error("Failed to get upload URL");

            // Use the normalized content type from server for the S3 upload
            await fetch(uploadUrl, { method: "PUT", body: audioBlob, headers: { "Content-Type": contentType || mimeType.split(";")[0] } });
            setVoiceNoteUrl(fileUrl);
            discardRecording();
            toast.success("Voice note ready");
        } catch (error) {
            toast.error("Failed to upload voice note");
            console.error(error);
        } finally {
            setUploadingVoice(false);
        }
    };

    const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => toast.error("Playback failed"));
        }
    };

    // File Upload Functions
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const presignRes = await fetch("/api/ncr/reply/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, fileName: file.name, fileType: file.type, fileSize: file.size }),
                });

                if (!presignRes.ok) throw new Error("Failed to get upload URL");
                const { uploadUrl, fileUrl } = await presignRes.json();
                if (!uploadUrl) throw new Error("Failed to get upload URL");

                await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
                setUploadedFiles(prev => [...prev, { name: file.name, url: fileUrl, type: file.type }]);
            }
            toast.success("Files uploaded");
        } catch (error) {
            toast.error("Failed to upload file");
            console.error(error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeFile = (url: string) => {
        setUploadedFiles(prev => prev.filter(f => f.url !== url));
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Link Error</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <p className="text-sm text-muted-foreground mt-4">
                            Please contact your buyer for a new link.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!ncrData) {
        return null;
    }

    const severityConfig = SEVERITY_CONFIG[ncrData.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.MINOR;
    const SeverityIcon = severityConfig.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center text-white space-y-2">
                    <h1 className="text-2xl font-bold">Non-Conformance Report</h1>
                    <p className="text-slate-400">Response Portal</p>
                </div>

                {/* NCR Details Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    {ncrData.ncrNumber}
                                </CardTitle>
                                <p className="text-muted-foreground mt-1">
                                    PO: {ncrData.purchaseOrder?.poNumber || "N/A"}
                                </p>
                            </div>
                            <Badge className={`${severityConfig.color} text-white`}>
                                <SeverityIcon className="h-3 w-3 mr-1" />
                                {severityConfig.label}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Status */}
                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">Status:</span>
                            <span>{STATUS_LABELS[ncrData.status] || ncrData.status}</span>
                        </div>

                        {/* Issue Details */}
                        <div className="space-y-2">
                            <h3 className="font-semibold">{ncrData.title}</h3>
                            {ncrData.description && (
                                <p className="text-muted-foreground">{ncrData.description}</p>
                            )}
                        </div>

                        {/* Affected Item */}
                        {ncrData.affectedBoqItem && (
                            <div className="text-sm">
                                <span className="text-muted-foreground">Affected Item: </span>
                                <span>{ncrData.affectedBoqItem.description}</span>
                            </div>
                        )}

                        {/* Issue Type */}
                        <div className="text-sm">
                            <span className="text-muted-foreground">Issue Type: </span>
                            <span className="capitalize">{ncrData.issueType.replace(/_/g, " ").toLowerCase()}</span>
                        </div>

                        {/* Date */}
                        <div className="text-sm text-muted-foreground">
                            Reported: {format(new Date(ncrData.createdAt), "MMMM d, yyyy")}
                        </div>
                    </CardContent>
                </Card>

                {/* Previous Comments */}
                {ncrData.comments.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Discussion</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {ncrData.comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                        {comment.authorRole?.[0] || "?"}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-medium">{comment.authorRole}</span>
                                            <span className="text-muted-foreground">
                                                {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                            </span>
                                        </div>
                                        {comment.content && (
                                            <p className="text-sm mt-1">{comment.content}</p>
                                        )}
                                        
                                        {/* Voice Note */}
                                        {comment.voiceNoteUrl && (
                                            <div className="mt-2">
                                                <SupplierVoiceNotePlayer url={comment.voiceNoteUrl} />
                                            </div>
                                        )}
                                        
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
                                                        <FileText className="h-3 w-3" />
                                                        Attachment {i + 1}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Response Form */}
                {ncrData.status !== "CLOSED" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Your Response</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {submitted ? (
                                <div className="text-center py-6">
                                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                    <h3 className="font-semibold text-lg">Response Submitted</h3>
                                    <p className="text-muted-foreground mt-1">
                                        Thank you for your response. The buyer has been notified.
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => {
                                            setSubmitted(false);
                                            setResponse("");
                                            setUploadedFiles([]);
                                            setVoiceNoteUrl(null);
                                        }}
                                    >
                                        Add Another Response
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="response">
                                            Describe your corrective action or response
                                        </Label>
                                        <Textarea
                                            id="response"
                                            placeholder="Enter your response to this NCR..."
                                            value={response}
                                            onChange={(e) => setResponse(e.target.value)}
                                            rows={5}
                                        />
                                    </div>

                                    {/* Voice Recorder */}
                                    <div className="space-y-3">
                                        <Label>Voice Note (Optional)</Label>
                                        {!audioBlob && !voiceNoteUrl && (
                                            <div className="flex items-center gap-3">
                                                {isRecording ? (
                                                    <>
                                                        <Button onClick={stopRecording} variant="destructive" size="sm" className="gap-2">
                                                            <Square className="h-4 w-4" />
                                                            Stop Recording
                                                        </Button>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                            <span className="font-mono">{formatDuration(recordingDuration)}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Button onClick={startRecording} variant="outline" size="sm" className="gap-2">
                                                        <Mic className="h-4 w-4" />
                                                        Record Voice Note
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Audio Preview */}
                                        {audioBlob && audioUrl && (
                                            <div className="border rounded-lg p-3 bg-muted/30">
                                                <audio ref={audioRef} src={audioUrl} preload="auto" onEnded={() => setIsPlaying(false)} />
                                                <div className="flex items-center gap-3">
                                                    <Button onClick={togglePlayback} variant="ghost" size="sm">
                                                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                                    </Button>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">Voice Note</p>
                                                        <p className="text-xs text-muted-foreground">{formatDuration(recordingDuration)}</p>
                                                    </div>
                                                    <Button onClick={discardRecording} variant="ghost" size="sm" disabled={uploadingVoice}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                    <Button onClick={uploadVoiceNote} size="sm" disabled={uploadingVoice}>
                                                        {uploadingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                                                        {uploadingVoice ? "Uploading..." : "Confirm"}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Uploaded Voice Note - with playback */}
                                        {voiceNoteUrl && (
                                            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                <span className="text-sm text-green-800">Voice note ready</span>
                                                <div className="mx-2">
                                                    <SupplierVoiceNotePlayer url={voiceNoteUrl} />
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => setVoiceNoteUrl(null)} className="ml-auto h-6 w-6 p-0">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* File Upload */}
                                    <div className="space-y-3">
                                        <Label>Attachments (Optional)</Label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*,.pdf"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <div 
                                            className="border-2 border-dashed border-muted rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {uploading ? (
                                                <Loader2 className="h-8 w-8 text-muted-foreground mx-auto animate-spin" />
                                            ) : (
                                                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                            )}
                                            <p className="text-sm text-muted-foreground">
                                                {uploading ? "Uploading..." : "Click to upload photos or documents"}
                                            </p>
                                        </div>

                                        {/* Uploaded Files List */}
                                        {uploadedFiles.length > 0 && (
                                            <div className="space-y-2">
                                                {uploadedFiles.map((file) => (
                                                    <div key={file.url} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                                        {file.type.startsWith("image/") ? (
                                                            <ImageIcon className="h-4 w-4 text-blue-500" />
                                                        ) : (
                                                            <FileText className="h-4 w-4 text-orange-500" />
                                                        )}
                                                        <span className="text-sm truncate flex-1">{file.name}</span>
                                                        <Button variant="ghost" size="sm" onClick={() => removeFile(file.url)} className="h-6 w-6 p-0">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        className="w-full"
                                        onClick={handleSubmitResponse}
                                        disabled={submitting || (!response.trim() && !voiceNoteUrl && uploadedFiles.length === 0)}
                                    >
                                        {submitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Send className="h-4 w-4 mr-2" />
                                        )}
                                        Submit Response
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Closed NCR Message */}
                {ncrData.status === "CLOSED" && (
                    <Card>
                        <CardContent className="py-6 text-center">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                            <h3 className="font-semibold text-lg">NCR Resolved</h3>
                            <p className="text-muted-foreground mt-1">
                                This non-conformance has been closed.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Footer */}
                <div className="text-center text-slate-500 text-sm">
                    <p>This is a secure portal. Your responses are recorded.</p>
                </div>
            </div>
        </div>
    );
}
