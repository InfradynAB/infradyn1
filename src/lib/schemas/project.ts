import { z } from "zod";

export const createProjectSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    code: z.string().optional(), // Could be auto-generated or manual
    organizationId: z.string().uuid("Organization ID is required"),
    budget: z.string().optional(), // Input as string, convert to numeric
    location: z.string().optional(),
    currency: z.string().default("USD"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    materialCategories: z.string().optional(), // JSON string
}).refine((data) => {
    if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end >= start;
    }
    return true;
}, {
    message: "End date cannot be before start date",
    path: ["endDate"],
});
