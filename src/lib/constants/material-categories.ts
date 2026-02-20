/**
 * Material Delivery Categorization — Taxonomy Constants
 *
 * This is the SINGLE SOURCE OF TRUTH for the L1/L2 discipline hierarchy.
 * All classification — AI-assisted and manual — must reference these values.
 *
 * Rules:
 *  - L1 (Discipline) is fixed; never user-defined
 *  - L2 (Material Class) is fixed per discipline; never user-defined
 *  - BOQ items must map to exactly ONE L1 and ONE L2
 */

// ─────────────────────────────────────────────────────────────────────────────
// L1 — DISCIPLINES
// ─────────────────────────────────────────────────────────────────────────────

export const DISCIPLINES = [
    'GROUNDWORKS',
    'STRUCTURAL',
    'ENVELOPE',
    'ARCHITECTURAL',
    'MEP',
    'EXTERNAL',
] as const;

export type Discipline = typeof DISCIPLINES[number];

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
    GROUNDWORKS: 'Groundworks & Substructure',
    STRUCTURAL: 'Structural Works',
    ENVELOPE: 'Envelope',
    ARCHITECTURAL: 'Architectural & Finishing Works',
    MEP: 'MEP Works',
    EXTERNAL: 'External / Site Works',
};

// ─────────────────────────────────────────────────────────────────────────────
// L2 — MATERIAL CLASSES (per Discipline)
// ─────────────────────────────────────────────────────────────────────────────

export const MATERIAL_CLASS_MAP: Record<Discipline, readonly string[]> = {
    GROUNDWORKS: [
        'Excavation',
        'Piling',
        'Foundations',
        'Ground Beams',
        'Basements',
    ],
    STRUCTURAL: [
        'Concrete',
        'Reinforcement',
        'Steel',
        'Columns & Beams',
        'Slabs',
        'Precast',
    ],
    ENVELOPE: [
        'Facades / Cladding',
        'Glazing',
        'Roofing',
        'Waterproofing',
        'Insulation',
    ],
    ARCHITECTURAL: [
        'Blockwork',
        'Partitions',
        'Drywall',
        'Flooring',
        'Ceilings',
        'Painting',
        'Joinery',
    ],
    MEP: [
        'HVAC',
        'Plumbing',
        'Firefighting',
        'Electrical',
        'ELV / ICT',
        'BMS',
    ],
    EXTERNAL: [
        'Roads & Pavements',
        'External Drainage',
        'Utilities',
        'Hard Landscaping',
        'Boundary Works',
    ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** All valid L2 material class strings across every discipline */
export const ALL_MATERIAL_CLASSES: string[] = Object.values(MATERIAL_CLASS_MAP).flat();

/** Check if a string is a valid Discipline key */
export function isDiscipline(value: string | null | undefined): value is Discipline {
    return DISCIPLINES.includes(value as Discipline);
}

/** Get the human-readable label for a discipline key, or the raw key if unknown */
export function getDisciplineLabel(discipline: string | null | undefined): string {
    if (!discipline) return 'Uncategorised';
    if (discipline === 'UNCATEGORISED' || discipline === 'UNCATEGORIZED') return 'Uncategorised';
    return DISCIPLINE_LABELS[discipline as Discipline] ?? discipline;
}

/** Get material classes for a discipline (empty array if invalid discipline) */
export function getMaterialClasses(discipline: string | null | undefined): string[] {
    if (!discipline || !isDiscipline(discipline)) return [];
    return [...MATERIAL_CLASS_MAP[discipline]];
}

/** Validate that a materialClass belongs to the given discipline */
export function isValidMaterialClass(
    discipline: string | null | undefined,
    materialClass: string | null | undefined,
): boolean {
    if (!discipline || !materialClass) return false;
    const classes = MATERIAL_CLASS_MAP[discipline as Discipline];
    return classes?.includes(materialClass) ?? false;
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/&/g, ' and ')
        .replace(/\//g, ' / ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    const prev = new Array<number>(b.length + 1);
    const curr = new Array<number>(b.length + 1);

    for (let j = 0; j <= b.length; j++) prev[j] = j;

    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        const aChar = a.charCodeAt(i - 1);
        for (let j = 1; j <= b.length; j++) {
            const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost,
            );
        }
        for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
    }

    return prev[b.length];
}

