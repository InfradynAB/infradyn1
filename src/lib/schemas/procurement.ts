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
    scope: z.string().optional().nullable(),
    paymentTerms: z.string().optional().nullable(),
    incoterms: z.string().optional().nullable(),
    retentionPercentage: z.number().min(0).max(100).optional().nullable(),
    fileUrl: z.string().url("Invalid file URL").optional(),
    milestones: z.array(z.object({
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        expectedDate: z.string().optional().nullable(),
        paymentPercentage: z.number().min(0).max(100),
        sequenceOrder: z.number().int().optional().nullable(),
    })).optional(),
    boqItems: z.array(z.object({
        itemNumber: z.string().nullable().transform(v => v ?? ""),
        description: z.string().nullable().transform(v => v ?? ""),
        unit: z.string().nullable().transform(v => v ?? "pcs"),
        quantity: z.number().nullable().transform(v => v ?? 0),
        unitPrice: z.number().nullable().transform(v => v ?? 0),
        totalPrice: z.number().nullable().transform(v => v ?? 0),
        rosDate: z.string().optional().nullable(),
        isCritical: z.boolean().optional().nullable(),
        rosStatus: z.enum(["NOT_SET", "SET", "TBD"]).optional().nullable(),
    })).optional(),
});

export const updatePOSchema = z.object({
    id: z.string().uuid("Invalid PO ID"),
    projectId: z.string().uuid("Invalid project ID").optional(),
    supplierId: z.string().uuid("Invalid supplier ID").optional(),
    poNumber: z.string().min(1, "PO number is required").optional(),
    totalValue: z.number().positive("Value must be positive").optional(),
    currency: z.string().min(1).optional(),
    scope: z.string().optional().nullable(),
    paymentTerms: z.string().optional().nullable(),
    incoterms: z.string().optional().nullable(),
    retentionPercentage: z.number().min(0).max(100).optional().nullable(),
    milestones: z.array(z.object({
        id: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        expectedDate: z.string().optional().nullable(),
        paymentPercentage: z.number().min(0).max(100),
        sequenceOrder: z.number().int().optional().nullable(),
    })).optional(),
    boqItems: z.array(z.object({
        id: z.string().uuid().optional(),
        itemNumber: z.string().nullable().transform(v => v ?? ""),
        description: z.string().nullable().transform(v => v ?? ""),
        unit: z.string().nullable().transform(v => v ?? "pcs"),
        quantity: z.number().nullable().transform(v => v ?? 0),
        unitPrice: z.number().nullable().transform(v => v ?? 0),
        totalPrice: z.number().nullable().transform(v => v ?? 0),
        rosDate: z.string().optional().nullable(),
        isCritical: z.boolean().optional().nullable(),
        rosStatus: z.enum(["NOT_SET", "SET", "TBD"]).optional().nullable(),
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
