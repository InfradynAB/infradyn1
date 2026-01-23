"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Trash2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
    ncrId: string;
    onRecordingComplete: (audioUrl: string) => void;
}

export function VoiceRecorder({ ncrId, onRecordingComplete }: VoiceRecorderProps) {
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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "audio/mp4"
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(100);
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);
        } catch (error) {
            toast.error("Could not access microphone");
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
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
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
            const ext = mimeType.includes("webm") ? "webm" : "mp4";
            const fileName = `voice-note-${Date.now()}.${ext}`;

            // Get presigned URL
            const presignRes = await fetch(`/api/ncr/${ncrId}/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName,
                    fileType: mimeType,
                    fileSize: audioBlob.size,
                }),
            });

            const { uploadUrl, fileUrl } = await presignRes.json();

            if (!uploadUrl) throw new Error("Failed to get upload URL");

            // Upload to S3
            await fetch(uploadUrl, {
                method: "PUT",
                body: audioBlob,
                headers: { "Content-Type": mimeType },
            });

            onRecordingComplete(fileUrl);
            discardRecording();
            toast.success("Voice note uploaded");
        } catch (error) {
            toast.error("Failed to upload voice note");
            console.error("Upload error:", error);
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
                        onEnded={handleAudioEnded}
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
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="inline-flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full">
            <audio ref={audioRef} src={url} onEnded={() => setIsPlaying(false)} />
            <Button onClick={togglePlay} variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            <span className="text-xs text-purple-700">Voice Note</span>
        </div>
    );
}
