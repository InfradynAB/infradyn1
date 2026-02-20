import OpenAI from "openai";
import {
    normalizeDisciplineKey,
    normalizeMaterialClass,
    buildClassificationPromptSection,
} from "@/lib/constants/material-categories";

export type ExtractedBOQItem = {
    itemNumber: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    discipline: string | null;
    materialClass: string | null;
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function pickLikelyBoqLines(rawText: string, maxChars: number): string {
    const lines = rawText.split(/\r?\n/);

    const likely = lines.filter((line) => {
        const t = line.trim();
        if (!t) return false;

        // Keep short numeric-heavy fragments too (Textract often splits table rows
        // into multiple lines/cells).
        if (t.length < 3) return false;

        const hasDigit = /\d/.test(t);
        const hasLetter = /[a-zA-Z]/.test(t);

        // Allow numeric-only lines (e.g. quantities/prices) if they look like part of a table.
        const looksLikeMoneyOrQty =
            /\b\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{1,3})?\b/.test(t) ||
            /\b(m2|m3|m|kg|pcs|ea|ls)\b/i.test(t);

        if (!hasDigit && !hasLetter) return false;
        if (!hasLetter && !looksLikeMoneyOrQty) return false;

        // Skip common noise
        if (/^page\s+\d+/i.test(t)) return false;
        if (/^subtotal\b/i.test(t)) return false;
        if (/^total\b/i.test(t) && t.length < 30) return false;

        return true;
    });

    const joined = likely.join("\n");
    if (joined.length <= maxChars) return joined;

    // Keep the start (headers + early lines) and tail (totals + later rows)
    const head = joined.slice(0, Math.floor(maxChars * 0.7));
    const tail = joined.slice(-Math.floor(maxChars * 0.3));
    return `${head}\n...\n${tail}`;
}

function normalizeItems(items: ExtractedBOQItem[]): ExtractedBOQItem[] {
    const repaired = items.map((item) => {
        const repairedNumeric = repairNumericFields(item);
        const discipline = normalizeDisciplineKey(item.discipline);
        const materialClass = normalizeMaterialClass(discipline, item.materialClass);

        return {
            ...repairedNumeric,
            discipline,
            materialClass: discipline ? materialClass : null,
        };
    });

    return repaired;
}

function isFiniteNumber(n: unknown): n is number {
    return typeof n === "number" && Number.isFinite(n);
}

function nearlyInteger(value: number, tolerance = 0.015): number | null {
    const rounded = Math.round(value);
    if (rounded === 0) return null;
    const diff = Math.abs(value - rounded);
    return diff <= tolerance ? rounded : null;
}

/**
 * Textract often splits table rows and GPT may shift columns.
 * This repairs qty/unitPrice/totalPrice using basic consistency rules.
 */
