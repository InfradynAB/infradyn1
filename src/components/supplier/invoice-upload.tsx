"use client";

/**
 * Supplier Invoice Upload Component
 * Wrapper for InvoiceUploadDialog used in supplier portal
 */

import { Button } from "@/components/ui/button";
import { Invoice } from "@phosphor-icons/react";
import { InvoiceUploadDialog } from "@/components/procurement/invoice-upload-dialog";

interface Milestone {
    id: string;
    title: string;
    amount?: string;
    paymentPercentage: string;
    status: string;
}

interface SupplierInvoiceUploadProps {
    purchaseOrderId: string;
    supplierId: string;
    milestones: Milestone[];
    poTotalValue: number;
    currency?: string;
    onSuccess?: () => void;
}

export function SupplierInvoiceUpload({
    purchaseOrderId,
    supplierId,
    milestones,
    poTotalValue,
    currency = "USD",
    onSuccess,
}: SupplierInvoiceUploadProps) {
    return (
        <InvoiceUploadDialog
            purchaseOrderId={purchaseOrderId}
            supplierId={supplierId}
            milestones={milestones}
            poTotalValue={poTotalValue}
            currency={currency}
            onSuccess={onSuccess}
            trigger={
                <Button className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2">
                    <Invoice className="h-4 w-4" weight="bold" />
                    Upload Invoice
                </Button>
            }
        />
    );
}
