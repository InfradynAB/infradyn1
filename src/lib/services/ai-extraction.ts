import {
    TextractClient,
    StartDocumentTextDetectionCommand,
    GetDocumentTextDetectionCommand,
    DetectDocumentTextCommand,
} from "@aws-sdk/client-textract";
import OpenAI from "openai";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { getFileBuffer, extractS3KeyFromUrl } from "./s3";

// Initialize clients
const textractClient = new TextractClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Types
export interface ExtractedMilestone {
    title: string;
    description?: string;
    expectedDate?: string; // ISO date
    paymentPercentage: number;
}

export interface ExtractedBOQItem {
    itemNumber: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface ExtractedPOData {
    // Basic fields
    poNumber: string | null;
    vendorName: string | null;
    date: string | null;
    totalValue: number | null;
    currency: string | null;
    // Extended fields
    scope: string | null;
    paymentTerms: string | null;
    incoterms: string | null;
    retentionPercentage: number | null;
    // Related data
    milestones: ExtractedMilestone[];
    boqItems: ExtractedBOQItem[];
    // Meta
    confidence: number;
    rawText?: string;
}

export interface ExtractionResult {
    success: boolean;
    data?: ExtractedPOData;
    error?: string;
}

/**
 * Helper to wait for a specified time
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract text from a Word document (.doc, .docx) using mammoth
 */
async function extractTextFromWord(
    buffer: Buffer
): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        console.log("[Word Extract] Starting Word document text extraction");
        const result = await mammoth.extractRawText({ buffer });

        if (result.value) {
            console.log(`[Word Extract] Extracted ${result.value.length} characters`);
            return { success: true, text: result.value };
        }

        return { success: false, error: "No text content found in Word document" };
    } catch (error: any) {
        console.error("[Word Extract] Error:", error);
        return { success: false, error: error.message || "Failed to extract text from Word document" };
    }
}

/**
 * Extract text from a single-page image using AWS Textract (Synchronous API)
 */
async function extractTextWithTextractSync(
    s3Bucket: string,
    s3Key: string
): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        console.log(`[Textract] Starting sync text detection: s3://${s3Bucket}/${s3Key}`);

        const command = new DetectDocumentTextCommand({
            Document: {
                S3Object: {
                    Bucket: s3Bucket,
                    Name: s3Key,
                },
            },
        });

        const response = await textractClient.send(command);

        const extractedText = (response.Blocks || [])
            .filter((block) => block.BlockType === "LINE")
            .map((block) => block.Text)
            .join("\n");

        console.log(`[Textract] Sync extraction complete: ${extractedText.length} characters`);
        return { success: true, text: extractedText };
    } catch (error: any) {
        console.error("[Textract Sync] Error:", error);
        return { success: false, error: error.message || "Sync extraction failed" };
    }
}

/**
 * Extract text from a multi-page PDF using AWS Textract (Asynchronous API)
 */
