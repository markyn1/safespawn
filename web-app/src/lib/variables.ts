import type { Block, TextBlock, AITextBlock, ImageBlock, AIImageBlock, VideoBlock, LogoBlock, ShapeBlock } from "@/types/editor";

// ── Matching regex ─────────────────────────────────────────
// Matches @{varname} tokens in any string
export const VAR_REGEX = /@\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

// ── Variable Map ──────────────────────────────────────────
export type VariableMap = Map<string, string>;

/**
 * Extracts the "value" of a block for variable resolution.
 * - Text blocks: content string
 * - Image/Video/Logo blocks: src URL (useful to pass to AI prompts)
 * - Shape blocks: shapeType string
 */
export function getBlockVariableValue(block: Block): string {
    switch (block.type) {
        case "text":
        case "text_ia":
            return (block as TextBlock | AITextBlock).payload.content ?? "";
        case "image":
        case "image_ia":
            return (block as ImageBlock | AIImageBlock).payload.src || "[Imagem]";
        case "logo":
            return (block as LogoBlock).payload.src || "[Logo]";
        case "video":
            return (block as VideoBlock).payload.src || "[Vídeo]";
        case "shape":
            return (block as ShapeBlock).payload.shapeType ?? "";
        case "media_slot":
            return "[Conteúdo Principal]";
        default:
            return "";
    }
}

/**
 * Builds a VariableMap from the current list of blocks.
 * Only blocks with a non-empty variableName are included.
 *
 * Example: { "pagename" => "@minhapagina", "video" => "/uploads/meu-video.mp4" }
 */
export function buildVariableMap(blocks: Block[]): VariableMap {
    const map: VariableMap = new Map();
    for (const block of blocks) {
        if (block.variableName?.trim()) {
            map.set(block.variableName.trim(), getBlockVariableValue(block));
        }
    }
    return map;
}

/**
 * Resolves all @{varname} references in a text string.
 * If the variable is not found, the token is left as-is (e.g. @{missing}).
 */
export function resolveVariables(text: string, vars: VariableMap): string {
    return text.replace(VAR_REGEX, (match, name) => {
        return vars.has(name) ? (vars.get(name) ?? match) : match;
    });
}

/**
 * Extracts all variable names referenced in a text string.
 */
export function extractVariableRefs(text: string): string[] {
    const refs: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(VAR_REGEX.source, "g");
    while ((match = regex.exec(text)) !== null) {
        refs.push(match[1]);
    }
    return Array.from(new Set(refs));
}

/**
 * Returns all variables currently defined in the project as a flat list.
 */
export function getAllVariables(blocks: Block[]): { name: string; value: string; blockId: string }[] {
    return blocks
        .filter(b => !!b.variableName?.trim())
        .map(b => ({
            name: b.variableName!.trim(),
            value: getBlockVariableValue(b),
            blockId: b.id,
        }));
}

// ── Validation ────────────────────────────────────────────

const VALID_VAR_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates a variable name:
 * - Must start with letter or underscore.
 * - Only letters, digits, underscores allowed.
 * - Must be unique within the current block list (excluding own block).
 */
export function validateVariableName(
    name: string,
    currentBlockId: string,
    blocks: Block[]
): ValidationResult {
    if (!name.trim()) return { valid: true }; // empty = no variable, OK

    if (!VALID_VAR_NAME_REGEX.test(name.trim())) {
        return {
            valid: false,
            error: "Apenas letras, números e _. Deve começar com letra ou _.",
        };
    }

    const conflict = blocks.find(
        b => b.variableName?.trim() === name.trim() && b.id !== currentBlockId
    );

    if (conflict) {
        return {
            valid: false,
            error: `"${name}" já está em uso por outro bloco.`,
        };
    }

    return { valid: true };
}
