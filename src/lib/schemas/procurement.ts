import { z } from "zod";

// ============================================================================
// PROCUREMENT SCHEMAS
// ============================================================================

export const createPOSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
    supplierId: z.string().uuid("Invalid supplier ID"),
    poNumber: z.string().min(1, "PO number is required"),
    totalValue: z.number().positive("Value must be positive"),
    currency: z.string().min(1).default("USD"),
    fileUrl: z.string().url("Invalid file URL").optional(),
});

export const updatePOSchema = z.object({
    id: z.string().uuid("Invalid PO ID"),
    projectId: z.string().uuid("Invalid project ID").optional(),
    supplierId: z.string().uuid("Invalid supplier ID").optional(),
    poNumber: z.string().min(1, "PO number is required").optional(),
    totalValue: z.number().positive("Value must be positive").optional(),
    currency: z.string().min(1).optional(),
    scope: z.string().optional(),
    paymentTerms: z.string().optional(),
    incoterms: z.string().optional(),
    retentionPercentage: z.number().min(0).max(100).optional(),
    milestones: z.array(z.object({
        id: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        expectedDate: z.string().optional(),
        paymentPercentage: z.number().min(0).max(100),
        sequenceOrder: z.number().int().optional(),
    })).optional(),
    boqItems: z.array(z.object({
        id: z.string().uuid().optional(),
        itemNumber: z.string().min(1),
        description: z.string().min(1),
        unit: z.string().min(1),
        quantity: z.number(),
        unitPrice: z.number(),
        totalPrice: z.number(),
        rosDate: z.string().optional(),
        isCritical: z.boolean().optional(),
        rosStatus: z.enum(["NOT_SET", "SET", "TBD"]).optional(),
    })).optional(),
});

export const updatePOVersionSchema = z.object({
    purchaseOrderId: z.string().uuid("Invalid PO ID"),
    fileUrl: z.string().url("Invalid file URL"),
    changeDescription: z.string().optional(),
});

export type CreatePOInput = z.infer<typeof createPOSchema>;
export type UpdatePOInput = z.infer<typeof updatePOSchema>;
export type UpdatePOVersionInput = z.infer<typeof updatePOVersionSchema>;