async function extractTextWithTextractAsync(
    s3Bucket: string,
    s3Key: string
): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        console.log(`[Textract] Starting async text detection: s3://${s3Bucket}/${s3Key}`);

        // Start the async job
        const startCommand = new StartDocumentTextDetectionCommand({
            DocumentLocation: {
                S3Object: {
                    Bucket: s3Bucket,
                    Name: s3Key,
                },
            },
        });

        const startResponse = await textractClient.send(startCommand);
        const jobId = startResponse.JobId;

        if (!jobId) {
            return { success: false, error: "Failed to start Textract job" };
        }

        console.log(`[Textract] Job started: ${jobId}`);

        // Poll for completion (max 3 minutes for large multi-page PDFs)
        let status = "IN_PROGRESS";
        let attempts = 0;
        const maxAttempts = 90; // 90 attempts * 2 seconds = 180 seconds (3 min) max
        let allBlocks: any[] = [];

        while (status === "IN_PROGRESS" && attempts < maxAttempts) {
            await sleep(2000); // Wait 2 seconds between polls
            attempts++;

            // Log progress every 10 attempts
            if (attempts % 10 === 0) {
                console.log(`[Textract] Still processing... (${attempts * 2}s elapsed)`);
            }

            const getCommand = new GetDocumentTextDetectionCommand({
                JobId: jobId,
            });

            const getResponse = await textractClient.send(getCommand);
            status = getResponse.JobStatus || "FAILED";

            if (status === "SUCCEEDED") {
                // Collect blocks from this response
                if (getResponse.Blocks) {
                    allBlocks = allBlocks.concat(getResponse.Blocks);
                }

                // Handle pagination if there are more results
                let nextToken = getResponse.NextToken;
                while (nextToken) {
                    const pageCommand = new GetDocumentTextDetectionCommand({
                        JobId: jobId,
                        NextToken: nextToken,
                    });
                    const pageResponse = await textractClient.send(pageCommand);
                    if (pageResponse.Blocks) {
                        allBlocks = allBlocks.concat(pageResponse.Blocks);
                    }
                    nextToken = pageResponse.NextToken;
                }
            } else if (status === "FAILED") {
                return { success: false, error: "Textract job failed" };
            }

            console.log(`[Textract] Poll ${attempts}: ${status}`);
        }

        if (status !== "SUCCEEDED") {
            return { success: false, error: "Textract job timed out" };
        }

        // Extract lines of text
        const extractedText = allBlocks
            .filter((block) => block.BlockType === "LINE")
            .map((block) => block.Text)
            .join("\n");

        console.log(`[Textract] Extracted ${extractedText.length} characters from ${allBlocks.length} blocks`);

        return { success: true, text: extractedText };
    } catch (error: any) {
        console.error("[Textract Async] Error:", error);
        return { success: false, error: error.message || "Async extraction failed" };
    }
}

/**
 * Extract text from a PDF/Image using AWS Textract
 * Automatically handles JPG/PNG using sync API and PDF using async API.
 */
export async function extractTextWithTextract(
    s3Bucket: string,
    s3Key: string
): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        const extension = s3Key.split('.').pop()?.toLowerCase();
        const isImage = ["png", "jpg", "jpeg"].includes(extension || "");

        if (isImage) {
            return await extractTextWithTextractSync(s3Bucket, s3Key);
        } else {
            return await extractTextWithTextractAsync(s3Bucket, s3Key);
        }
    } catch (error: any) {
        console.error("[Textract Entry] Error:", error);

        let message = "Textract extraction failed";
        if (error.__type === "SubscriptionRequiredException") {
            message = "AWS Textract subscription required. Please activate it in the AWS Console.";
        } else if (error.__type === "UnsupportedDocumentException") {
            message = "The document format is not supported. Please use PDF, PNG, or JPEG.";
        } else if (error.message) {
            message = error.message;
        }

        return {
            success: false,
            error: message,
        };
    }
}

/**
 * Parse extracted text using GPT-4 to get structured PO data
 */
