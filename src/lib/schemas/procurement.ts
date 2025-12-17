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

export const updatePOVersionSchema = z.object({
    purchaseOrderId: z.string().uuid("Invalid PO ID"),
    fileUrl: z.string().url("Invalid file URL"),
    changeDescription: z.string().optional(),
});

export type CreatePOInput = z.infer<typeof createPOSchema>;
export type UpdatePOVersionInput = z.infer<typeof updatePOVersionSchema>;