function repairNumericFields(item: ExtractedBOQItem): ExtractedBOQItem {
    let quantity = isFiniteNumber(item.quantity) ? item.quantity : 0;
    let unitPrice = isFiniteNumber(item.unitPrice) ? item.unitPrice : 0;
    let totalPrice = isFiniteNumber(item.totalPrice) ? item.totalPrice : 0;

    // Helper: try infer quantity from total/unitPrice
    const inferQty = (total: number, price: number) => {
        if (price === 0) return null;
        const ratio = total / price;
        // Accept big quantities typical in BOQs.
        if (!Number.isFinite(ratio) || Math.abs(ratio) > 10_000_000) return null;
        return nearlyInteger(ratio, 0.02);
    };

    // 1) If one of the fields is zero but the other two are positive, infer the missing one.
    if (quantity === 0 && unitPrice > 0 && totalPrice > 0) {
        const inferred = inferQty(totalPrice, unitPrice);
        if (inferred !== null) quantity = inferred;
    }

    if (unitPrice === 0 && quantity > 0 && totalPrice > 0) {
        unitPrice = totalPrice / quantity;
    }

    if (totalPrice === 0 && quantity > 0 && unitPrice > 0) {
        totalPrice = quantity * unitPrice;
    }

    // 2) If the values are inconsistent, try a common column-shift fix:
    // quantity contains unitPrice, unitPrice contains totalPrice.
    if (quantity > 0 && unitPrice > 0 && totalPrice > 0) {
        const expected = quantity * unitPrice;
        const mismatch = Math.abs(expected - totalPrice) / Math.max(1, Math.abs(totalPrice));

        if (mismatch > 0.5) {
            // Try: unitPriceCandidate = quantity, totalCandidate = unitPrice
            const unitPriceCandidate = quantity;
            const totalCandidate = unitPrice;
            const inferred = inferQty(totalCandidate, unitPriceCandidate);

            if (inferred !== null && inferred !== 0) {
                quantity = inferred;
                unitPrice = unitPriceCandidate;
                totalPrice = totalCandidate;
            }
        }
    }

    // 3) Final sanity: if still inconsistent and all present, recompute total.
    if (quantity > 0 && unitPrice > 0) {
        const recomputed = quantity * unitPrice;
        const diff = Math.abs(recomputed - totalPrice);
        if (totalPrice === 0 || diff / Math.max(1, Math.abs(recomputed)) > 0.15) {
            totalPrice = recomputed;
        }
    }

    return {
        ...item,
        quantity,
        unitPrice,
        totalPrice,
    };
}

/**
 * BOQ-only GPT extraction.
 *
 * This is more reliable than the PO prompt for BOQ PDFs (tables / line item sheets).
 * It also forces a best-guess categorization (no nulls) to satisfy downstream UX.
 */
export async function parseBOQWithGPT(rawText: string): Promise<{ success: boolean; items: ExtractedBOQItem[]; error?: string }> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return { success: false, items: [], error: "OPENAI_API_KEY is not configured" };
        }

                const candidateText = pickLikelyBoqLines(rawText, 90_000);

        const systemPrompt = `You extract BOQ line items from text extracted from a BOQ PDF.

The source is usually a table with columns similar to:
Item / Item No | Description | QTY | UoM | Price | Tot price | Comment

Textract may split a single row across multiple lines. You must reconstruct rows.

Return ONLY JSON with this shape:
{
  "items": [
    {
      "itemNumber": "string",
      "description": "string",
      "unit": "string",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "discipline": "GROUNDWORKS|STRUCTURAL|ENVELOPE|ARCHITECTURAL|MEP|EXTERNAL",
      "materialClass": "string"
    }
  ]
}

Extraction rules:
- Extract as many valid line items as are present.
- Skip rows that are headers, subtotals, totals, or blank.
- Skip rows explicitly marked as Optional/Alternative (e.g. itemNumber or description starts with "Optional").
- If unitPrice or totalPrice is missing, compute it using quantity * unitPrice when possible.
- If itemNumber is missing, create a stable sequential one like "1", "2", "3".
- Parse European number formats: commas may be decimals (e.g. "41,26" -> 41.26).
- quantity must be the QTY column, unit must be UoM.

Categorization rules:
- Categorize EVERY item (do not output null).
- Use ONLY these allowed values and pick the closest match even if uncertain:
${buildClassificationPromptSection()}
- Do NOT invent new disciplines or material classes.`;

        const resp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: candidateText },
            ],
        });

        const content = resp.choices[0]?.message?.content;
        if (!content) return { success: false, items: [], error: "No response from GPT" };

        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch {
            return { success: false, items: [], error: "Failed to parse GPT JSON" };
        }

        const parsedObj = (typeof parsed === "object" && parsed !== null) ? (parsed as { items?: unknown }) : null;
        const items = Array.isArray(parsedObj?.items) ? (parsedObj!.items as ExtractedBOQItem[]) : [];

        return { success: true, items: normalizeItems(items) };
    } catch (error: unknown) {
        console.error("[parseBOQWithGPT] Error:", error);
        const message = error instanceof Error ? error.message : "BOQ parsing failed";
        return { success: false, items: [], error: message };
    }
}
