import type { Resolution } from "@/types/settings";
import type { Template, ResolutionRef } from "@/types/editor";
import { TemplateOwner } from "@/types/editor";

function toResolutionRef(r: Resolution): ResolutionRef {
    return {
        id: r.id,
        name: r.name,
        label: r.label,
        width: r.width,
        height: r.height,
    };
}

/**
 * Retorna os templates disponíveis para a resolução atualmente selecionada.
 * Enquanto não houver rota de API, usa mock com 3 templates.
 */
export function getTemplatesForResolution(resolution: Resolution | null): Template[] {
    if (!resolution) return [];

    const ref = toResolutionRef(resolution);
    const { width, height, id: resolution_id } = resolution;
    const now = new Date().toISOString();

    const mockTemplates: Template[] = [
        {
            id: "mock-produto-dark",
            name: "Produto Dark",
            description: "Layout escuro para destaque de produto.",
            thumbnail_url: "", // será preenchido por gradiente no UI
            resolution_id,
            resolution: ref,
            width,
            height,
            background: "#1e3a5f",
            blocks: [],
            owner: TemplateOwner.FeedReady,
            category: ["DESTAQUE"],
            tags: ["produto", "dark"],
            created_at: now,
            created_by: "system",
            version: 1,
        },
        {
            id: "mock-minimal-branco",
            name: "Minimal Branco",
            description: "Layout minimalista em fundo branco.",
            thumbnail_url: "",
            resolution_id,
            resolution: ref,
            width,
            height,
            background: "#ffffff",
            blocks: [],
            owner: TemplateOwner.FeedReady,
            category: ["DESTAQUE"],
            tags: ["minimal", "branco"],
            created_at: now,
            created_by: "system",
            version: 1,
        },
        {
            id: "mock-feed-laranja",
            name: "Feed Laranja",
            description: "Template em destaque para feed.",
            thumbnail_url: "",
            resolution_id,
            resolution: ref,
            width,
            height,
            background: "#ea580c",
            blocks: [],
            owner: TemplateOwner.Community,
            category: ["Comunidade"],
            tags: ["feed", "laranja"],
            created_at: now,
            created_by: "community",
            version: 1,
        },
    ];

    return mockTemplates;
}
