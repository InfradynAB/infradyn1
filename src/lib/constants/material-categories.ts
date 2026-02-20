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
