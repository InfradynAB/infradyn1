/**
 * Confidence Engine
 * Calculates and manages AI extraction confidence scores
 */

export interface FieldConfidence {
    value: number; // 0-1
    reason?: string;
}

export interface ConfidenceBreakdown {
    overall: number; // 0-1
    fields: Record<string, FieldConfidence>;
    factors: {
        textQuality: number;        // OCR quality
        patternMatch: number;       // How well fields matched expected patterns
        crossValidation: number;    // Internal consistency
        completeness: number;       // % of expected fields found
    };
    requiresReview: boolean;
    reviewReason?: string;
}

// Weights for overall confidence calculation
const CONFIDENCE_WEIGHTS = {
    textQuality: 0.15,
    patternMatch: 0.35,
    crossValidation: 0.25,
    completeness: 0.25,
};

// Thresholds
const REVIEW_THRESHOLD = 0.65;       // Below this triggers review
const HIGH_CONFIDENCE_THRESHOLD = 0.85;

/**
 * Pattern matchers for common field types
 */
const FIELD_PATTERNS: Record<string, RegExp> = {
    poNumber: /^[A-Z]{2,4}[-/]?\d{4,10}$/i,
    date: /^\d{4}-\d{2}-\d{2}$/,
    currency: /^[A-Z]{3}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^\+?[\d\s-()]{7,20}$/,
    percentage: /^\d{1,3}(\.\d{1,2})?%?$/,
    amount: /^[\d,]+(\.\d{2})?$/,
};

/**
 * Calculate confidence for a single extracted field
 */
export function calculateFieldConfidence(
    fieldName: string,
    value: string | number | null | undefined,
    context?: {
        rawText?: string;
        relatedFields?: Record<string, any>;
    }
): FieldConfidence {
    if (value === null || value === undefined || value === "") {
        return { value: 0, reason: "Field not found" };
    }

    const strValue = String(value).trim();
    let confidence = 0.5; // Base confidence
    let reason = "Extracted from text";

    // Check against known patterns
    const pattern = FIELD_PATTERNS[fieldName];
    if (pattern) {
        if (pattern.test(strValue)) {
            confidence += 0.3;
            reason = "Matches expected pattern";
        } else {
            confidence -= 0.1;
            reason = "Does not match expected pattern";
        }
    }

    // String length heuristics
    if (strValue.length > 2 && strValue.length < 500) {
        confidence += 0.1;
    }

    // Check if value appears in raw text (if provided)
    if (context?.rawText) {
        const normalized = strValue.toLowerCase().replace(/\s+/g, " ");
        const textNormalized = context.rawText.toLowerCase().replace(/\s+/g, " ");
        if (textNormalized.includes(normalized)) {
            confidence += 0.1;
            reason += " (verified in source)";
        }
    }

    return {
        value: Math.min(1, Math.max(0, confidence)),
        reason,
    };
}

/**
 * Calculate text quality score based on OCR characteristics
 */
