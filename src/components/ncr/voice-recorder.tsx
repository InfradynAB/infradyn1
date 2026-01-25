"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Trash2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
    ncrId: string;
    token?: string; // Magic link token for supplier uploads
    onRecordingComplete: (audioUrl: string) => void;
}

export function VoiceRecorder({ ncrId, token, onRecordingComplete }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [duration, setDuration] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                }
            });
            
            // Try to use the best supported format
            let mimeType = "audio/webm;codecs=opus";
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = "audio/webm";
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = "audio/mp4";
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = ""; // Let browser choose
            }

            const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
            const mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Use the actual mimeType from the recorder
                const actualMimeType = mediaRecorder.mimeType || "audio/webm";
                const blob = new Blob(chunksRef.current, { type: actualMimeType });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                stream.getTracks().forEach(track => track.stop());
            };

            // Use timeslice to get data more frequently for better recording
            mediaRecorder.start(1000);
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);
        } catch (error) {
            toast.error("Could not access microphone. Please check permissions.");
            console.error("Microphone error:", error);
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

    const togglePlayback = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch((error) => {
                    console.error("Playback error:", error);
                    toast.error("Could not play audio");
                });
        }
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
    };

    const discardRecording = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
    };

    const uploadRecording = async () => {
        if (!audioBlob) return;

        setUploading(true);
        try {
            const mimeType = audioBlob.type || "audio/webm";
            const ext = mimeType.includes("webm") ? "webm" : 
                       mimeType.includes("mp4") ? "mp4" : 
                       mimeType.includes("ogg") ? "ogg" : "webm";
            const fileName = `voice-note-${Date.now()}.${ext}`;

            // Determine which endpoint to use based on token availability
            const uploadEndpoint = token 
                ? "/api/ncr/reply/upload"  // Token-based for suppliers
                : `/api/ncr/${ncrId}/upload`;  // Session-based for internal users

            const requestBody = token
                ? { token, fileName, fileType: mimeType, fileSize: audioBlob.size }
                : { fileName, fileType: mimeType, fileSize: audioBlob.size };

            // Get presigned URL
            const presignRes = await fetch(uploadEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!presignRes.ok) {
                const errorData = await presignRes.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${presignRes.status}`);
            }

            const { uploadUrl, fileUrl, contentType, error } = await presignRes.json();

            if (error) throw new Error(error);
            if (!uploadUrl) throw new Error("Failed to get upload URL");

            // Upload to S3 - use the normalized content type from server
            const uploadContentType = contentType || mimeType.split(";")[0].trim();
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                body: audioBlob,
                headers: { "Content-Type": uploadContentType },
            });

            if (!uploadRes.ok) {
                throw new Error(`Upload failed: ${uploadRes.status}`);
            }

            onRecordingComplete(fileUrl);
            discardRecording();
            toast.success("Voice note uploaded");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to upload voice note");
        } finally {
            setUploading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="space-y-3">
            {/* Recording Controls */}
            {!audioBlob && (
                <div className="flex items-center gap-3">
                    {isRecording ? (
                        <>
                            <Button
                                onClick={stopRecording}
                                variant="destructive"
                                size="sm"
                                className="gap-2"
                            >
                                <Square className="h-4 w-4" />
                                Stop
                            </Button>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <span className="font-mono">{formatDuration(duration)}</span>
                            </div>
                        </>
                    ) : (
                        <Button
                            onClick={startRecording}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            <Mic className="h-4 w-4" />
                            Record Voice Note
                        </Button>
                    )}
                </div>
            )}

            {/* Playback & Upload */}
            {audioBlob && audioUrl && (
                <Card className="p-3">
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        preload="auto"
                        onEnded={handleAudioEnded}
                        onError={(e) => {
                            console.error("Audio playback error:", e);
                            toast.error("Could not play audio");
                        }}
                    />
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={togglePlayback}
                            variant="ghost"
                            size="sm"
                        >
                            {isPlaying ? (
                                <Pause className="h-4 w-4" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                        </Button>

                        <div className="flex-1">
                            <p className="text-sm font-medium">Voice Note</p>
                            <p className="text-xs text-muted-foreground">
                                {formatDuration(duration)}
                            </p>
                        </div>

                        <Button
                            onClick={discardRecording}
                            variant="ghost"
                            size="sm"
                            disabled={uploading}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>

                        <Button
                            onClick={uploadRecording}
                            size="sm"
                            disabled={uploading}
                        >
                            {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-1" />
                                    Upload
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}

// Audio Player Component for displaying uploaded voice notes
export function VoiceNotePlayer({ url }: { url: string }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [duration, setDuration] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Convert S3 URLs to use our proxy endpoint to bypass CORS
    const getProxyUrl = (originalUrl: string) => {
        // If it's a blob URL (local recording preview), use as-is
        if (originalUrl.startsWith("blob:")) {
            return originalUrl;
        }
        
        // If it's already our API route, use as-is
        if (originalUrl.startsWith("/api/audio/")) {
            return originalUrl;
        }
        
        // Extract S3 key from URL
        // Format: https://bucket.s3.region.amazonaws.com/ncr/123/supplier/file.webm
        try {
            const urlObj = new URL(originalUrl);
            const key = urlObj.pathname.slice(1); // Remove leading slash
            if (key) {
                return `/api/audio/${key}`;
            }
        } catch {
            // URL parsing failed, try regex extraction
            const match = originalUrl.match(/amazonaws\.com\/(.+)$/);
            if (match?.[1]) {
                return `/api/audio/${match[1]}`;
            }
        }
        
        // Fallback to original URL
        return originalUrl;
    };

    const audioSrc = getProxyUrl(url);

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

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            const dur = audioRef.current.duration;
            // Only set if valid (not Infinity, NaN, or 0)
            if (isFinite(dur) && dur > 0) {
                setDuration(dur);
            }
        }
    };

    const handleError = () => {
        console.error("Audio load error for URL:", url);
        setError(true);
    };

    const formatTime = (seconds: number) => {
        // Handle invalid duration values
        if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
            return null;
        }
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
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
                onLoadedMetadata={handleLoadedMetadata}
                onError={handleError}
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
            <span className="text-xs text-purple-700">
                Voice Note{duration && formatTime(duration) ? ` (${formatTime(duration)})` : ""}
            </span>
        </div>
    );
}
