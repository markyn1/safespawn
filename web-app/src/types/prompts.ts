// ── Prompt Types ─────────────────────────────────────────

export type PromptCategory = "análise" | "legenda" | "descrição" | "personalizado";

export interface Prompt {
    id: string;
    title: string;
    body: string;
    category: PromptCategory;
    icon?: string;         // emoji icon
    isSystem: boolean;     // true = read-only, provided by platform
    forkedFrom?: string;   // id of the system prompt it was based on
    createdAt: string;     // ISO 8601
}