export function calculateTextQuality(rawText: string): number {
    if (!rawText || rawText.length === 0) return 0;

    let score = 0.5;

    // Length check - too short or too long is suspicious
    if (rawText.length > 100 && rawText.length < 50000) {
        score += 0.1;
    }

    // Check for garbled text (random character sequences)
    const garbledPattern = /[^\w\s,.;:'"()-]{3,}/g;
    const garbledMatches = rawText.match(garbledPattern) || [];
    const garbledRatio = garbledMatches.length / (rawText.length / 100);
    if (garbledRatio < 0.5) {
        score += 0.2;
    } else {
        score -= 0.2;
    }

    // Check for common document markers
    const docMarkers = ["purchase order", "invoice", "po number", "total", "date", "vendor", "supplier"];
    const foundMarkers = docMarkers.filter(m => rawText.toLowerCase().includes(m));
    score += (foundMarkers.length / docMarkers.length) * 0.2;

    return Math.min(1, Math.max(0, score));
}

/**
 * Cross-validate extracted fields for consistency
 */
export function crossValidateFields(data: Record<string, any>): number {
    let validations = 0;
    let passed = 0;

    // BOQ items total should match stated total
    if (data.boqItems && Array.isArray(data.boqItems) && data.totalValue) {
        validations++;
        const calculatedTotal = data.boqItems.reduce(
            (sum: number, item: any) => sum + (Number(item.totalPrice) || 0),
            0
        );
        const statedTotal = Number(data.totalValue);
        const tolerance = statedTotal * 0.05; // 5% tolerance
        if (Math.abs(calculatedTotal - statedTotal) <= tolerance) {
            passed++;
        }
    }

    // Milestone percentages should sum to ~100%
    if (data.milestones && Array.isArray(data.milestones)) {
        validations++;
        const totalPercent = data.milestones.reduce(
            (sum: number, m: any) => sum + (Number(m.paymentPercentage) || 0),
            0
        );
        if (totalPercent >= 95 && totalPercent <= 105) {
            passed++;
        }
    }

    // Date should be reasonable (not too far in past/future)
    if (data.date) {
        validations++;
        const date = new Date(data.date);
        const now = new Date();
        const yearsDiff = Math.abs(now.getFullYear() - date.getFullYear());
        if (yearsDiff <= 5) {
            passed++;
        }
    }

    if (validations === 0) return 0.7; // No validations possible, assume moderate confidence
    return passed / validations;
}

/**
 * Calculate completeness score based on expected fields
 */
export function calculateCompleteness(
    data: Record<string, any>,
    requiredFields: string[] = ["poNumber", "vendorName", "totalValue"]
): number {
    const foundFields = requiredFields.filter(f => {
        const value = data[f];
        return value !== null && value !== undefined && value !== "";
    });
    return foundFields.length / requiredFields.length;
}

/**
 * Calculate overall document confidence with full breakdown
 */
export function calculateDocumentConfidence(
    extractedData: Record<string, any>,
    rawText?: string
): ConfidenceBreakdown {
    // Calculate individual factor scores
    const textQuality = rawText ? calculateTextQuality(rawText) : 0.5;
    const crossValidation = crossValidateFields(extractedData);
    const completeness = calculateCompleteness(extractedData);

    // Calculate per-field confidences
    const fieldConfidences: Record<string, FieldConfidence> = {};
    const fieldNames = ["poNumber", "vendorName", "date", "totalValue", "currency", "scope", "paymentTerms"];

    let patternMatchSum = 0;
    let patternMatchCount = 0;

    for (const field of fieldNames) {
        const fc = calculateFieldConfidence(field, extractedData[field], { rawText });
        fieldConfidences[field] = fc;
        if (fc.value > 0) {
            patternMatchSum += fc.value;
            patternMatchCount++;
        }
    }

    const patternMatch = patternMatchCount > 0 ? patternMatchSum / patternMatchCount : 0.5;

    // Calculate weighted overall score
    const overall =
        textQuality * CONFIDENCE_WEIGHTS.textQuality +
        patternMatch * CONFIDENCE_WEIGHTS.patternMatch +
        crossValidation * CONFIDENCE_WEIGHTS.crossValidation +
        completeness * CONFIDENCE_WEIGHTS.completeness;

    // Determine if review is needed
    const requiresReview = overall < REVIEW_THRESHOLD;
    let reviewReason: string | undefined;

    if (requiresReview) {
        if (completeness < 0.5) {
            reviewReason = "Missing critical fields";
        } else if (textQuality < 0.4) {
            reviewReason = "Low OCR quality";
        } else if (patternMatch < 0.5) {
            reviewReason = "Fields don't match expected patterns";
        } else {
            reviewReason = "Overall low confidence";
        }
    }

    return {
        overall,
        fields: fieldConfidences,
        factors: {
            textQuality,
            patternMatch,
            crossValidation,
            completeness,
        },
        requiresReview,
        reviewReason,
    };
}

/**
 * Determine confidence level label
 */
export function getConfidenceLevel(score: number): "HIGH" | "MEDIUM" | "LOW" {
    if (score >= HIGH_CONFIDENCE_THRESHOLD) return "HIGH";
    if (score >= REVIEW_THRESHOLD) return "MEDIUM";
    return "LOW";
}

/**
 * Format confidence score for display
 */
export function formatConfidence(score: number): string {
    return `${Math.round(score * 100)}%`;
}
