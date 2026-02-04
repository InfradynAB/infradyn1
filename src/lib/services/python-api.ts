/**
 * Python Services API Client
 * 
 * This client communicates with the Python FastAPI microservices
 * for AI extraction, KPI calculations, and report generation.
 */

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

interface PythonServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

interface ExtractedMilestone {
    title: string;
    description?: string | null;
    expected_date?: string | null;
    payment_percentage: number;
}

interface ExtractedBOQItem {
    item_number: string;
    description: string;
    unit: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface PythonExtractedPOData {
    po_number: string | null;
    vendor_name: string | null;
    date: string | null;
    total_value: number | null;
    currency: string | null;
    scope: string | null;
    payment_terms: string | null;
    incoterms: string | null;
    retention_percentage: number | null;
    milestones: ExtractedMilestone[];
    boq_items: ExtractedBOQItem[];
    confidence: number;
    raw_text?: string;
}

interface PythonExtractedInvoiceData {
    invoice_number: string | null;
    vendor_name: string | null;
    date: string | null;
    due_date: string | null;
    total_amount: number | null;
    currency: string | null;
    line_items: Array<{
        description: string;
        quantity?: number;
        unit_price?: number;
        amount: number;
    }>;
    tax_amount?: number;
    subtotal?: number;
    confidence: number;
    raw_text?: string;
}

// Cache the health check result for 30 seconds
let pythonHealthCache: { available: boolean; timestamp: number } | null = null;
const HEALTH_CACHE_TTL = 30000; // 30 seconds

/**
 * Check if the Python service is available (cached for 30s)
 */
export async function isPythonServiceAvailable(): Promise<boolean> {
    // Return cached result if still valid
    if (pythonHealthCache && Date.now() - pythonHealthCache.timestamp < HEALTH_CACHE_TTL) {
        return pythonHealthCache.available;
    }

    try {
        const response = await fetch(`${PYTHON_SERVICE_URL}/health`, {
            method: "GET",
            signal: AbortSignal.timeout(8000), // 8 second timeout
        });
        const available = response.ok;
        pythonHealthCache = { available, timestamp: Date.now() };
        return available;
    } catch {
        pythonHealthCache = { available: false, timestamp: Date.now() };
        return false;
    }
}

/**
 * Extract Purchase Order data from a file URL using Python service
 */
export async function extractPOWithPython(
    fileUrl: string
): Promise<PythonServiceResponse<PythonExtractedPOData>> {
    try {
        console.log("[Python API] Extracting PO from:", fileUrl);

        const response = await fetch(`${PYTHON_SERVICE_URL}/api/extraction/document`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                file_url: fileUrl,
                document_type: "purchase_order",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Python API] Error response:", errorText);
            return { success: false, error: `Python service error: ${response.status}` };
        }

        const result = await response.json();
        console.log("[Python API] Extraction result:", {
            success: result.success,
            hasData: !!result.data,
            poNumber: result.data?.po_number,
        });

        return result;
    } catch (error) {
        console.error("[Python API] Connection error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to connect to Python service",
        };
    }
}

/**
 * Extract Invoice data from a file URL using Python service
 */
export async function extractInvoiceWithPython(
    fileUrl: string
): Promise<PythonServiceResponse<PythonExtractedInvoiceData>> {
    try {
        console.log("[Python API] Extracting invoice from:", fileUrl);

        const response = await fetch(`${PYTHON_SERVICE_URL}/api/extraction/document`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                file_url: fileUrl,
                document_type: "invoice",
            }),
        });

        if (!response.ok) {
            return { success: false, error: `Python service error: ${response.status}` };
        }

        return await response.json();
    } catch (error) {
        console.error("[Python API] Invoice extraction error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to connect to Python service",
        };
    }
}

/**
 * Extract Milestones from a file URL using Python service
 */
export async function extractMilestonesWithPython(
    fileUrl: string
): Promise<PythonServiceResponse<{ milestones: ExtractedMilestone[] }>> {
    try {
        console.log("[Python API] Extracting milestones from:", fileUrl);

        const response = await fetch(`${PYTHON_SERVICE_URL}/api/extraction/milestones`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                file_url: fileUrl,
            }),
        });

        if (!response.ok) {
            return { success: false, error: `Python service error: ${response.status}` };
        }

        return await response.json();
    } catch (error) {
        console.error("[Python API] Milestone extraction error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to connect to Python service",
        };
    }
}

/**
 * Convert Python snake_case response to TypeScript camelCase format
 */
export function convertPythonPOToTypeScript(data: PythonExtractedPOData) {
    return {
        poNumber: data.po_number,
        vendorName: data.vendor_name,
        date: data.date,
        totalValue: data.total_value,
        currency: data.currency,
        scope: data.scope,
        paymentTerms: data.payment_terms,
        incoterms: data.incoterms,
        retentionPercentage: data.retention_percentage,
        milestones: data.milestones.map(m => ({
            title: m.title,
            description: m.description,
            expectedDate: m.expected_date,
            paymentPercentage: m.payment_percentage,
        })),
        boqItems: data.boq_items.map(b => ({
            itemNumber: b.item_number,
            description: b.description,
            unit: b.unit,
            quantity: b.quantity,
            unitPrice: b.unit_price,
            totalPrice: b.total_price,
        })),
        confidence: data.confidence,
        rawText: data.raw_text,
    };
}

/**
 * Convert Python invoice response to TypeScript format
 */
export function convertPythonInvoiceToTypeScript(data: PythonExtractedInvoiceData) {
    return {
        invoiceNumber: data.invoice_number,
        vendorName: data.vendor_name,
        date: data.date,
        dueDate: data.due_date,
        totalAmount: data.total_amount,
        currency: data.currency,
        lineItems: data.line_items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            amount: item.amount,
        })),
        taxAmount: data.tax_amount,
        subtotal: data.subtotal,
        confidence: data.confidence,
        rawText: data.raw_text,
    };
}

/**
 * Convert Python milestone response to TypeScript format
 */
export function convertPythonMilestonesToTypeScript(milestones: ExtractedMilestone[]) {
    return milestones.map(m => ({
        title: m.title,
        description: m.description || undefined,
        expectedDate: m.expected_date || undefined,
        paymentPercentage: m.payment_percentage,
    }));
}