export async function parseWithGPT(rawText: string): Promise<ExtractionResult> {
    try {
        console.log("[GPT] Parsing extracted text...");

        const systemPrompt = `You are a document parsing assistant specialized in extracting comprehensive data from Purchase Order (PO) documents.

Extract ALL of the following fields from the provided text:

**Basic PO Information:**
- poNumber: The unique PO identifier
- vendorName: The supplier/vendor company name
- date: The PO date (ISO format YYYY-MM-DD)
- totalValue: The total PO amount (number only, no currency symbols)
- currency: Currency code (USD, EUR, GBP, KES, etc.)

**Contract Terms:**
- scope: Brief description of the project scope or what is being purchased
- paymentTerms: Payment conditions (e.g., "Net 30", "50% advance, 50% on delivery")
- incoterms: Trade terms if present (e.g., "FOB", "CIF", "DDP", "EXW")
- retentionPercentage: Retention/holdback percentage if specified (number only)

**Milestones (if present):**
Extract any payment milestones, delivery stages, or project phases. Each milestone should have:
- title: Name of the milestone
- description: Brief description (optional)
- expectedDate: Date in YYYY-MM-DD format (optional)
- paymentPercentage: Payment % for this milestone (number)

**BOQ/Line Items (if present):**
Extract Bill of Quantities or line items. Each item should have:
- itemNumber: Item number or code
- description: Item description
- unit: Unit of measurement (EA, KG, M, L, etc.)
- quantity: Quantity (number)
- unitPrice: Price per unit (number)
- totalPrice: Total price for this line (number)

Respond ONLY with valid JSON in this exact format:
{
  "poNumber": "string or null",
  "vendorName": "string or null",
  "date": "YYYY-MM-DD or null",
  "totalValue": number or null,
  "currency": "string or null",
  "scope": "string or null",
  "paymentTerms": "string or null",
  "incoterms": "string or null",
  "retentionPercentage": number or null,
  "milestones": [
    {"title": "string", "description": "string or null", "expectedDate": "YYYY-MM-DD or null", "paymentPercentage": number}
  ],
  "boqItems": [
    {"itemNumber": "string", "description": "string", "unit": "string", "quantity": number, "unitPrice": number, "totalPrice": number}
  ],
  "confidence": 0.0-1.0
}

Rules:
- Set fields to null if not found
- milestones and boqItems should be empty arrays [] if none found
- **BOQ Filtering**: DO NOT extract any line items that are explicitly marked as "Optional" or "Alternative" in the document. These should be skipped entirely.
- BOQ item totalPrice should be quantity * unitPrice if not explicitly stated
- Confidence (0-1) reflects overall extraction quality`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Extract all PO data from this document text:\n\n${rawText.slice(0, 12000)}` },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            return { success: false, error: "No response from GPT" };
        }

        const parsed = JSON.parse(content) as ExtractedPOData;
        parsed.rawText = rawText.slice(0, 500); // Include preview of raw text

        // Ensure arrays exist
        if (!parsed.milestones) parsed.milestones = [];
        if (!parsed.boqItems) parsed.boqItems = [];

        console.log("[GPT] Extraction complete:", {
            poNumber: parsed.poNumber,
            vendor: parsed.vendorName,
            scope: parsed.scope?.slice(0, 50),
            milestones: parsed.milestones.length,
            boqItems: parsed.boqItems.length,
            confidence: parsed.confidence,
        });

        return { success: true, data: parsed };
    } catch (error) {
        console.error("[GPT] Parse error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "GPT parsing failed",
        };
    }
}

/**
 * Full extraction pipeline: Textract/Mammoth → GPT
 * 
 * HYBRID MODE: Tries Python service first for better accuracy,
 * falls back to local TypeScript implementation if Python is unavailable.
 */
export async function extractPOFromS3(
    fileUrl: string
): Promise<ExtractionResult> {
    try {
        // Import Python API client dynamically to avoid issues if not configured
        const {
            isPythonServiceAvailable,
            extractPOWithPython,
            convertPythonPOToTypeScript
        } = await import("./python-api");

        // Try Python service first (better accuracy with pdfplumber/pandas)
        const pythonAvailable = await isPythonServiceAvailable();

        if (pythonAvailable) {
            console.log("[extractPOFromS3] Using Python service for extraction");
            const pythonResult = await extractPOWithPython(fileUrl);

            if (pythonResult.success && pythonResult.data) {
                const converted = convertPythonPOToTypeScript(pythonResult.data);
                return {
                    success: true,
                    data: converted as ExtractedPOData,
                };
            }

            console.warn("[extractPOFromS3] Python extraction failed, falling back to local:", pythonResult.error);
        } else {
            console.log("[extractPOFromS3] Python service unavailable, using local extraction");
        }

        // Fallback: Local TypeScript implementation
        // Parse S3 URL to get bucket and key
        // Expected format: https://bucket.s3.region.amazonaws.com/key
        const urlPattern = /https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/;
        const match = fileUrl.match(urlPattern);

        if (!match) {
            return { success: false, error: "Invalid S3 URL format" };
        }

        const [, bucket, , key] = match;
        const decodedKey = decodeURIComponent(key);
        const extension = decodedKey.split('.').pop()?.toLowerCase();

        let extractedText: string | undefined;

        // Check if it's a Word document
        if (extension === "doc" || extension === "docx") {
            console.log("[extractPOFromS3] Detected Word document, using mammoth");
            const buffer = await getFileBuffer(decodedKey);
            const wordResult = await extractTextFromWord(buffer);
            if (!wordResult.success || !wordResult.text) {
                return { success: false, error: wordResult.error || "No text extracted from Word document" };
            }
            extractedText = wordResult.text;
        } else {
            // Step 1: Extract text with Textract (PDF, images)
            const textractResult = await extractTextWithTextract(bucket, decodedKey);
            if (!textractResult.success || !textractResult.text) {
                return { success: false, error: textractResult.error || "No text extracted" };
            }
            extractedText = textractResult.text;
        }

        // Step 2: Parse with GPT
        const gptResult = await parseWithGPT(extractedText);
        return gptResult;
    } catch (error) {
        console.error("[extractPOFromS3] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Extraction failed",
        };
    }
}

/**
 * Specialized milestone extraction from Excel
 */
export async function extractMilestonesFromExcel(buffer: Buffer): Promise<ExtractedMilestone[]> {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Basic heuristic to find milestone rows
        // Look for rows that have a name/title and a percentage/amount
        const milestones: ExtractedMilestone[] = [];

        // Skip header if it looks like one
        const startIndex = 1;

        for (let i = startIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 2) continue;

            const title = String(row[0] || "").trim();
            let percentage = 0;

            // Try to find a percentage in the row
            for (const cell of row) {
                if (typeof cell === 'number') {
                    if (cell > 0 && cell <= 100) {
                        percentage = cell;
                    } else if (cell > 0 && cell <= 1) {
                        // Handle decimals (0.2 -> 20%)
                        percentage = cell * 100;
                    }
                }
            }

            if (title && percentage > 0) {
                milestones.push({
                    title,
                    paymentPercentage: percentage,
                    description: row[2] ? String(row[2]) : undefined,
                    expectedDate: row[3] ? String(row[3]) : undefined
                });
            }
        }

        return milestones;
    } catch (error) {
        console.error("[Excel Extraction] Error:", error);
        return [];
    }
}

/**
 * Specialized milestone extraction from PDF using GPT
 */
export async function extractMilestonesFromPDF(rawText: string): Promise<ExtractedMilestone[]> {
    try {
        console.log("[PDF Milestone] Starting extraction, text length:", rawText.length);
        console.log("[PDF Milestone] Text preview:", rawText.slice(0, 500));

        if (!rawText || rawText.trim().length < 20) {
            console.warn("[PDF Milestone] Text too short or empty, skipping extraction");
            return [];
        }

        const systemPrompt = `You are a specialist in extracting payment milestones from construction or procurement documents.

CRITICAL RULES:
1. Extract PAYMENT milestones only - these are the actual % of contract value to be paid at each stage
2. The percentages should be INCREMENTAL (per milestone), NOT cumulative progress
3. All payment percentages should SUM TO 100% (or close to it)
4. Do NOT extract progress tracking percentages like "25% complete", "50% complete" etc. - those are progress, not payments
5. Look for payment terms like "35% upon X", "30% at delivery", etc.

Examples of CORRECT extraction:
- "35% payment upon purchase of material" → {title: "Material Purchase", paymentPercentage: 35}
- "35% upon production completion" → {title: "Production", paymentPercentage: 35}
- "30% payment upon delivery" → {title: "Delivery", paymentPercentage: 30}
- Total: 35 + 35 + 30 = 100% ✓

Examples of WRONG extraction (DO NOT do this):
- "25% Production Complete" with paymentPercentage: 25 ← WRONG, this is progress, not payment
- "50% Production Complete" with paymentPercentage: 50 ← WRONG, cumulative progress
- "75% Production Complete" with paymentPercentage: 75 ← WRONG, cumulative progress
- "100% Production Complete" with paymentPercentage: 100 ← WRONG, completion status

Extract only PAYMENT milestones with their payment percentage.
Each milestone should have:
- title: A short descriptive name for the payment milestone
- description: Brief description (optional)
- expectedDate: Date in YYYY-MM-DD format if mentioned (optional)
- paymentPercentage: The payment % for this milestone (must be incremental, not cumulative)

Respond ONLY with valid JSON in this exact format:
{
  "milestones": [
    {"title": "string", "description": "string or null", "expectedDate": "YYYY-MM-DD or null", "paymentPercentage": number}
  ]
}

The sum of all paymentPercentage values should equal or be close to 100%.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Extract ALL payment milestones from this document text. Look for any percentages associated with payments:\n\n${rawText.slice(0, 15000)}` },
            ],
            temperature: 0,
            response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        console.log("[PDF Milestone] GPT response:", content);

        if (!content) {
            console.warn("[PDF Milestone] No response from GPT");
            return [];
        }

        const parsed = JSON.parse(content);
        const milestones = (parsed.milestones || []).map((m: any) => ({
            ...m,
            paymentPercentage: Number(m.paymentPercentage) || 0
        }));

        console.log("[PDF Milestone] Extracted milestones count:", milestones.length);
        return milestones;
    } catch (error) {
        console.error("[PDF Milestone GPT] Error:", error);
        return [];
    }
}

/**
 * Generic entry point for milestone-only extraction (PDF, Excel, or Word)
 * 
 * HYBRID MODE: Tries Python service first for better accuracy,
 * falls back to local TypeScript implementation if Python is unavailable.
 */
export async function extractMilestonesFromS3(fileUrl: string): Promise<{ success: boolean; milestones: ExtractedMilestone[]; error?: string }> {
    try {
        // Try Python service first for PDF files
        const key = extractS3KeyFromUrl(fileUrl);
        console.log("[extractMilestonesFromS3] Processing file:", key);

        if (!key) return { success: false, milestones: [], error: "Invalid S3 URL" };

        const extension = key.split('.').pop()?.toLowerCase();
        console.log("[extractMilestonesFromS3] File extension:", extension);

        // For PDF files, try Python first
        if (extension === 'pdf') {
            try {
                const {
                    isPythonServiceAvailable,
                    extractMilestonesWithPython,
                    convertPythonMilestonesToTypeScript
                } = await import("./python-api");

                const pythonAvailable = await isPythonServiceAvailable();

                if (pythonAvailable) {
                    console.log("[extractMilestonesFromS3] Using Python service for extraction");
                    const pythonResult = await extractMilestonesWithPython(fileUrl);

                    if (pythonResult.success && pythonResult.data?.milestones) {
                        const converted = convertPythonMilestonesToTypeScript(pythonResult.data.milestones);
                        if (converted.length > 0) {
                            return { success: true, milestones: converted };
                        }
                    }
                    console.warn("[extractMilestonesFromS3] Python extraction failed, falling back to local");
                }
            } catch (e) {
                console.warn("[extractMilestonesFromS3] Python import failed, using TypeScript");
            }
        }

        // Excel files - use local TypeScript
        if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
            console.log("[extractMilestonesFromS3] Processing as Excel file");
            const buffer = await getFileBuffer(key);
            const milestones = await extractMilestonesFromExcel(buffer);
            console.log("[extractMilestonesFromS3] Excel milestones extracted:", milestones.length);
            if (milestones.length === 0) {
                return { success: false, milestones: [], error: "No payment milestones found in Excel file" };
            }
            return { success: true, milestones };
        }

        // Word documents
        if (extension === 'doc' || extension === 'docx') {
            console.log("[extractMilestonesFromS3] Processing as Word document");
            const buffer = await getFileBuffer(key);
            const wordResult = await extractTextFromWord(buffer);
            if (!wordResult.success || !wordResult.text) {
                return { success: false, milestones: [], error: wordResult.error || "Failed to extract text from Word document" };
            }
            console.log("[extractMilestonesFromS3] Word text extracted, length:", wordResult.text.length);
            const milestones = await extractMilestonesFromPDF(wordResult.text);
            if (milestones.length === 0) {
                return { success: false, milestones: [], error: "No payment milestones found in document content" };
            }
            return { success: true, milestones };
        }

        // PDF/Image - fallback to Textract + GPT
        console.log("[extractMilestonesFromS3] Processing as PDF/Image with Textract");
        const urlPattern = /https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/;
        const match = fileUrl.match(urlPattern);
        if (!match) return { success: false, milestones: [], error: "Invalid S3 URL format" };

        const [, bucket, , s3Key] = match;
        const decodedKey = decodeURIComponent(s3Key);

        const textractResult = await extractTextWithTextract(bucket, decodedKey);
        console.log("[extractMilestonesFromS3] Textract result:", {
            success: textractResult.success,
            textLength: textractResult.text?.length || 0,
            error: textractResult.error
        });

        if (!textractResult.success || !textractResult.text) {
            return { success: false, milestones: [], error: textractResult.error || "No text extracted from document" };
        }

        const milestones = await extractMilestonesFromPDF(textractResult.text);
        console.log("[extractMilestonesFromS3] Final milestones count:", milestones.length);

        if (milestones.length === 0) {
            return { success: false, milestones: [], error: "No payment milestones found in document content" };
        }

        return { success: true, milestones };
    } catch (error) {
        console.error("[extractMilestonesFromS3] Error:", error);
        return { success: false, milestones: [], error: error instanceof Error ? error.message : "Extraction failed" };
    }
}

// --- INVOICE EXTRACTION ---

export interface ExtractedInvoiceData {
    invoiceNumber: string | null;
    vendorName: string | null;
    date: string | null; // ISO date
    dueDate: string | null;
    totalAmount: number | null;
    currency: string | null;
    lineItems: Array<{
        description: string;
        quantity?: number;
        unitPrice?: number;
        amount: number;
    }>;
    taxAmount?: number;
    subtotal?: number;
    confidence: number;
    rawText?: string;
}

export interface InvoiceExtractionResult {
    success: boolean;
    data?: ExtractedInvoiceData;
    error?: string;
}

/**
 * Parse extracted text using GPT-4 to get structured invoice data
 */
async function parseInvoiceWithGPT(rawText: string): Promise<InvoiceExtractionResult> {
    try {
        const systemPrompt = `You are an expert invoice parser. Extract structured data from the provided invoice text.
Return a JSON object with these fields:
- invoiceNumber: string (invoice/receipt number)
- vendorName: string (supplier/vendor name)
- date: string (invoice date in ISO format YYYY-MM-DD)
- dueDate: string (payment due date in ISO format, if available)
- totalAmount: number (total amount to pay)
- currency: string (3-letter currency code like USD, EUR, KES)
- lineItems: array of { description, quantity, unitPrice, amount }
- taxAmount: number (tax amount if shown)
- subtotal: number (subtotal before tax if shown)

Be precise with numbers. If a field is not found, use null.
Return ONLY valid JSON, no markdown formatting.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Parse this invoice:\n\n${rawText.slice(0, 8000)}` },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            return { success: false, error: "No response from GPT" };
        }

        const parsed = JSON.parse(content);

        // Calculate confidence based on how many fields were extracted
        const fields = ['invoiceNumber', 'vendorName', 'date', 'totalAmount', 'currency'];
        const foundFields = fields.filter(f => parsed[f] !== null && parsed[f] !== undefined);
        const confidence = foundFields.length / fields.length;

        return {
            success: true,
            data: {
                invoiceNumber: parsed.invoiceNumber || null,
                vendorName: parsed.vendorName || null,
                date: parsed.date || null,
                dueDate: parsed.dueDate || null,
                totalAmount: parsed.totalAmount ? Number(parsed.totalAmount) : null,
                currency: parsed.currency || null,
                lineItems: parsed.lineItems || [],
                taxAmount: parsed.taxAmount ? Number(parsed.taxAmount) : undefined,
                subtotal: parsed.subtotal ? Number(parsed.subtotal) : undefined,
                confidence,
                rawText,
            },
        };
    } catch (error) {
        console.error("[parseInvoiceWithGPT] Error:", error);
        return { success: false, error: "Failed to parse invoice with GPT" };
    }
}

/**
 * Full invoice extraction pipeline: Textract/Mammoth → GPT
 * 
 * HYBRID MODE: Tries Python service first for better accuracy,
 * falls back to local TypeScript implementation if Python is unavailable.
 */
export async function extractInvoiceFromS3(
    fileUrl: string
): Promise<InvoiceExtractionResult> {
    try {
        const s3Key = extractS3KeyFromUrl(fileUrl);
        if (!s3Key) {
            return { success: false, error: "Invalid S3 URL" };
        }

        const bucket = process.env.AWS_S3_BUCKET || "infradyn-storage";
        const fileExtension = s3Key.split('.').pop()?.toLowerCase();

        // For PDF files, try Python first
        if (fileExtension === 'pdf') {
            try {
                const {
                    isPythonServiceAvailable,
                    extractInvoiceWithPython,
                    convertPythonInvoiceToTypeScript
                } = await import("./python-api");

                const pythonAvailable = await isPythonServiceAvailable();

                if (pythonAvailable) {
                    console.log("[extractInvoiceFromS3] Using Python service for extraction");
                    const pythonResult = await extractInvoiceWithPython(fileUrl);

                    if (pythonResult.success && pythonResult.data) {
                        const converted = convertPythonInvoiceToTypeScript(pythonResult.data);
                        return { success: true, data: converted as ExtractedInvoiceData };
                    }
                    console.warn("[extractInvoiceFromS3] Python extraction failed, falling back to local");
                }
            } catch (e) {
                console.warn("[extractInvoiceFromS3] Python import failed, using TypeScript");
            }
        }

        // Fallback: Local TypeScript implementation
        let rawText: string | undefined;

        // Handle different file types
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            // Excel - read directly
            const fileBuffer = await getFileBuffer(s3Key);
            if (!fileBuffer) {
                return { success: false, error: "Failed to fetch file from S3" };
            }
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            rawText = XLSX.utils.sheet_to_csv(sheet);
        } else if (fileExtension === 'doc' || fileExtension === 'docx') {
            // Word document
            const fileBuffer = await getFileBuffer(s3Key);
            if (!fileBuffer) {
                return { success: false, error: "Failed to fetch file from S3" };
            }
            const wordResult = await extractTextFromWord(fileBuffer);
            if (!wordResult.success) {
                return { success: false, error: wordResult.error };
            }
            rawText = wordResult.text;
        } else {
            // PDF or image - use Textract
            const textractResult = await extractTextWithTextract(bucket, s3Key);
            if (!textractResult.success) {
                return { success: false, error: textractResult.error };
            }
            rawText = textractResult.text;
        }

        if (!rawText || rawText.trim().length === 0) {
            return { success: false, error: "No text extracted from document" };
        }

        // Parse with GPT
        return await parseInvoiceWithGPT(rawText);
    } catch (error) {
        console.error("[extractInvoiceFromS3] Error:", error);
        return { success: false, error: "Invoice extraction failed" };
    }
}
