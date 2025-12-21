import {
    TextractClient,
    StartDocumentTextDetectionCommand,
    GetDocumentTextDetectionCommand,
    DetectDocumentTextCommand,
} from "@aws-sdk/client-textract";
import OpenAI from "openai";

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
 * Full extraction pipeline: Textract → GPT
 */
export async function extractPOFromS3(
    fileUrl: string
): Promise<ExtractionResult> {
    try {
        // Parse S3 URL to get bucket and key
        // Expected format: https://bucket.s3.region.amazonaws.com/key
        const urlPattern = /https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/;
        const match = fileUrl.match(urlPattern);

        if (!match) {
            return { success: false, error: "Invalid S3 URL format" };
        }

        const [, bucket, , key] = match;
        const decodedKey = decodeURIComponent(key);

        // Step 1: Extract text with Textract
        const textractResult = await extractTextWithTextract(bucket, decodedKey);
        if (!textractResult.success || !textractResult.text) {
            return { success: false, error: textractResult.error || "No text extracted" };
        }

        // Step 2: Parse with GPT
        const gptResult = await parseWithGPT(textractResult.text);
        return gptResult;
    } catch (error) {
        console.error("[extractPOFromS3] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Extraction failed",
        };
    }
}
