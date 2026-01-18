"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    FileText,
    ArrowSquareOut,
    CheckCircle,
    Clock,
    XCircle,
    PlusCircle,
    ArrowRight,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { ChangeOrderForm } from "./change-order-form";

interface ClientInstruction {
    id: string;
    instructionNumber: string;
    dateReceived: string;
    type: string;
    description: string | null;
    attachmentUrl: string;
    status: string;
}

interface ClientInstructionListProps {
    projectId: string;
    purchaseOrderId: string;
    currentPOValue: number;
    milestones: any[];
    onCOCreated?: () => void;
}

export function ClientInstructionList({
    projectId,
    purchaseOrderId,
    currentPOValue,
    milestones,
    onCOCreated,
}: ClientInstructionListProps) {
    const router = useRouter();
    const [instructions, setInstructions] = useState<ClientInstruction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchInstructions = async () => {
        try {
            const response = await fetch(`/api/client-instructions?projectId=${projectId}`);
            const result = await response.json();
            if (result.success) {
                setInstructions(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch instructions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInstructions();
    }, [projectId]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING_ESTIMATE":
                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending Estimate</Badge>;
            case "COSTED":
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Costed</Badge>;
            case "APPROVED":
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
            case "REJECTED":
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">Client Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (instructions.length === 0) {
        return null; // Don't show if empty, or show a small empty state if preferred
    }

    return (
        <Card className="border-blue-100 bg-blue-50/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="text-blue-600" />
                            Client Instructions
                        </CardTitle>
                        <CardDescription>
                            Formal directives requiring variations or de-scopes
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {instructions.map((instruction) => (
                        <div
                            key={instruction.id}
                            className="p-4 bg-white border border-blue-100 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-blue-900">{instruction.instructionNumber}</span>
                                        {getStatusBadge(instruction.status)}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Clock size={12} />
                                        Received: {format(new Date(instruction.dateReceived), "MMM d, yyyy")}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" asChild>
                                    <a href={instruction.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                        <ArrowSquareOut size={18} />
                                    </a>
                                </Button>
                            </div>

                            <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                                {instruction.description || "No description provided."}
                            </p>

                            <div className="flex gap-2">
                                <ChangeOrderForm
                                    purchaseOrderId={purchaseOrderId}
                                    currentPOValue={currentPOValue}
                                    milestones={milestones}
                                    initialInstructionId={instruction.id}
                                    initialType="ADDITION"
                                    onSuccess={() => {
                                        fetchInstructions();
                                        router.refresh();
                                        onCOCreated?.();
                                    }}
                                    trigger={
                                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                                            <PlusCircle className="mr-2" />
                                            Scope Addition
                                        </Button>
                                    }
                                />
                                <ChangeOrderForm
                                    purchaseOrderId={purchaseOrderId}
                                    currentPOValue={currentPOValue}
                                    milestones={milestones}
                                    initialInstructionId={instruction.id}
                                    initialType="OMISSION"
                                    onSuccess={() => {
                                        fetchInstructions();
                                        router.refresh();
                                        onCOCreated?.();
                                    }}
                                    trigger={
                                        <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
                                            <ArrowRight className="mr-2" />
                                            Scope Omission
                                        </Button>
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