/**
 * Best-effort coercion of a stored/AI/user-provided value into a valid Discipline key.
 * Returns null for empty/uncategorised/unknown values.
 */
export function normalizeDisciplineKey(value: unknown): Discipline | null {
    if (typeof value !== 'string') return null;
    const raw = value.trim();
    if (!raw) return null;

    const upper = raw.toUpperCase();
    if (upper === 'UNCATEGORISED' || upper === 'UNCATEGORIZED') return null;
    if (isDiscipline(upper)) return upper;

    const rawNorm = normalizeText(raw);
    for (const discipline of DISCIPLINES) {
        const keyNorm = normalizeText(discipline);
        const labelNorm = normalizeText(DISCIPLINE_LABELS[discipline]);

        if (rawNorm === keyNorm || rawNorm === labelNorm) return discipline;

        // Common case: partial labels like "Groundworks" should map to
        // "Groundworks & Substructure".
        if (labelNorm.startsWith(rawNorm) && rawNorm.length >= 4) return discipline;
    }

    return null;
}

/**
 * Coerces a stored/AI/user-provided materialClass into a valid canonical class string
 * for the given discipline. Returns null when discipline is invalid or no match found.
 */
export function normalizeMaterialClass(
    discipline: unknown,
    materialClass: unknown,
): string | null {
    const normalizedDiscipline = normalizeDisciplineKey(discipline);
    if (!normalizedDiscipline) return null;
    if (typeof materialClass !== 'string') return null;

    const raw = materialClass.trim();
    if (!raw) return null;

    const classes = MATERIAL_CLASS_MAP[normalizedDiscipline];
    if (classes.includes(raw)) return raw;

    const rawNorm = normalizeText(raw);
    const exact = classes.find((mc) => normalizeText(mc) === rawNorm);
    if (exact) return exact;

    // Fuzzy match for truncations/typos (e.g. "Facades / Cladc" → "Facades / Cladding")
    if (rawNorm.length >= 4) {
        const containsMatches = classes.filter((mc) => {
            const mcNorm = normalizeText(mc);
            return mcNorm.includes(rawNorm) || rawNorm.includes(mcNorm);
        });

        if (containsMatches.length === 1) return containsMatches[0];

        const prefixMatches = classes.filter((mc) => {
            const mcNorm = normalizeText(mc);
            return mcNorm.startsWith(rawNorm) || rawNorm.startsWith(mcNorm);
        });
        if (prefixMatches.length === 1) return prefixMatches[0];

        // Edit-distance fallback: pick the single closest match if it's "close enough".
        const scored = classes
            .map((mc) => ({ mc, score: levenshteinDistance(normalizeText(mc), rawNorm) }))
            .sort((a, b) => a.score - b.score);

        const best = scored[0];
        const second = scored[1];

        // Threshold scales slightly with string length; also require separation from runner-up
        // to avoid random matches.
        const threshold = Math.max(2, Math.floor(rawNorm.length * 0.25));
        if (
            best &&
            best.score <= threshold &&
            (!second || second.score - best.score >= 2)
        ) {
            return best.mc;
        }
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GPT PROMPT SNIPPET  (imported by ai-extraction.ts to keep prompts in sync)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the portion of the GPT system prompt that describes how to classify
 * BOQ line items. Import this into parseWithGPT() so the taxonomy stays in one
 * place and any future additions here automatically propagate to the AI.
 */
export function buildClassificationPromptSection(): string {
    const lines: string[] = [
        '- discipline: Classify into exactly ONE of these values (or null if unclear):',
        `    ${DISCIPLINES.join(' | ')}`,
        '- materialClass: The specific material class within that discipline:',
    ];

    for (const [disc, classes] of Object.entries(MATERIAL_CLASS_MAP)) {
        lines.push(`    ${disc.padEnd(14)} → ${(classes as string[]).join(', ')}`);
    }

    lines.push('  If the item is ambiguous, set BOTH discipline and materialClass to null.');
    lines.push('  A project manager will manually classify unresolved items.');

    return lines.join('\n');
}
