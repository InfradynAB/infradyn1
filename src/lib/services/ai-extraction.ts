import {
    TextractClient,
    StartDocumentTextDetectionCommand,
    GetDocumentTextDetectionCommand,
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
export interface ExtractedPOData {
    poNumber: string | null;
    vendorName: string | null;
    date: string | null;
    totalValue: number | null;
    currency: string | null;
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
 * Extract text from a PDF/Image using AWS Textract (async API for PDF support)
 * Note: For S3 objects, we need the bucket and key
 */
export async function extractTextWithTextract(
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

        // Poll for completion (max 60 seconds)
        let status = "IN_PROGRESS";
        let attempts = 0;
        const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
        let allBlocks: any[] = [];

        while (status === "IN_PROGRESS" && attempts < maxAttempts) {
            await sleep(2000); // Wait 2 seconds between polls
            attempts++;

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
        console.error("[Textract] Error:", error);

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

        const systemPrompt = `You are a document parsing assistant specialized in extracting data from Purchase Order (PO) documents.
        
Extract the following fields from the provided text:
- PO Number (the unique identifier for the purchase order)
- Vendor/Supplier Name (the company providing goods/services)
- Date (the PO date in ISO format YYYY-MM-DD)
- Total Value (the total amount, numeric only)
- Currency (e.g., USD, KES, EUR, GBP)

Respond ONLY with valid JSON in this exact format:
{
  "poNumber": "string or null",
  "vendorName": "string or null", 
  "date": "YYYY-MM-DD or null",
  "totalValue": number or null,
  "currency": "string or null",
  "confidence": 0.0-1.0
}

If a field cannot be found, set it to null. The confidence score (0-1) should reflect how certain you are about the overall extraction quality.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Extract PO data from this document text:\n\n${rawText.slice(0, 8000)}` },
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

        console.log("[GPT] Extraction complete:", {
            poNumber: parsed.poNumber,
            vendor: parsed.vendorName,
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
