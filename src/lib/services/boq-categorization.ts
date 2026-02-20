import OpenAI from "openai";
import { buildClassificationPromptSection } from "@/lib/constants/material-categories";
import {
    normalizeDisciplineKey,
    normalizeMaterialClass,
} from "@/lib/constants/material-categories";

export type BOQLikeItem = {
    itemNumber?: string;
    description: string;
    unit?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    discipline?: string | null;
    materialClass?: string | null;
};

export type CategorizeBOQOptions = {
    /** When true, attempts to assign discipline + materialClass for every item (no nulls). */
    requireAll?: boolean;
};

function chunk<T>(arr: T[], size: number): T[][] {
    if (size <= 0) return [arr];
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
}

const OPENAI_TIMEOUT_MS = 12_000;

function hasOpenAIKey(): boolean {
    return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
}

function getOpenAIClient(): OpenAI {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function normalizeCategorization<T extends BOQLikeItem>(items: T[]): T[] {
    return items.map((item) => {
        const discipline = normalizeDisciplineKey(item.discipline ?? null);
        const materialClass = normalizeMaterialClass(discipline, item.materialClass ?? null);

        return {
            ...item,
            discipline,
            materialClass: discipline ? materialClass : null,
        };
    });
}

async function safeChatCompletion(
    openai: OpenAI,
    args: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
) {
    try {
        // OpenAI SDK supports a per-request timeout via the second argument.
        return await openai.chat.completions.create(args, { timeout: OPENAI_TIMEOUT_MS });
    } catch (error) {
        console.warn("[categorizeBOQItems] OpenAI call failed; continuing without AI.", error);
        return null;
    }
}

// Minimal non-AI fallback: attempts classification using keyword heuristics.
// This is deliberately conservative and mainly improves the "all blank" case when
// OPENAI_API_KEY is not configured.
function heuristicClassify<T extends BOQLikeItem>(items: T[]): T[] {
    const text = (s: string) => s.toLowerCase();

    const disciplineKeywords: Array<[string, string[]]> = [
        ["MEP", ["hvac", "duct", "chiller", "ahu", "plumbing", "pipe", "valve", "pump", "electrical", "cable", "panel", "db", "mcb", "fire", "sprinkler", "elv", "ict", "bms"]],
        ["STRUCTURAL", ["rebar", "reinforcement", "steel", "beam", "column", "slab", "concrete", "precast", "formwork", "rc"]],
        ["GROUNDWORKS", ["excavation", "piling", "pile", "foundation", "basement", "ground beam", "substructure"]],
        ["ENVELOPE", ["façade", "facade", "cladding", "glazing", "curtain wall", "roof", "roofing", "waterproof", "insulation"]],
        ["ARCHITECTURAL", ["blockwork", "partition", "drywall", "floor", "flooring", "ceiling", "paint", "painting", "joinery", "tile", "finishes", "door"]],
        ["EXTERNAL", ["road", "pavement", "external drainage", "drainage", "utilities", "hard landscaping", "landscaping", "boundary", "kerb", "curb"]],
    ];

    return items.map((item) => {
        const description = text(item.description || "");

        let disciplineGuess: string | null = normalizeDisciplineKey(item.discipline ?? null);
        if (!disciplineGuess) {
            for (const [disc, keys] of disciplineKeywords) {
                if (keys.some((k) => description.includes(k))) {
                    disciplineGuess = disc;
                    break;
                }
            }
        }

        const normalizedDiscipline = normalizeDisciplineKey(disciplineGuess);
        const materialClass = normalizeMaterialClass(normalizedDiscipline, item.materialClass ?? null);

        return {
            ...item,
            discipline: normalizedDiscipline,
            materialClass: normalizedDiscipline ? materialClass : null,
        };
    });
}

/**
 * Categorize BOQ items at extraction/import time.
 *
 * Behavior:
 * - If OpenAI key is configured: uses GPT to classify every row, then normalizes to canonical keys/labels.
 * - If OpenAI key is missing: falls back to heuristic classification + normalization.
 * - Always returns items with discipline/materialClass either canonical values or null when unknown.
 */
export async function categorizeBOQItems<T extends BOQLikeItem>(items: T[]): Promise<T[]> {
    return categorizeBOQItemsWithOptions(items, { requireAll: true });
}

export async function categorizeBOQItemsWithOptions<T extends BOQLikeItem>(
    items: T[],
    options: CategorizeBOQOptions = { requireAll: false },
): Promise<T[]> {
    if (items.length === 0) return items;

    // Always normalize anything already present (manual columns, legacy data).
    const normalizedInput = normalizeCategorization(items);

    if (!hasOpenAIKey()) {
        const heuristics = heuristicClassify(normalizedInput);
        if (!options.requireAll) return heuristics;

        // If requireAll, do a final normalization pass and keep any remaining nulls
        // (we can't conjure a correct mapping without AI).
        return normalizeCategorization(heuristics);
    }

    const openai = getOpenAIClient();

    // Chunk to keep token usage reasonable on large sheets.
    // Bigger chunks reduce round-trips and usually improves overall latency.
    const chunks = chunk(normalizedInput, 100);
    const out: T[] = [];

    for (const group of chunks) {
        const systemPrompt = `You classify BOQ line items into a fixed taxonomy.

For each input item, return an object with:
- discipline: exactly ONE of the allowed discipline keys, or null if unclear
- materialClass: exactly ONE of the allowed material class strings for that discipline, or null if unclear

Allowed taxonomy:
${buildClassificationPromptSection()}

Output JSON only with this shape:
{
  "items": [
    {"discipline": "GROUNDWORKS|STRUCTURAL|ENVELOPE|ARCHITECTURAL|MEP|EXTERNAL|null", "materialClass": "string|null"}
  ]
}

Rules:
- Output array length must match input length, in the same order.
- Do not invent new disciplines or material classes.
- If discipline is null, materialClass must be null.`;

        const userPayload = group.map((it) => ({
            itemNumber: it.itemNumber ?? null,
            description: it.description,
        }));

        const resp = await safeChatCompletion(openai, {
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: JSON.stringify({ items: userPayload }) },
            ],
        });

        const content = resp?.choices[0]?.message?.content;
        if (!content) {
            // Fail open: keep original (normalized) values.
            out.push(...group);
            continue;
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch {
            out.push(...group);
            continue;
        }

        const parsedObj = (typeof parsed === "object" && parsed !== null)
            ? (parsed as { items?: unknown })
            : null;

        const decisions: Array<{ discipline: unknown; materialClass: unknown }> =
            Array.isArray(parsedObj?.items)
                ? (parsedObj!.items as Array<{ discipline: unknown; materialClass: unknown }>)
                : [];

        for (let i = 0; i < group.length; i++) {
            const base = group[i];
            const decision = decisions[i] ?? {};
            const discipline = normalizeDisciplineKey(decision.discipline ?? base.discipline ?? null);
            const materialClass = normalizeMaterialClass(
                discipline,
                decision.materialClass ?? base.materialClass ?? null,
            );

            out.push({
                ...base,
                discipline,
                materialClass: discipline ? materialClass : null,
            });
        }
    }

    // If any items are still missing classification, optionally do a stricter AI pass.
    const missingIdx: number[] = [];
    for (let i = 0; i < out.length; i++) {
        if (!out[i].discipline || !out[i].materialClass) missingIdx.push(i);
    }

    if (!options.requireAll || missingIdx.length === 0) {
        return out;
    }

    // Second pass: force a best-guess (no nulls).
    const missingItems = missingIdx.map((i) => out[i]);
    const forcedChunks = chunk(missingItems, 100);
    const forcedResults: Array<{ discipline: unknown; materialClass: unknown }> = [];

    for (const group of forcedChunks) {
        const systemPrompt = `You must categorize EVERY BOQ item into a fixed taxonomy.

Choose exactly ONE discipline key and ONE material class for each item. Do NOT return null.

Allowed taxonomy:
${buildClassificationPromptSection()}

Output JSON only with this shape:
{
  "items": [
    {"discipline": "GROUNDWORKS|STRUCTURAL|ENVELOPE|ARCHITECTURAL|MEP|EXTERNAL", "materialClass": "string"}
  ]
}

Rules:
- Output array length must match input length, in the same order.
- Use the closest match even if uncertain.
- Do not invent new material classes; pick from the provided lists.`;

        const userPayload = group.map((it) => ({
            itemNumber: it.itemNumber ?? null,
            description: it.description,
        }));

        const resp = await safeChatCompletion(openai, {
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: JSON.stringify({ items: userPayload }) },
            ],
        });

        const content = resp?.choices[0]?.message?.content;
        if (!content) continue;

        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch {
            continue;
        }

        const parsedObj = (typeof parsed === "object" && parsed !== null)
            ? (parsed as { items?: unknown })
            : null;

        const decisions: Array<{ discipline: unknown; materialClass: unknown }> =
            Array.isArray(parsedObj?.items)
                ? (parsedObj!.items as Array<{ discipline: unknown; materialClass: unknown }>)
                : [];

        forcedResults.push(...decisions);
    }

    for (let i = 0; i < missingIdx.length; i++) {
        const idx = missingIdx[i];
        const base = out[idx];
        const decision = forcedResults[i] ?? {};

        const discipline = normalizeDisciplineKey(decision.discipline ?? base.discipline ?? null);
        const materialClass = normalizeMaterialClass(
            discipline,
            decision.materialClass ?? base.materialClass ?? null,
        );

        // If still missing after forced AI pass, fall back to heuristics.
        if (!discipline || !materialClass) {
            const [heuristic] = heuristicClassify([base]);
            out[idx] = heuristic;
            continue;
        }

        out[idx] = {
            ...base,
            discipline,
            materialClass,
        };
    }

    return out;
}
