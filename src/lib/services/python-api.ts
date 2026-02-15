/**
 * Python Services API Client
 * 
 * This client communicates with the Python FastAPI microservices
 * for AI extraction, KPI calculations, and report generation.
 */

function resolvePythonServiceUrl(): string {
    const configuredUrl = process.env.PYTHON_SERVICE_URL?.trim();

    if (!configuredUrl) {
        return "http://localhost:8000";
    }

    if (/^https?:\/\//i.test(configuredUrl)) {
        return configuredUrl.replace(/\/+$/, "");
    }

    const normalizedWithScheme = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i.test(configuredUrl)
        ? `http://${configuredUrl}`
        : `https://${configuredUrl}`;

    return normalizedWithScheme.replace(/\/+$/, "");
}

const PYTHON_SERVICE_URL = resolvePythonServiceUrl();

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

// ============================================================================
// SHIPMENT EXTRACTION TYPES
// ============================================================================

export interface PythonExtractedShipmentPackage {
    package_no: string;
    length_m: number | null;
    quantity: number;
    total_area_m2: number | null;
    gross_weight_kg: number | null;
}

export interface PythonExtractedShipmentItem {
    article_number: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number | null;
    total_price: number | null;
    weight_kg: number | null;
    hs_code: string | null;
    country_of_origin: string | null;
    delivery_note: string | null;
    packages: PythonExtractedShipmentPackage[];
}

export interface PythonExtractedShipmentData {
    order_number: string | null;
    project: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    supplier_name: string | null;
    customer_name: string | null;
    delivery_conditions: string | null;
    delivery_address: string | null;
    origin: string | null;
    destination: string | null;
    currency: string | null;
    total_excl_vat: number | null;
    total_incl_vat: number | null;
    vat_percentage: number | null;
    total_gross_weight_kg: number | null;
    total_net_weight_kg: number | null;
    items: PythonExtractedShipmentItem[];
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

/**
 * Extract shipment/packing list data by uploading file to Python service
 */
export async function extractShipmentWithPython(
    formData: FormData
): Promise<PythonServiceResponse<PythonExtractedShipmentData>> {
    try {
        console.log("[Python API] Extracting shipment document...");

        const response = await fetch(
            `${PYTHON_SERVICE_URL}/api/extraction/upload?document_type=shipment`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Python API] Shipment extraction error:", errorText);
            return { success: false, error: `Python service error: ${response.status}` };
        }

        const result = await response.json();
        console.log("[Python API] Shipment extraction result:", {
            success: result.success,
            itemCount: result.data?.items?.length ?? 0,
            confidence: result.data?.confidence,
        });

        return result;
    } catch (error) {
        console.error("[Python API] Shipment extraction connection error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to connect to Python service",
        };
    }
}

/**
 * Convert Python shipment response to TypeScript camelCase format
 */
export function convertPythonShipmentToTypeScript(data: PythonExtractedShipmentData) {
    return {
        orderNumber: data.order_number,
        project: data.project,
        invoiceNumber: data.invoice_number,
        invoiceDate: data.invoice_date,
        supplierName: data.supplier_name,
        customerName: data.customer_name,
        deliveryConditions: data.delivery_conditions,
        deliveryAddress: data.delivery_address,
        origin: data.origin,
        destination: data.destination,
        currency: data.currency,
        totalExclVat: data.total_excl_vat,
        totalInclVat: data.total_incl_vat,
        vatPercentage: data.vat_percentage,
        totalGrossWeightKg: data.total_gross_weight_kg,
        totalNetWeightKg: data.total_net_weight_kg,
        items: data.items.map(item => ({
            articleNumber: item.article_number,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
            weightKg: item.weight_kg,
            hsCode: item.hs_code,
            countryOfOrigin: item.country_of_origin,
            deliveryNote: item.delivery_note,
            packages: item.packages.map(pkg => ({
                packageNo: pkg.package_no,
                lengthM: pkg.length_m,
                quantity: pkg.quantity,
                totalAreaM2: pkg.total_area_m2,
                grossWeightKg: pkg.gross_weight_kg,
            })),
        })),
        confidence: data.confidence,
        rawText: data.raw_text,
    };
}

// ============================================================================
// KPI ENGINE CLIENT
// ============================================================================

interface KPIFilters {
    organizationId: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
}

/**
 * Fetch all dashboard KPIs from Python service
 */
export async function fetchDashboardKPIs(filters: KPIFilters) {
    try {
        const response = await fetch(`${PYTHON_SERVICE_URL}/api/kpi/dashboard`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                organization_id: filters.organizationId,
                project_id: filters.projectId,
                date_from: filters.dateFrom,
                date_to: filters.dateTo,
            }),
        });

        if (!response.ok) {
            return { success: false, error: `Python service error: ${response.status}` };
        }

        return await response.json();
    } catch (error) {
        console.error("[Python API] KPI fetch error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to connect to Python service",
        };
    }
}

/**
 * Fetch S-Curve data for planned vs actual spend chart
 */
export async function fetchSCurveData(filters: KPIFilters) {
    try {
        const response = await fetch(`${PYTHON_SERVICE_URL}/api/kpi/scurve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                organization_id: filters.organizationId,
                project_id: filters.projectId,
                date_from: filters.dateFrom,
                date_to: filters.dateTo,
            }),
        });

        if (!response.ok) {
            return { success: false, error: `Python service error: ${response.status}` };
        }

        return await response.json();
    } catch (error) {
        console.error("[Python API] S-Curve fetch error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to connect to Python service",
        };
    }
}
