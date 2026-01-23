"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Upload, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SupplierNCRResponseFormProps {
    ncrId: string;
}

export function SupplierNCRResponseForm({ ncrId }: SupplierNCRResponseFormProps) {
    const [response, setResponse] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!response.trim()) {
            toast.error("Please enter a response");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/ncr/${ncrId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: response,
                    authorRole: "SUPPLIER",
                }),
            });

            const result = await res.json();
            if (result.success) {
                toast.success("Response submitted successfully");
                setSubmitted(true);
                // Refresh to show new comment
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

                {/* File Upload Placeholder */}
                <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Attach repair certificate or photos (coming soon)
                    </p>
                </div>

                <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={submitting || !response.trim()}
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
