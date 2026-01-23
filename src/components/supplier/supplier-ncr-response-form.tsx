"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, CheckCircle, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EvidenceUpload } from "@/components/ncr/evidence-upload";

interface UploadedFile {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
}

interface SupplierNCRResponseFormProps {
    ncrId: string;
}

export function SupplierNCRResponseForm({ ncrId }: SupplierNCRResponseFormProps) {
    const [response, setResponse] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [attachments, setAttachments] = useState<UploadedFile[]>([]);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!response.trim() && attachments.length === 0) {
            toast.error("Please enter a response or attach files");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/ncr/${ncrId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: response || null,
                    authorRole: "SUPPLIER",
                    attachmentUrls: attachments.map(a => a.url),
                }),
            });

            const result = await res.json();
            if (result.success) {
                toast.success("Response submitted successfully");
                setSubmitted(true);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to submit response");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFilesUploaded = (files: UploadedFile[]) => {
        setAttachments(files);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) {
            return <ImageIcon className="h-4 w-4 text-blue-500" />;
        }
        return <FileText className="h-4 w-4 text-orange-500" />;
    };

    if (submitted) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardContent className="py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg">Response Submitted</h3>
                    <p className="text-muted-foreground mt-1">
                        Thank you. The procurement team has been notified.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                            setSubmitted(false);
                            setResponse("");
                            setAttachments([]);
                        }}
                    >
                        Add Another Response
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Your Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="response">
                        Describe your corrective action or response to this issue
                    </Label>
                    <Textarea
                        id="response"
                        placeholder="Enter your response..."
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        rows={5}
                        className="resize-none"
                    />
                </div>

                {/* Uploaded Attachments */}
                {attachments.length > 0 && (
                    <div className="space-y-2">
                        <Label>Attached Files</Label>
                        <div className="flex flex-wrap gap-2">
                            {attachments.map((file, index) => (
                                <Badge key={file.id} variant="secondary" className="flex items-center gap-1 pr-1">
                                    {getFileIcon(file.type)}
                                    <span className="max-w-[120px] truncate">{file.name}</span>
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
                    </div>
                )}

                {/* Evidence Upload */}
                <div className="space-y-2">
                    <Label>Attach Repair Certificate or Photos</Label>
                    <EvidenceUpload
                        ncrId={ncrId}
                        onUploadComplete={handleFilesUploaded}
                        maxFiles={5}
                    />
                </div>

                <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={submitting || (!response.trim() && attachments.length === 0)}
                >
                    {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Response
                </Button>
            </CardContent>
        </Card>
    );
}
